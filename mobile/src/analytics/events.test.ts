import { clearRecordedEvents, getRecordedEvents, track } from './events';

beforeEach(clearRecordedEvents);

describe('track (privacy-minimized analytics)', () => {
  it('records allowed properties', () => {
    track('dashboard_viewed', { has_warning: true, horizon_type: 'next_payday' });
    expect(getRecordedEvents()).toEqual([
      { name: 'dashboard_viewed', props: { has_warning: true, horizon_type: 'next_payday' } },
    ]);
  });

  it('drops forbidden financial properties', () => {
    track('onboarding_completed', {
      steps_completed: 3,
      salary: 15000,
      balance: 8200,
      email: 'someone@example.com',
      financial_amount: 1,
    });
    expect(getRecordedEvents()[0]?.props).toEqual({ steps_completed: 3 });
  });

  it('drops a property that is allowed on a different event', () => {
    track('warning_opened', { warning_type: 'shortfall', scenario_type: 'purchase', amount: 3000 });
    expect(getRecordedEvents()[0]?.props).toEqual({ warning_type: 'shortfall' });
  });

  it('drops non-primitive values even under an allowed key', () => {
    track('scenario_created', { scenario_type: { amount: 3000 } });
    expect(getRecordedEvents()[0]?.props).toEqual({});
  });
});
