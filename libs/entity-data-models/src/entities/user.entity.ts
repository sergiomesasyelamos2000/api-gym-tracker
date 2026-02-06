import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  password?: string; // Nullable porque usuarios OAuth no tienen password

  @Column({ nullable: true })
  picture?: string;

  @Column({ nullable: true })
  @Index()
  googleId?: string;

  @Column({ nullable: true })
  @Index()
  appleId?: string;

  @Column({ nullable: true })
  refreshToken?: string; // Para almacenar el refresh token

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
