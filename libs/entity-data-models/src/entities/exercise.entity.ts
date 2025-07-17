import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';

import { RoutineExerciseEntity } from './index';

@Entity()
export class ExerciseEntity {
  @PrimaryColumn()
  id!: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  imageUrl?: string;

  @Column({ nullable: true })
  giftUrl?: string;

  @Column('simple-array')
  equipments: string[];

  @Column('simple-array')
  bodyParts: string[];

  @Column('simple-array')
  targetMuscles: string[];

  @Column('simple-array', { nullable: true })
  secondaryMuscles?: string[];

  @Column('simple-array')
  instructions: string[];

  @OneToMany(
    () => RoutineExerciseEntity,
    (routineExercise) => routineExercise.exercise,
  )
  routineExercises!: RoutineExerciseEntity[];
}
