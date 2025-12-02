"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateUnitDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_unit_dto_1 = require("./create-unit.dto");
class UpdateUnitDto extends (0, mapped_types_1.PartialType)(create_unit_dto_1.CreateUnitDto) {
}
exports.UpdateUnitDto = UpdateUnitDto;
//# sourceMappingURL=update-unit.dto.js.map