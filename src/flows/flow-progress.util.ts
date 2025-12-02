import { FlowHealth, TaskStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

export type FlowState = 'no_iniciado' | 'en_progreso' | 'terminada';

interface StageSummary {
  id: string;
  stageId: string;
  progress: number;
  status: TaskStatus;
}

const ACTIVE_STATUSES: TaskStatus[] = [TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED, TaskStatus.RETURNED];

const deriveFlowState = (stageSummaries: StageSummary[], tasks?: { status: TaskStatus }[]): FlowState => {
  const anyActive =
    tasks?.some((task) => ACTIVE_STATUSES.includes(task.status)) ??
    stageSummaries.some((stage) => ACTIVE_STATUSES.includes(stage.status));
  const anyCompleted =
    tasks?.some((task) => task.status === TaskStatus.COMPLETED) ??
    stageSummaries.some((stage) => stage.progress > 0 || stage.status === TaskStatus.COMPLETED);
  const allCompleted =
    (stageSummaries.length > 0 && stageSummaries.every((stage) => stage.status === TaskStatus.COMPLETED || stage.progress === 100)) ||
    (tasks?.length ? tasks.every((task) => task.status === TaskStatus.COMPLETED) : false);

  if (allCompleted) return 'terminada';
  if (!anyActive && !anyCompleted) return 'no_iniciado';
  return 'en_progreso';
};

export const recalcAndPersistFlowProgress = async (prisma: PrismaService, instanceId: string) => {
  const [stageStatuses, tasks] = await Promise.all([
    prisma.flowStageStatus.findMany({
      where: { instanceId },
      include: { stage: true, owner: { select: { id: true, fullName: true } } },
    }),
    prisma.task.findMany({
      where: { flowInstanceId: instanceId },
      select: { status: true, deadline: true, stageStatusId: true },
    }),
  ]);

  if (!stageStatuses.length) {
    const flow = await prisma.flowInstance.update({
      where: { id: instanceId },
      data: { progress: 0, health: FlowHealth.ON_TRACK },
      include: {
        template: { select: { id: true, name: true } },
        ownerUnit: { select: { id: true, name: true } },
        stageStatuses: {
          include: { stage: true, owner: { select: { id: true, fullName: true } } },
        },
      },
    });
    return { flow, state: 'no_iniciado' as FlowState };
  }

  const now = new Date();

  const stageSummaries: StageSummary[] = stageStatuses.map((stageStatus) => {
    const tasksForStage = tasks.filter((task) => task.stageStatusId === stageStatus.id);
    const total = tasksForStage.length;
    const completed = tasksForStage.filter((task) => task.status === TaskStatus.COMPLETED).length;
    const blocked = tasksForStage.some((task) => task.status === TaskStatus.BLOCKED);
    const inProgress = tasksForStage.some((task) => task.status === TaskStatus.IN_PROGRESS);

    const progress = total ? Math.round((completed / total) * 100) : 0;
    let status = stageStatus.status;

    if (!total) status = TaskStatus.PENDING;
    else if (completed === total) status = TaskStatus.COMPLETED;
    else if (blocked) status = TaskStatus.BLOCKED;
    else if (inProgress) status = TaskStatus.IN_PROGRESS;
    else status = TaskStatus.PENDING;

    return { id: stageStatus.id, stageId: stageStatus.stageId, progress, status };
  });

  await Promise.all(
    stageSummaries.map((summary) =>
      prisma.flowStageStatus.update({
        where: { id: summary.id },
        data: { progress: summary.progress, status: summary.status },
      }),
    ),
  );

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.status === TaskStatus.COMPLETED).length;
  const blockedTasks = tasks.some((task) => task.status === TaskStatus.BLOCKED);
  const delayedTasks = tasks.some(
    (task) => task.status !== TaskStatus.COMPLETED && task.deadline && new Date(task.deadline) < now,
  );

  const flowProgress =
    totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : Math.round(stageSummaries.reduce((acc, stage) => acc + stage.progress, 0) / stageSummaries.length);

  const state = deriveFlowState(stageSummaries, tasks);
  const health: FlowHealth = blockedTasks ? FlowHealth.AT_RISK : delayedTasks ? FlowHealth.DELAYED : FlowHealth.ON_TRACK;

  const flow = await prisma.flowInstance.update({
    where: { id: instanceId },
    data: { progress: flowProgress, health },
    include: {
      template: { select: { id: true, name: true } },
      ownerUnit: { select: { id: true, name: true } },
      stageStatuses: {
        include: { stage: true, owner: { select: { id: true, fullName: true } } },
      },
    },
  });

  return { flow, state };
};

export const deriveStateFromStages = (stageStatuses: { progress: number; status: TaskStatus }[]): FlowState => {
  if (!stageStatuses.length) return 'no_iniciado';
  const allCompleted = stageStatuses.every(
    (stage) => stage.status === TaskStatus.COMPLETED || stage.progress === 100,
  );
  const anyActive = stageStatuses.some((stage) => ACTIVE_STATUSES.includes(stage.status));
  const anyCompleted = stageStatuses.some((stage) => stage.progress > 0 || stage.status === TaskStatus.COMPLETED);

  if (allCompleted) return 'terminada';
  if (!anyActive && !anyCompleted) return 'no_iniciado';
  return 'en_progreso';
};
