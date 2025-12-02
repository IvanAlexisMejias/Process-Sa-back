"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateFlowTemplateDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_flow_template_dto_1 = require("./create-flow-template.dto");
class UpdateFlowTemplateDto extends (0, mapped_types_1.PartialType)(create_flow_template_dto_1.CreateFlowTemplateDto) {
}
exports.UpdateFlowTemplateDto = UpdateFlowTemplateDto;
//# sourceMappingURL=update-flow-template.dto.js.map