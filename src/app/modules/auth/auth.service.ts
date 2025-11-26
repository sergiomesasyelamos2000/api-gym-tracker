import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  UserEntity,
  LoginRequestDto,
  RegisterRequestDto,
  GoogleAuthRequestDto,
  RefreshTokenRequestDto,
  UpdateUserProfileDto,
  UserResponseDto,
  AuthTokensDto,
  AuthResponseDto,
} from '@app/entity-data-models';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
  ) {}

  // ==================== LOGIN ====================

  async login(credentials: LoginRequestDto): Promise<AuthResponseDto> {
    const { email, password } = credentials;

    // Find user by email
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Save refresh token
    user.refreshToken = tokens.refreshToken;
    await this.userRepository.save(user);

    return {
      user: this.mapUserToDto(user),
      tokens,
    };
  }

  // ==================== REGISTER ====================

  async register(userData: RegisterRequestDto): Promise<AuthResponseDto> {
    const { email, password, name } = userData;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = this.userRepository.create({
      email,
      password: hashedPassword,
      name,
    });

    const savedUser = await this.userRepository.save(newUser);

    // Generate tokens
    const tokens = await this.generateTokens(savedUser);

    // Save refresh token
    savedUser.refreshToken = tokens.refreshToken;
    await this.userRepository.save(savedUser);

    return {
      user: this.mapUserToDto(savedUser),
      tokens,
    };
  }

  // ==================== GOOGLE AUTH ====================

  async googleAuth(googleData: GoogleAuthRequestDto): Promise<AuthResponseDto> {
    const { userInfo } = googleData;

    // Try to find existing user by Google ID or email
    let user = await this.userRepository.findOne({
      where: [{ googleId: userInfo.id }, { email: userInfo.email }],
    });

    if (user) {
      // Update Google ID if not set
      if (!user.googleId) {
        user.googleId = userInfo.id;
      }

      // Update profile picture if provided
      if (userInfo.picture && !user.picture) {
        user.picture = userInfo.picture;
      }
    } else {
      // Create new user
      user = this.userRepository.create({
        email: userInfo.email,
        name: userInfo.name,
        googleId: userInfo.id,
        picture: userInfo.picture,
      });
    }

    const savedUser = await this.userRepository.save(user);

    // Generate tokens
    const tokens = await this.generateTokens(savedUser);

    // Save refresh token
    savedUser.refreshToken = tokens.refreshToken;
    await this.userRepository.save(savedUser);

    return {
      user: this.mapUserToDto(savedUser),
      tokens,
    };
  }

  // ==================== LOGOUT ====================

  async logout(userId: string): Promise<void> {
    // Remove refresh token from database
    await this.userRepository.update(userId, { refreshToken: undefined });
  }

  // ==================== REFRESH TOKEN ====================

  async refreshToken(dto: RefreshTokenRequestDto): Promise<AuthResponseDto> {
    const { refreshToken } = dto;

    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken);

      // Find user
      const user = await this.userRepository.findOne({
        where: {
          id: payload.sub,
          refreshToken: refreshToken,
        },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      // Update refresh token in database
      user.refreshToken = tokens.refreshToken;
      await this.userRepository.save(user);

      return {
        user: this.mapUserToDto(user),
        tokens,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  // ==================== GET CURRENT USER ====================

  async getCurrentUser(userId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapUserToDto(user);
  }

  // ==================== UPDATE USER PROFILE ====================

  async updateUserProfile(
    userId: string,
    updates: UpdateUserProfileDto,
  ): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update fields
    if (updates.name !== undefined) {
      user.name = updates.name;
    }

    if (updates.picture !== undefined) {
      user.picture = updates.picture;
    }

    const updatedUser = await this.userRepository.save(user);

    return this.mapUserToDto(updatedUser);
  }

  // ==================== HELPER METHODS ====================

  private async generateTokens(user: UserEntity): Promise<AuthTokensDto> {
    const payload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m', // Access token expires in 15 minutes
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d', // Refresh token expires in 7 days
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  private mapUserToDto(user: UserEntity): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  // Legacy method for OAuth (Google/Apple) - kept for backward compatibility
  async validateOAuthLogin(user: any, provider: string): Promise<any> {
    const payload = {
      sub: user.id,
      email: user.email,
      provider,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user,
    };
  }

  // Legacy method for Google token validation - kept for backward compatibility
  async validateGoogleAccessToken(
    accessToken: string,
    userInfo: any,
  ): Promise<any> {
    // This is now handled by googleAuth method
    return this.googleAuth({ accessToken, userInfo });
  }
}
