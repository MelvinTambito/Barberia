import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VisagismService } from './visagism.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
@ApiTags('Visagism')
@ApiBearerAuth()
@Controller('visagism')
@UseGuards(JwtAuthGuard)
export class VisagismController {
  constructor(private readonly service: VisagismService) {}
  @Post('analyze')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) =>
        cb(
          /^(image\/jpeg|image\/png|image\/webp)$/.test(file.mimetype)
            ? null
            : new BadRequestException('Usa una imagen JPG, PNG o WebP'),
          true,
        ),
    }),
  )
  analyze(@UploadedFile() file: any, @CurrentUser() user: any) {
    if (!file) throw new BadRequestException('Selecciona una imagen');
    return this.service.analyzeFace(user.id, file);
  }
}
