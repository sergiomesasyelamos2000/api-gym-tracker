import { Test } from '@nestjs/testing';
import { AppService } from './app.service';
import { describe, it, expect, beforeAll } from '@jest/globals';

describe('AppService', () => {
  let service: AppService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = app.get<AppService>(AppService);
  });

  describe('getData', () => {
    it('should return "Hell API"', () => {
      expect(service.getData()).toEqual({ message: 'Hello API' });
    });
  });
});
