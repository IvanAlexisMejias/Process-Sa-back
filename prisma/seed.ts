import 'dotenv/config';
import { PrismaClient, RoleKey, TaskPriority, TaskStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction([
    prisma.taskTag.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.flowStageStatus.deleteMany(),
    prisma.flowInstance.deleteMany(),
    prisma.flowStage.deleteMany(),
    prisma.flowTemplate.deleteMany(),
    prisma.taskHistory.deleteMany(),
    prisma.taskProblem.deleteMany(),
    prisma.subTask.deleteMany(),
    prisma.taskDependency.deleteMany(),
    prisma.task.deleteMany(),
    prisma.user.deleteMany(),
    prisma.unit.deleteMany(),
    prisma.rolePermission.deleteMany(),
    prisma.role.deleteMany(),
  ]);

  const roles = await Promise.all(
    [
      {
        key: RoleKey.ADMIN,
        name: 'Administrador',
        description: 'Gestiona recursos maestros',
        permissions: ['users:manage', 'units:manage', 'reports:view', 'flows:approve'],
      },
      {
        key: RoleKey.DESIGNER,
        name: 'Diseñador de procesos',
        description: 'Crea flujos tipo y monitorea instancias',
        permissions: ['flows:design', 'flows:execute', 'tasks:monitor'],
      },
      {
        key: RoleKey.FUNCTIONARY,
        name: 'Funcionario',
        description: 'Ejecuta tareas operativas',
        permissions: ['tasks:update', 'tasks:problem'],
      },
    ].map((role) =>
      prisma.role.create({
        data: {
          key: role.key,
          name: role.name,
          description: role.description,
          permissions: {
            create: role.permissions.map((value) => ({ value })),
          },
        },
      }),
    ),
  );

  const units = await prisma.$transaction(
    ['Operaciones', 'Finanzas', 'Tecnología', 'Calidad'].map((name) =>
      prisma.unit.create({ data: { name } }),
    ),
  );

  const password = await bcrypt.hash('Process123*', 10);

  const users = await Promise.all([
    prisma.user.create({
      data: {
        fullName: 'Gabriela Álvarez',
        email: 'gabriela@processsa.com',
        password,
        roleId: roles.find((r) => r.key === RoleKey.ADMIN)!.id,
        unitId: units.find((u) => u.name === 'Operaciones')!.id,
      },
    }),
    prisma.user.create({
      data: {
        fullName: 'Joaquín Ortega',
        email: 'joaquin@processsa.com',
        password,
        roleId: roles.find((r) => r.key === RoleKey.DESIGNER)!.id,
        unitId: units.find((u) => u.name === 'Tecnología')!.id,
      },
    }),
    prisma.user.create({
      data: {
        fullName: 'María López',
        email: 'maria@processsa.com',
        password,
        roleId: roles.find((r) => r.key === RoleKey.FUNCTIONARY)!.id,
        unitId: units.find((u) => u.name === 'Operaciones')!.id,
      },
    }),
  ]);

  const onboardingTemplate = await prisma.flowTemplate.create({
    data: {
      name: 'Onboarding Cliente',
      description: 'Flujo base para activar nuevos clientes',
      businessObjective: 'Activar en 10 días',
      typicalDurationDays: 10,
      ownerId: users[1].id,
      stages: {
        create: [
          {
            name: 'Descubrimiento',
            description: 'Levantamiento inicial',
            expectedDurationDays: 2,
            exitCriteria: 'Acta aprobada',
            ownerRole: RoleKey.DESIGNER,
          },
          {
            name: 'Diseño',
            description: 'Modelar procesos',
            expectedDurationDays: 4,
            exitCriteria: 'Modelos validados',
            ownerRole: RoleKey.DESIGNER,
          },
          {
            name: 'Ejecución piloto',
            description: 'Implementación inicial',
            expectedDurationDays: 4,
            exitCriteria: 'Indicadores piloto en rango',
            ownerRole: RoleKey.FUNCTIONARY,
          },
        ],
      },
    },
    include: { stages: true },
  });

  const instance = await prisma.flowInstance.create({
    data: {
      name: 'Onboarding Cliente Kora',
      templateId: onboardingTemplate.id,
      ownerUnitId: units.find((u) => u.name === 'Operaciones')!.id,
      kickoffDate: new Date(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      stageStatuses: {
        create: onboardingTemplate.stages.map((stage) => ({
          stageId: stage.id,
          ownerId:
            users.find((user) => user.roleId === roles.find((r) => r.key === stage.ownerRole)!.id)?.id ||
            users[0].id,
        })),
      },
    },
  });

  await prisma.task.create({
    data: {
      title: 'Configurar tablero global de indicadores',
      description: 'Incluir semáforo y alertas automáticas.',
      priority: TaskPriority.HIGH,
      ownerId: users[1].id,
      assignerId: users[0].id,
      flowInstanceId: instance.id,
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      tags: {
        create: [{ value: 'tablero' }, { value: 'indicadores' }],
      },
      subTasks: {
        create: [
          {
            title: 'Entrevistar a legal',
            assigneeId: users[1].id,
            deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            status: TaskStatus.COMPLETED,
          },
          {
            title: 'Diseñar esquema RACI',
            assigneeId: users[1].id,
            deadline: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
            status: TaskStatus.IN_PROGRESS,
          },
        ],
      },
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('🌱 Datos iniciales cargados');
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
