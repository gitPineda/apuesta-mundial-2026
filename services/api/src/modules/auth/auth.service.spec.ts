import { AuthService } from './auth.service';

describe('AuthService', () => {
  it('does not expose password reset codes when SMTP fails', async () => {
    const db = {
      query: jest.fn().mockResolvedValue({ rowCount: 1, rows: [] }),
    };
    const mail = {
      sendPasswordResetCode: jest.fn().mockResolvedValue({ sent: false }),
    };
    const audit = {
      log: jest.fn().mockResolvedValue(undefined),
    };
    const config = {
      get: jest.fn((key: string, fallback?: string) =>
        key === 'PASSWORD_RESET_CODE_TTL_MINUTES' ? '15' : fallback,
      ),
    };

    const service = new AuthService(config as any, {} as any, db as any, mail as any, audit as any);
    const result = await service.forgotPassword({ email: 'user@example.com' });

    expect(result).toEqual({
      message: 'Si el email existe, no pudimos enviar el codigo en este momento.',
      emailSent: false,
    });
    expect(result).not.toHaveProperty('resetCode');
  });
});
