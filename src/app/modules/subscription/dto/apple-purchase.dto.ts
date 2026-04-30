import { IsOptional, IsString } from 'class-validator';

export class VerifyApplePurchaseDto {
  @IsString()
  receiptData!: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsOptional()
  @IsString()
  purchaseToken?: string;
}

export class AppleServerNotificationDto {
  @IsString()
  signedPayload!: string;
}
