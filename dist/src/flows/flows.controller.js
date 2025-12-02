"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlowsController = void 0;
const common_1 = require("@nestjs/common");
const flows_service_1 = require("./flows.service");
const create_flow_template_dto_1 = require("./dto/create-flow-template.dto");
const create_flow_instance_dto_1 = require("./dto/create-flow-instance.dto");
const update_stage_status_dto_1 = require("./dto/update-stage-status.dto");
const update_flow_template_dto_1 = require("./dto/update-flow-template.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
let FlowsController = class FlowsController {
    flowsService;
    constructor(flowsService) {
        this.flowsService = flowsService;
    }
    createTemplate(dto) {
        return this.flowsService.createTemplate(dto);
    }
    listTemplates() {
        return this.flowsService.listTemplates();
    }
    updateTemplate(id, dto) {
        return this.flowsService.updateTemplate(id, dto);
    }
    deleteTemplate(id) {
        return this.flowsService.deleteTemplate(id);
    }
    createInstance(dto) {
        return this.flowsService.createInstance(dto);
    }
    listInstances() {
        return this.flowsService.listInstances();
    }
    deleteInstance(id) {
        return this.flowsService.deleteInstance(id);
    }
    updateStage(instanceId, stageId, dto) {
        return this.flowsService.updateStageStatus(instanceId, stageId, dto);
    }
    dashboard() {
        return this.flowsService.dashboard();
    }
};
exports.FlowsController = FlowsController;
__decorate([
    (0, roles_decorator_1.Roles)('DESIGNER', 'ADMIN'),
    (0, common_1.Post)('templates'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_flow_template_dto_1.CreateFlowTemplateDto]),
    __metadata("design:returntype", void 0)
], FlowsController.prototype, "createTemplate", null);
__decorate([
    (0, common_1.Get)('templates'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], FlowsController.prototype, "listTemplates", null);
__decorate([
    (0, roles_decorator_1.Roles)('DESIGNER', 'ADMIN'),
    (0, common_1.Patch)('templates/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_flow_template_dto_1.UpdateFlowTemplateDto]),
    __metadata("design:returntype", void 0)
], FlowsController.prototype, "updateTemplate", null);
__decorate([
    (0, roles_decorator_1.Roles)('DESIGNER', 'ADMIN'),
    (0, common_1.Delete)('templates/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FlowsController.prototype, "deleteTemplate", null);
__decorate([
    (0, roles_decorator_1.Roles)('DESIGNER', 'ADMIN'),
    (0, common_1.Post)('instances'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_flow_instance_dto_1.CreateFlowInstanceDto]),
    __metadata("design:returntype", void 0)
], FlowsController.prototype, "createInstance", null);
__decorate([
    (0, common_1.Get)('instances'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], FlowsController.prototype, "listInstances", null);
__decorate([
    (0, roles_decorator_1.Roles)('DESIGNER', 'ADMIN'),
    (0, common_1.Delete)('instances/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FlowsController.prototype, "deleteInstance", null);
__decorate([
    (0, roles_decorator_1.Roles)('DESIGNER', 'ADMIN'),
    (0, common_1.Patch)('instances/:instanceId/stages/:stageId'),
    __param(0, (0, common_1.Param)('instanceId')),
    __param(1, (0, common_1.Param)('stageId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_stage_status_dto_1.UpdateStageStatusDto]),
    __metadata("design:returntype", void 0)
], FlowsController.prototype, "updateStage", null);
__decorate([
    (0, common_1.Get)('dashboard'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], FlowsController.prototype, "dashboard", null);
exports.FlowsController = FlowsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('flows'),
    __metadata("design:paramtypes", [flows_service_1.FlowsService])
], FlowsController);
//# sourceMappingURL=flows.controller.js.map