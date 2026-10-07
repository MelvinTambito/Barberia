import { Module } from '@nestjs/common';
import { VisagismService } from './visagism.service';
import { VisagismController } from './visagism.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VisagismController],
  providers: [VisagismService],
})
export class VisagismModule {}