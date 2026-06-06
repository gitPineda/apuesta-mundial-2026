import { BettingService } from './betting.service';

describe('BettingService', () => {
  it('locks bet creation by user and match inside the transaction', async () => {
    const service = new BettingService({} as any, {} as any);
    const query = jest.fn().mockResolvedValue({ rows: [] });

    await (service as any).lockUserMatchBetCreation(
      'user-1',
      ['match-2', 'match-1', 'match-1'],
      { query },
    );

    expect(query).toHaveBeenCalledTimes(2);
    expect(query).toHaveBeenNthCalledWith(
      1,
      'select pg_advisory_xact_lock(hashtext($1), hashtext($2))',
      ['user-1', 'match-1'],
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      'select pg_advisory_xact_lock(hashtext($1), hashtext($2))',
      ['user-1', 'match-2'],
    );
  });
});
