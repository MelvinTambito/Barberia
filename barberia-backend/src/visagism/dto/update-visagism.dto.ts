import { PartialType } from '@nestjs/swagger';
import { CreateVisagismDto } from './create-visagism.dto';

export class UpdateVisagismDto extends PartialType(CreateVisagismDto) {}
