import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as brevo from '@getbrevo/brevo';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly brevoApiKey: string | null;
  private readonly fromEmail: string | null;
  private readonly fromName: string;
  private readonly apiInstance: brevo.TransactionalEmailsApi;

  constructor(private readonly configService: ConfigService) {
    this.brevoApiKey = this.configService.get<string>('BREVO_API_KEY') || null;
    this.fromEmail =
      this.configService.get<string>('BREVO_FROM_EMAIL')?.trim() || null;
    this.fromName =
      this.configService.get<string>('BREVO_FROM_NAME') || 'FitTrack App';

    this.apiInstance = new brevo.TransactionalEmailsApi();

    if (this.brevoApiKey) {
      this.apiInstance.setApiKey(
        brevo.TransactionalEmailsApiApiKeys.apiKey,
        this.brevoApiKey,
      );
    }
  }

  async sendPasswordResetCode(
    toEmail: string,
    code: string,
    expiresMinutes: number,
  ): Promise<void> {
    if (
      !this.brevoApiKey ||
      !this.fromEmail ||
      !this.isValidEmail(this.fromEmail)
    ) {
      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn(
          `[DEV] Config email incompleta (BREVO_API_KEY/BREVO_FROM_EMAIL). OTP para ${toEmail}: ${code}`,
        );
        return;
      }

      throw new InternalServerErrorException(
        'Servicio de email no configurado',
      );
    }

    try {
      await this.apiInstance.sendTransacEmail({
        sender: { email: this.fromEmail, name: this.fromName },
        to: [{ email: toEmail }],
        subject: 'Código para restablecer tu contraseña',
        htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="margin-bottom: 12px;">Restablecer contraseña</h2>
          <p>Usa este código para restablecer tu contraseña:</p>
          <div style="font-size: 28px; letter-spacing: 6px; font-weight: bold; margin: 16px 0;">${code}</div>
          <p>Este código caduca en ${expiresMinutes} minutos.</p>
          <p style="color: #666; font-size: 13px; margin-top: 24px;">
            Si no solicitaste este cambio, puedes ignorar este correo.
          </p>
        </div>
      `,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : JSON.stringify(error);
      this.logger.error(`Brevo API error: ${errorMessage}`);
      throw new InternalServerErrorException(
        'No se pudo enviar el correo de recuperación',
      );
    }
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
