import { UserEntity } from '@app/entity-data-models';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
  ) {}

  async findByEmail(email: string): Promise<UserEntity | undefined> {
    const user = await this.usersRepository.findOne({ where: { email } });
    return user ?? undefined;
  }

  async findByGoogleId(googleId: string): Promise<UserEntity | undefined> {
    const user = await this.usersRepository.findOne({ where: { googleId } });
    return user ?? undefined;
  }

  async findById(id: string): Promise<UserEntity | undefined> {
    const user = await this.usersRepository.findOne({ where: { id } });
    return user ?? undefined;
  }

  async createFromGoogle(googleProfile: any): Promise<UserEntity> {
    const user = this.usersRepository.create({
      email: googleProfile.email,
      googleId: googleProfile.sub || googleProfile.id,
      firstName: googleProfile.given_name,
      lastName: googleProfile.family_name,
      picture: googleProfile.picture,
    });

    return this.usersRepository.save(user);
  }

  async updateUser(
    id: string,
    updateData: Partial<UserEntity>,
  ): Promise<UserEntity> {
    await this.usersRepository.update(id, updateData);
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User not found: ${id}`);
    }
    return user;
  }
}
