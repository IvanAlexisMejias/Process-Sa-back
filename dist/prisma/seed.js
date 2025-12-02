"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new client_1.PrismaClient();
const DEFAULT_PASSWORD = process.env.DEFAULT_USER_PASSWORD ?? 'Process123*';
async function seedRoles() {
    const definitions = [
        {
            key: client_1.RoleKey.ADMIN,
            name: 'Administrador',
            description: 'Gestiona recursos maestros',
            permissions: ['users:manage', 'units:manage', 'reports:view', 'flows:approve'],
        },
        {
            key: client_1.RoleKey.DESIGNER,
            name: 'Diseñador de procesos',
            description: 'Crea flujos tipo y monitorea instancias',
            permissions: ['flows:design', 'flows:execute', 'tasks:monitor'],
        },
        {
            key: client_1.RoleKey.FUNCTIONARY,
            name: 'Funcionario',
            description: 'Ejecuta tareas operativas',
            permissions: ['tasks:update', 'tasks:problem'],
        },
    ];
    const roles = [];
    for (const role of definitions) {
        const stored = await prisma.role.upsert({
            where: { key: role.key },
            update: { name: role.name, description: role.description },
            create: { key: role.key, name: role.name, description: role.description },
        });
        for (const permission of role.permissions) {
            await prisma.rolePermission.upsert({
                where: { roleId_value: { roleId: stored.id, value: permission } },
                update: {},
                create: { roleId: stored.id, value: permission },
            });
        }
        const withPermissions = await prisma.role.findUnique({
            where: { id: stored.id },
            include: { permissions: true },
        });
        if (withPermissions) {
            roles.push(withPermissions);
        }
    }
    return roles.reduce((acc, role) => ({ ...acc, [role.key]: role }), {});
}
async function seedUnits() {
    const names = ['Operaciones', 'Finanzas', 'Tecnología', 'Calidad'];
    const units = [];
    for (const name of names) {
        const unit = await prisma.unit.upsert({
            where: { name },
            update: { name },
            create: { name },
        });
        units.push(unit);
    }
    return units.reduce((acc, unit) => ({ ...acc, [unit.name]: unit }), {});
}
async function seedUsers(roleMap, unitMap) {
    const password = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    const definitions = [
        {
            fullName: 'Gabriela Álvarez',
            email: 'gabriela@processsa.com',
            roleKey: client_1.RoleKey.ADMIN,
            unitName: 'Operaciones',
        },
        {
            fullName: 'Joaquín Ortega',
            email: 'joaquin@processsa.com',
            roleKey: client_1.RoleKey.DESIGNER,
            unitName: 'Tecnología',
        },
        {
            fullName: 'María López',
            email: 'maria@processsa.com',
            roleKey: client_1.RoleKey.FUNCTIONARY,
            unitName: 'Operaciones',
        },
    ];
    const users = [];
    for (const user of definitions) {
        const roleId = roleMap[user.roleKey]?.id;
        const unitId = user.unitName ? unitMap[user.unitName]?.id : undefined;
        const stored = await prisma.user.upsert({
            where: { email: user.email },
            update: {
                fullName: user.fullName,
                roleId,
                unitId,
            },
            create: {
                fullName: user.fullName,
                email: user.email,
                password,
                roleId,
                unitId,
            },
        });
        users.push({ id: stored.id, email: stored.email, roleId: stored.roleId });
    }
    return users;
}
async function seedTemplate(ownerId) {
    const existing = await prisma.flowTemplate.findFirst({
        where: { name: 'Onboarding Cliente' },
        include: { stages: true },
    });
    if (existing)
        return existing;
    const created = await prisma.flowTemplate.create({
        data: {
            name: 'Onboarding Cliente',
            description: 'Flujo base para activar nuevos clientes',
            businessObjective: 'Activar en 10 días',
            typicalDurationDays: 10,
            ownerId,
            stages: {
                create: [
                    {
                        name: 'Descubrimiento',
                        description: 'Levantamiento inicial',
                        expectedDurationDays: 2,
                        exitCriteria: 'Acta aprobada',
                        ownerRole: client_1.RoleKey.DESIGNER,
                    },
                    {
                        name: 'Diseño',
                        description: 'Modelar procesos',
                        expectedDurationDays: 4,
                        exitCriteria: 'Modelos validados',
                        ownerRole: client_1.RoleKey.DESIGNER,
                    },
                    {
                        name: 'Ejecución piloto',
                        description: 'Implementación inicial',
                        expectedDurationDays: 4,
                        exitCriteria: 'Indicadores piloto en rango',
                        ownerRole: client_1.RoleKey.FUNCTIONARY,
                    },
                ],
            },
        },
        include: { stages: true },
    });
    return created;
}
async function seedInstance(template, unitMap, users, roleMap) {
    const existing = await prisma.flowInstance.findFirst({
        where: { name: 'Onboarding Cliente Kora' },
    });
    if (existing)
        return existing;
    const ownerUnitId = unitMap['Operaciones']?.id ?? Object.values(unitMap)[0]?.id;
    return prisma.flowInstance.create({
        data: {
            name: 'Onboarding Cliente Kora',
            templateId: template.id,
            ownerUnitId,
            kickoffDate: new Date(),
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            stageStatuses: {
                create: template.stages.map((stage) => ({
                    stageId: stage.id,
                    ownerId: users.find((user) => user.roleId === roleMap[stage.ownerRole]?.id)?.id ??
                        users[0]?.id,
                })),
            },
        },
    });
}
async function seedTask(instance, template, users) {
    const existing = await prisma.task.findFirst({
        where: { title: 'Configurar tablero global de indicadores' },
    });
    if (existing)
        return existing;
    const ownerId = users.find((user) => user.email === 'joaquin@processsa.com')?.id ?? users[0]?.id;
    const assignerId = users.find((user) => user.email === 'gabriela@processsa.com')?.id ?? users[0]?.id;
    const mainTask = {
        title: 'Configurar tablero global de indicadores',
        description: 'Incluir semáforo y alertas automáticas.',
        priority: client_1.TaskPriority.HIGH,
        ownerId,
        assignerId,
        flowInstanceId: instance.id,
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        tags: {
            create: [{ value: 'tablero' }, { value: 'indicadores' }],
        },
        subTasks: {
            create: [
                {
                    title: 'Entrevistar a legal',
                    assigneeId: ownerId,
                    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
                    status: client_1.TaskStatus.COMPLETED,
                },
                {
                    title: 'Diseñar esquema RACI',
                    assigneeId: ownerId,
                    deadline: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
                    status: client_1.TaskStatus.IN_PROGRESS,
                },
            ],
        },
    };
    const stageTasks = template.stages.map((stage, index) => ({
        title: `Tarea clave - ${stage.name}`,
        description: `Actividad crítica para la etapa ${stage.name}`,
        priority: index === 0 ? client_1.TaskPriority.MEDIUM : client_1.TaskPriority.HIGH,
        ownerId,
        assignerId,
        flowInstanceId: instance.id,
        deadline: new Date(Date.now() + (stage.expectedDurationDays + index + 1) * 24 * 60 * 60 * 1000),
        allowRejection: true,
    }));
    await prisma.task.create({
        data: mainTask,
    });
    if (stageTasks.length) {
        await prisma.task.createMany({
            data: stageTasks,
        });
    }
}
async function main() {
    console.log('🌱 Iniciando seed idempotente...');
    const roleMap = await seedRoles();
    const unitMap = await seedUnits();
    const users = await seedUsers(roleMap, unitMap);
    const designer = users.find((user) => user.email === 'joaquin@processsa.com') ?? users[0];
    const template = await seedTemplate(designer.id);
    const instance = await seedInstance(template, unitMap, users, roleMap);
    await seedTask(instance, template, users);
    console.log('✅ Datos iniciales listos');
}
main()
    .then(async () => {
    await prisma.$disconnect();
})
    .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
});
//# sourceMappingURL=seed.js.map