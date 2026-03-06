import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
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
    this.brevoApiKey = this.sanitizeEnv(
      this.configService.get<string>('BREVO_API_KEY'),
    );
    this.fromEmail = this.normalizeEmailEnv(
      this.configService.get<string>('BREVO_FROM_EMAIL'),
    );
    this.fromName =
      this.sanitizeEnv(this.configService.get<string>('BREVO_FROM_NAME')) ||
      'EvoFit App';

    this.apiInstance = new brevo.TransactionalEmailsApi();

    if (this.brevoApiKey) {
      this.apiInstance.setApiKey(
        brevo.TransactionalEmailsApiApiKeys.apiKey,
        this.brevoApiKey,
      );
    }

    this.logger.log(
      `Email config loaded: apiKey=${this.brevoApiKey ? 'yes' : 'no'}, fromEmail=${
        this.fromEmail || 'missing'
      }`,
    );
  }

  async sendPasswordResetCode(
    toEmail: string,
    code: string,
    expiresMinutes: number,
  ): Promise<void> {
    const currentYear = new Date().getFullYear();

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

      this.logger.error(
        `Email service misconfigured in production. apiKey=${
          this.brevoApiKey ? 'yes' : 'no'
        }, fromEmail=${this.fromEmail || 'missing'}`,
      );

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
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f5ff; padding: 40px 20px;">
          <div style="background: linear-gradient(135deg, #7c3aed, #c026d3); border-radius: 24px; padding: 34px; text-align: center; color: white;">
            <h1 style="font-size: 30px; font-weight: 900; margin: 0 0 8px;">Evo<span style="color: #e9d5ff;">Fit</span></h1>
            <p style="opacity: 0.92; font-size: 13px; margin: 0; letter-spacing: 2px;">RECUPERACIÓN DE CUENTA</p>
          </div>

          <div style="background: white; border-radius: 16px; padding: 32px; margin-top: 24px;">
            <h2 style="color: #1a1a1a; font-size: 24px; font-weight: 800; margin: 0 0 14px;">
              Restablece tu contraseña
            </h2>
            <p style="color: #555; line-height: 1.7; margin: 0 0 20px;">
              Hemos recibido una solicitud para cambiar tu contraseña. Usa este código de verificación en la app:
            </p>

            <div style="background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 14px; padding: 18px; text-align: center; margin-bottom: 18px;">
              <p style="margin: 0 0 8px; color: #6d28d9; font-size: 12px; font-weight: 700; letter-spacing: 1px;">
                CÓDIGO DE VERIFICACIÓN
              </p>
              <div style="font-size: 34px; letter-spacing: 8px; font-weight: 900; color: #4c1d95;">
                ${code}
              </div>
            </div>

            <div style="background: #fefce8; border-left: 4px solid #eab308; border-radius: 10px; padding: 12px 14px; margin-bottom: 18px;">
              <p style="margin: 0; color: #713f12; font-size: 14px;">
                Este código caduca en <strong>${expiresMinutes} minutos</strong>.
              </p>
            </div>

            <p style="color: #555; line-height: 1.7; margin: 0 0 8px; font-size: 14px;">
              Si no solicitaste este cambio, puedes ignorar este correo con seguridad.
            </p>
            <p style="color: #777; line-height: 1.7; margin: 0; font-size: 13px;">
              Por seguridad, no compartas este código con nadie.
            </p>
          </div>

          <p style="text-align: center; color: #999; font-size: 12px; margin-top: 24px;">
            © ${currentYear} EvoFit. Todos los derechos reservados.
          </p>
        </div>
      `,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : JSON.stringify(error);
      const apiError = error as {
        response?: { body?: unknown };
        body?: unknown;
      };
      const errorBody =
        apiError?.response?.body !== undefined
          ? JSON.stringify(apiError.response.body)
          : apiError?.body !== undefined
            ? JSON.stringify(apiError.body)
            : null;

      this.logger.error(
        `Brevo API error: ${errorMessage}${errorBody ? ` | body: ${errorBody}` : ''}`,
      );
      throw new InternalServerErrorException(
        'No se pudo enviar el correo de recuperación',
      );
    }
  }

  private sanitizeEnv(value?: string): string | null {
    const normalized = (value || '')
      .trim()
      .replace(/^['"]|['"]$/g, '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '');
    return normalized || null;
  }

  private normalizeEmailEnv(value?: string): string | null {
    const sanitized = this.sanitizeEnv(value);
    if (!sanitized) {
      return null;
    }

    // Allow accidental inline comments in env values:
    // BREVO_FROM_EMAIL=user@example.com # comment
    const withoutComment = sanitized.replace(/\s+#.*$/, '').trim();
    return withoutComment || null;
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
