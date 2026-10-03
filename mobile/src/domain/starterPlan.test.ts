import { starterExpenses, STARTER_CATEGORY_IDS } from './starterPlan';

describe('starterExpenses', () => {
  it('returns every core essential at zero, essential, with unique ids', () => {
    const list = starterExpenses();
    expect(list).toHaveLength(STARTER_CATEGORY_IDS.length);
    expect(new Set(list.map((e) => e.id)).size).toBe(list.length);
    expect(list.every((e) => e.amount === 0 && e.essential)).toBe(true);
  });

  it('leaves out optional and personal items such as the car loan', () => {
    const ids = starterExpenses().map((e) => e.categoryId);
    expect(ids).not.toContain('car_loan');
    expect(ids).not.toContain('loan');
    expect(ids).not.toContain('credit_card');
  });
});
