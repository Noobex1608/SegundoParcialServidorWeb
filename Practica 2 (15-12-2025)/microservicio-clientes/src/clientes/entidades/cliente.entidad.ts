import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('clientes')
export class Cliente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 200 })
  nombre: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telefono: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion' })
  fechaActualizacion: Date;

  @Column({ name: 'fecha_eliminacion', type: 'timestamp', nullable: true })
  fechaEliminacion: Date;
}
