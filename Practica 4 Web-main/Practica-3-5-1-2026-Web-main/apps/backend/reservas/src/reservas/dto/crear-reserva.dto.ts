import { IsInt, IsString, IsDateString, IsOptional, Min, MaxLength, MinLength } from 'class-validator';

export class CrearReservaDto {
  @IsInt({ message: 'El ID del cliente debe ser un número entero' })
  @Min(1, { message: 'El ID del cliente debe ser mayor a 0' })
  clienteId: number;

  @IsString({ message: 'El nombre del servicio debe ser una cadena de texto' })
  @MinLength(3, { message: 'El nombre del servicio debe tener al menos 3 caracteres' })
  @MaxLength(200, { message: 'El nombre del servicio no puede exceder 200 caracteres' })
  servicioNombre: string;

  @IsDateString({}, { message: 'La fecha de reserva debe ser una fecha válida en formato ISO' })
  fechaReserva: string;

  @IsOptional()
  @IsInt({ message: 'La duración debe ser un número entero' })
  @Min(15, { message: 'La duración mínima es de 15 minutos' })
  duracionMinutos?: number;

  @IsOptional()
  @IsString({ message: 'Las notas deben ser una cadena de texto' })
  @MaxLength(500, { message: 'Las notas no pueden exceder 500 caracteres' })
  notas?: string;
}
