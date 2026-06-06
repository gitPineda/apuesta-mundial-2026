import { HttpStatus } from '@nestjs/common';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  it('keeps PayPhone disabled until implementation is enabled', async () => {
    const service = new PaymentsService({} as any, {} as any, {} as any);

    await expect(
      service.initiatePayphone('user-id', {
        betId: 'bet-id',
        idempotencyKey: 'payphone-bet-id',
      }),
    ).rejects.toMatchObject({
      code: 'PAYPHONE_DISABLED',
      status: HttpStatus.NOT_IMPLEMENTED,
    });
  });
});
