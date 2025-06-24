import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('sets')
export class SetEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({
    example: 0,
    description: 'Índice que indica el orden del set en la rutina',
  })
  @Column()
  order!: number;

  @ApiProperty({
    description: 'Tipo de set, podría ser “warmup”, “working”, etc.',
  })
  @Column()
  type!: string;

  @ApiProperty({
    example: 100,
    nullable: true,
    description: 'Peso levantado en kilogramos (si aplica)',
  })
  @Column({ type: 'float', nullable: true })
  weight_kg?: number;

  @ApiProperty({
    example: 10,
    nullable: true,
    description: 'Número de repeticiones registradas en el set',
  })
  @Column({ type: 'int', nullable: true })
  reps?: number;

  @ApiProperty({
    example: null,
    nullable: true,
    description: 'Distancia en metros (si aplica)',
  })
  @Column({ type: 'float', nullable: true })
  distance_meters?: number;

  @ApiProperty({
    example: null,
    nullable: true,
    description: 'Duración en segundos (si aplica)',
  })
  @Column({ type: 'int', nullable: true })
  duration_seconds?: number;

  @ApiProperty({
    example: 9.5,
    nullable: true,
    description: 'RPE (esfuerzo percibido) registrado en el set',
  })
  @Column({ type: 'float', nullable: true })
  rpe?: number;

  @ApiProperty({
    example: 50,
    nullable: true,
    description:
      'Métrica personalizada, por ejemplo pisos o pasos en máquina de escaleras',
  })
  @Column({ type: 'int', nullable: true })
  custom_metric?: number;
}
