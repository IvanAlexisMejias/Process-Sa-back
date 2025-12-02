"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveStateFromStages = exports.recalcAndPersistFlowProgress = void 0;
const client_1 = require("@prisma/client");
const ACTIVE_STATUSES = [client_1.TaskStatus.IN_PROGRESS, client_1.TaskStatus.BLOCKED, client_1.TaskStatus.RETURNED];
const deriveFlowState = (stageSummaries, tasks) => {
    const anyActive = tasks?.some((task) => ACTIVE_STATUSES.includes(task.status)) ??
        stageSummaries.some((stage) => ACTIVE_STATUSES.includes(stage.status));
    const anyCompleted = tasks?.some((task) => task.status === client_1.TaskStatus.COMPLETED) ??
        stageSummaries.some((stage) => stage.progress > 0 || stage.status === client_1.TaskStatus.COMPLETED);
    const allCompleted = (stageSummaries.length > 0 && stageSummaries.every((stage) => stage.status === client_1.TaskStatus.COMPLETED || stage.progress === 100)) ||
        (tasks?.length ? tasks.every((task) => task.status === client_1.TaskStatus.COMPLETED) : false);
    if (allCompleted)
        return 'terminada';
    if (!anyActive && !anyCompleted)
        return 'no_iniciado';
    return 'en_progreso';
};
const recalcAndPersistFlowProgress = async (prisma, instanceId) => {
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
            data: { progress: 0, health: client_1.FlowHealth.ON_TRACK },
            include: {
                template: { select: { id: true, name: true } },
                ownerUnit: { select: { id: true, name: true } },
                stageStatuses: {
                    include: { stage: true, owner: { select: { id: true, fullName: true } } },
                },
            },
        });
        return { flow, state: 'no_iniciado' };
    }
    const now = new Date();
    const stageSummaries = stageStatuses.map((stageStatus) => {
        const tasksForStage = tasks.filter((task) => task.stageStatusId === stageStatus.id);
        const total = tasksForStage.length;
        const completed = tasksForStage.filter((task) => task.status === client_1.TaskStatus.COMPLETED).length;
        const blocked = tasksForStage.some((task) => task.status === client_1.TaskStatus.BLOCKED);
        const inProgress = tasksForStage.some((task) => task.status === client_1.TaskStatus.IN_PROGRESS);
        const progress = total ? Math.round((completed / total) * 100) : 0;
        let status = stageStatus.status;
        if (!total)
            status = client_1.TaskStatus.PENDING;
        else if (completed === total)
            status = client_1.TaskStatus.COMPLETED;
        else if (blocked)
            status = client_1.TaskStatus.BLOCKED;
        else if (inProgress)
            status = client_1.TaskStatus.IN_PROGRESS;
        else
            status = client_1.TaskStatus.PENDING;
        return { id: stageStatus.id, stageId: stageStatus.stageId, progress, status };
    });
    await Promise.all(stageSummaries.map((summary) => prisma.flowStageStatus.update({
        where: { id: summary.id },
        data: { progress: summary.progress, status: summary.status },
    })));
    const totalTasks = tasks.length;
    const blockedTasks = tasks.some((task) => task.status === client_1.TaskStatus.BLOCKED);
    const delayedTasks = tasks.some((task) => task.status !== client_1.TaskStatus.COMPLETED && task.deadline && new Date(task.deadline) < now);
    const stageProgressAvg = stageSummaries.length > 0
        ? stageSummaries.reduce((acc, stage) => acc + stage.progress, 0) / stageSummaries.length
        : 0;
    const flowProgress = Math.round(stageProgressAvg);
    const state = deriveFlowState(stageSummaries, tasks);
    const health = blockedTasks ? client_1.FlowHealth.AT_RISK : delayedTasks ? client_1.FlowHealth.DELAYED : client_1.FlowHealth.ON_TRACK;
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
exports.recalcAndPersistFlowProgress = recalcAndPersistFlowProgress;
const deriveStateFromStages = (stageStatuses) => {
    if (!stageStatuses.length)
        return 'no_iniciado';
    const allCompleted = stageStatuses.every((stage) => stage.status === client_1.TaskStatus.COMPLETED || stage.progress === 100);
    const anyActive = stageStatuses.some((stage) => ACTIVE_STATUSES.includes(stage.status));
    const anyCompleted = stageStatuses.some((stage) => stage.progress > 0 || stage.status === client_1.TaskStatus.COMPLETED);
    if (allCompleted)
        return 'terminada';
    if (!anyActive && !anyCompleted)
        return 'no_iniciado';
    return 'en_progreso';
};
exports.deriveStateFromStages = deriveStateFromStages;
//# sourceMappingURL=flow-progress.util.js.map