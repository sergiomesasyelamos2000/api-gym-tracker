import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RoutineEntity } from './routine.entity';
import { UserNutritionProfileEntity } from './user-nutrition-profile.entity';

export type AuthProvider = 'local' | 'google' | 'apple';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ nullable: true })
  password?: string; // Hash bcrypt, nullable para usuarios OAuth

  @Column()
  name!: string;

  @Column({ nullable: true, unique: true })
  googleId?: string; // ID de Google para OAuth

  @Column({ nullable: true, unique: true })
  appleId?: string; // ID de Apple para OAuth

  @Column({ type: 'enum', enum: ['local', 'google', 'apple'], default: 'local' })
  provider!: AuthProvider;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ nullable: true })
  profilePicture?: string; // URL de la foto de perfil

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relaciones
  @OneToMany(() => RoutineEntity, routine => routine.user)
  routines!: RoutineEntity[];

  @OneToMany(() => UserNutritionProfileEntity, profile => profile.user)
  nutritionProfiles!: UserNutritionProfileEntity[];
}
