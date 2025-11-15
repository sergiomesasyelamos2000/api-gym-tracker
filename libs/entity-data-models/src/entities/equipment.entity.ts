import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class EquipmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  image?: string;
}
