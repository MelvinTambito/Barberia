import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  Matches,
  IsArray,
  ArrayUnique,
  IsIn,
} from 'class-validator';
import { AppointmentStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class AnalyzeFaceDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  previousAnalysisId?: number;
}

export class PersonDto {
  @IsString() @IsNotEmpty() @MaxLength(100) name: string;
  @IsEmail() email: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional()
  @IsString()
  @MaxLength(90000)
  @Matches(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/)
  profilePhoto?: string | null;
}
export class AdminDto {
  @IsEmail() email: string;
  @IsString() @IsNotEmpty() @MaxLength(100) name: string;
  @IsArray() @ArrayUnique()
  @IsIn(['CLIENTS', 'BARBERS', 'SERVICES', 'APPOINTMENTS', 'LOYALTY'], { each: true })
  permissions: string[];
}
export class ServiceDto {
  @IsString() @IsNotEmpty() @MaxLength(100) name: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) price: number;
  @IsInt() @Min(5) @Max(480) durationMinutes: number;
  @IsOptional() @IsInt() @Min(1) requiredPoints?: number | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class StatusDto {
  @IsEnum(AppointmentStatus) status: AppointmentStatus;
}
export class MessageDto {
  @IsString() @IsNotEmpty() @MaxLength(2000) message: string;
}
