import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '@app/entity-data-models';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
  ) {}

  async create(userData: {
    email: string;
    password?: string;
    name: string;
    googleId?: string;
    appleId?: string;
    provider?: 'local' | 'google' | 'apple';
    profilePicture?: string;
  }): Promise<UserEntity> {
    // Verificar si el email ya existe
    const existingUser = await this.findByEmail(userData.email);
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    // Hash de la contraseña si es autenticación local
    if (userData.password) {
      const salt = await bcrypt.genSalt(10);
      userData.password = await bcrypt.hash(userData.password, salt);
    }

    const user = this.userRepository.create(userData);
    return await this.userRepository.save(user);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return await this.userRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<UserEntity | null> {
    return await this.userRepository.findOne({ where: { id } });
  }

  async findByGoogleId(googleId: string): Promise<UserEntity | null> {
    return await this.userRepository.findOne({ where: { googleId } });
  }

  async findByAppleId(appleId: string): Promise<UserEntity | null> {
    return await this.userRepository.findOne({ where: { appleId } });
  }

  async update(id: string, updateData: Partial<UserEntity>): Promise<UserEntity> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Si se actualiza la contraseña, hashearla
    if (updateData.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(updateData.password, salt);
    }

    Object.assign(user, updateData);
    return await this.userRepository.save(user);
  }

  async validatePassword(email: string, password: string): Promise<UserEntity | null> {
    const user = await this.findByEmail(email);
    if (!user || !user.password) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async findOrCreateOAuthUser(
    provider: 'google' | 'apple',
    profile: {
      providerId: string;
      email: string;
      name: string;
      profilePicture?: string;
    },
  ): Promise<UserEntity> {
    let user: UserEntity | null = null;

    // Buscar por ID del proveedor
    if (provider === 'google') {
      user = await this.findByGoogleId(profile.providerId);
    } else if (provider === 'apple') {
      user = await this.findByAppleId(profile.providerId);
    }

    // Si no se encuentra, buscar por email (puede que ya exista con otro proveedor)
    if (!user) {
      user = await this.findByEmail(profile.email);

      // Si existe con otro proveedor, actualizar para agregar el nuevo provider ID
      if (user) {
        const updateData: Partial<UserEntity> = {};
        if (provider === 'google' && !user.googleId) {
          updateData.googleId = profile.providerId;
        } else if (provider === 'apple' && !user.appleId) {
          updateData.appleId = profile.providerId;
        }

        if (Object.keys(updateData).length > 0) {
          user = await this.update(user.id, updateData);
        }
        return user;
      }
    }

    // Si no existe, crear nuevo usuario
    if (!user) {
      const userData: any = {
        email: profile.email,
        name: profile.name,
        provider,
        profilePicture: profile.profilePicture,
      };

      if (provider === 'google') {
        userData.googleId = profile.providerId;
      } else if (provider === 'apple') {
        userData.appleId = profile.providerId;
      }

      user = await this.create(userData);
    }

    return user;
  }
}
