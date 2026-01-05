import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum EstadoReserva {
  PENDIENTE = 'pendiente',
  CONFIRMADA = 'confirmada',
  CANCELADA = 'cancelada',
  COMPLETADA = 'completada',
}

@Entity('reservas')
export class Reserva {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'cliente_id', type: 'int' })
  clienteId: number;

  @Column({ name: 'servicio_nombre', type: 'varchar', length: 200 })
  servicioNombre: string;

  @Column({ name: 'fecha_reserva', type: 'datetime' })
  fechaReserva: Date;

  @Column({ name: 'duracion_minutos', type: 'int', default: 60 })
  duracionMinutos: number;

  @Column({ type: 'text', nullable: true })
  notas: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: EstadoReserva.PENDIENTE,
  })
  estado: EstadoReserva;

  @Column({ name: 'idempotencia_key', type: 'varchar', length: 36, unique: true })
  idempotenciaKey: string;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'datetime' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion', type: 'datetime' })
  fechaActualizacion: Date;

  @Column({ name: 'fecha_cancelacion', type: 'datetime', nullable: true })
  fechaCancelacion: Date;
}
