import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resendApiKey: string | null;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    this.resendApiKey = this.configService.get<string>('RESEND_API_KEY') || null;
    this.fromEmail =
      this.configService.get<string>('RESEND_FROM_EMAIL') ||
      'FitTrack <no-reply@fittrack.app>';
  }

  async sendPasswordResetCode(
    toEmail: string,
    code: string,
    expiresMinutes: number,
  ): Promise<void> {
    if (!this.resendApiKey) {
      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn(
          `[DEV] RESEND_API_KEY no configurado. OTP para ${toEmail}: ${code}`,
        );
        return;
      }
      throw new InternalServerErrorException(
        'Servicio de email no configurado',
      );
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.resendApiKey}`,
      },
      body: JSON.stringify({
        from: this.fromEmail,
        to: [toEmail],
        subject: 'Código para restablecer tu contraseña',
        html: `
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
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Resend API error: ${response.status} - ${errorText}`);
      throw new InternalServerErrorException(
        'No se pudo enviar el correo de recuperación',
      );
    }
  }
}
