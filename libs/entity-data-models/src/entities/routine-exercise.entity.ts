import { Entity, PrimaryGeneratedColumn, ManyToOne, Unique } from 'typeorm';
import { RoutineEntity } from './routine.entity';
import { ExerciseEntity } from './exercise.entity';

@Entity()
@Unique(['routine', 'exercise'])
export class RoutineExerciseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /* @ManyToOne(() => RoutineEntity, (routine) => routine.routineExercises)
  routine!: RoutineEntity;

  @ManyToOne(() => ExerciseEntity, (exercise) => exercise.routineExercises)
  exercise!: ExerciseEntity; */
}
