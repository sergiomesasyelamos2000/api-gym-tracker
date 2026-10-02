import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { userExistenceCache } from '../utils/user-existence.cache';

describe('JwtStrategy', () => {
  const userRepository = {
    findOne: jest.fn(),
  };
  const configService = {
    get: jest.fn().mockReturnValue('test-secret'),
  };

  let strategy: JwtStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    userExistenceCache.clear();
    strategy = new JwtStrategy(
      userRepository as any,
      configService as any,
    );
  });

  it('trusts payload name and only checks existence by id', async () => {
    userRepository.findOne.mockResolvedValue({ id: 'u1' });

    const result = await strategy.validate({
      sub: 'u1',
      email: 'a@b.com',
      name: 'Ada',
    });

    expect(result).toEqual({
      sub: 'u1',
      id: 'u1',
      email: 'a@b.com',
      name: 'Ada',
    });
    expect(userRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'u1' },
      select: { id: true },
    });
  });

  it('uses existence cache on subsequent requests', async () => {
    userRepository.findOne.mockResolvedValue({ id: 'u1' });

    await strategy.validate({
      sub: 'u1',
      email: 'a@b.com',
      name: 'Ada',
    });
    await strategy.validate({
      sub: 'u1',
      email: 'a@b.com',
      name: 'Ada',
    });

    expect(userRepository.findOne).toHaveBeenCalledTimes(1);
  });

  it('falls back to minimal select for legacy tokens without name', async () => {
    userRepository.findOne.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      name: 'Ada',
    });

    const result = await strategy.validate({
      sub: 'u1',
      email: 'a@b.com',
    });

    expect(result.name).toBe('Ada');
    expect(userRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'u1' },
      select: { id: true, email: true, name: true },
    });
  });

  it('rejects missing users', async () => {
    userRepository.findOne.mockResolvedValue(null);

    await expect(
      strategy.validate({
        sub: 'missing',
        email: 'a@b.com',
        name: 'Ada',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
