import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VisagismService } from './visagism.service';
import { ApiConsumes, ApiBody, ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Visagism')
@Controller('visagism')
export class VisagismController {
  constructor(private readonly visagismService: VisagismService) {}

  @Post('analyze')
  @ApiOperation({ summary: 'Analizar rostro del cliente y guardar recomendación' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', example: 'uuid-del-usuario' },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async analyze(
    @Body('userId') userId: string,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('Se requiere una imagen para el análisis');
    }
    if (!userId) {
      throw new BadRequestException('El ID de usuario es requerido');
    }

    return this.visagismService.analyzeFace(userId, file);
  }
}