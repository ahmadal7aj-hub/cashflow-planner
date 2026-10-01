/** All user-facing text lives here (localization readiness, PRD section 11). English only for now. */
export const t = {
  appName: 'UAE Cash-Flow Planner',
  tagline: 'Know what is safe to spend before your next payday.',
  prototypeNote: 'Prototype: sample data only. Nothing is saved or sent.',
  start: 'Get started',
  continue: 'Continue',
  back: 'Back',

  onboarding: {
    title: 'Your starting point',
    intro: 'We use these three numbers to plan until your next payday. You can change them later.',
    balance: 'Spendable balance (AED)',
    savings: 'Monthly savings to set aside (AED)',
    buffer: 'Safety buffer to keep (AED)',
    bufferHint: 'A cushion we never count as spendable.',
    errorEmpty: 'Please enter an amount, or 0.',
    errorInvalid: 'Use numbers only, for example 1500 or 1500.50.',
  },

  commitments: {
    title: 'Your regular commitments',
    intro: 'Rent, bills and loans we will reserve money for. Sample items shown.',
    essential: 'Essential',
    optional: 'Optional',
    toDashboard: 'See my forecast',
    due: (days: number) => dueLabel(days),
  },

  dashboard: {
    title: 'Your forecast',
    safeToSpend: 'Safe to spend',
    horizon: (days: number) => `until your next payday, in ${days} days`,
    daily: 'Daily safe amount',
    perDay: (amount: string) => `${amount} per day`,
    forecast: 'Expected balance',
    forecastOn: (days: number) => `the day before payday (in ${days - 1 < 0 ? 0 : days - 1} days)`,
    upcoming: 'Upcoming commitments',
    warnings: 'Heads-up',
    noWarnings: 'Nothing needs your attention right now.',
    shortfall: (amount: string) => `Short by ${amount} on this plan`,
    whatIf: 'Try a what-if',
    settings: 'Settings and assumptions',
    tapToExplain: 'Tap for how this is calculated',
  },

  warning: {
    title: 'Why you are seeing this',
    when: 'When',
    amount: 'Amount',
    why: 'Why',
    action: 'Options to consider',
    kinds: {
      shortfall: 'Projected shortfall',
      'tight-buffer': 'Your buffer is tight',
      'commitment-due-soon': 'Commitment due soon',
    },
    reasons: {
      shortfall:
        'After your commitments, savings, buffer and planned spending, this plan needs more than the cash you have.',
      'tight-buffer': 'What is left to spend is smaller than the safety buffer you chose to keep.',
      'commitment-due-soon': (name: string) => `${name} is coming up soon and is already reserved.`,
    },
    actions: {
      shortfall:
        'You could delay the purchase, lower the savings amount, or move a planned expense.',
      'tight-buffer': 'You could spend a little less per day, or revisit the buffer you set.',
      'commitment-due-soon':
        'Nothing to do if the money is in place. It is already set aside for you.',
    },
    notFound: 'This warning is no longer active.',
  },

  explain: {
    title: 'How this is calculated',
    inputs: 'What went in',
    formula: 'Formula',
    assumptions: 'Assumptions',
    notFound: 'Unknown metric.',
    metrics: {
      safe: 'Safe to spend',
      daily: 'Daily safe amount',
      forecast: 'Expected balance',
    },
    formulas: {
      safe: 'Cash + expected income - reserved commitments - savings - safety buffer - planned spending. Never shown below zero; a shortfall is shown separately.',
      daily: 'Safe to spend divided by the number of days in the plan (today counts).',
      forecast:
        'Cash + expected income - reserved commitments - planned spending - savings, on the last day before payday.',
    },
    assumptionsText:
      'The plan runs from today until the day before your next payday, so the payday salary is not counted yet. This rule is a prototype assumption we want your feedback on.',
    rows: {
      cash: 'Spendable cash',
      income: 'Expected income in plan',
      commitments: 'Reserved commitments',
      savings: 'Savings set aside',
      buffer: 'Safety buffer',
      planned: 'Planned spending',
      days: 'Days in plan',
      result: 'Result',
    },
  },

  scenario: {
    title: 'What if I buy this?',
    intro: 'Try a purchase without changing your real plan. Nothing here is saved.',
    toggleOff: 'Add a 3,000 laptop purchase',
    toggleOn: 'Remove the purchase',
    baseline: 'Your plan today',
    withPurchase: 'With the purchase',
    safe: 'Safe to spend',
    balance: 'Expected balance',
    shortfallNote: 'This purchase would leave the plan short.',
    isolated: 'Your real plan is unchanged unless you choose to apply a change.',
  },

  settings: {
    title: 'Settings and assumptions',
    assumptions: 'Assumptions in this prototype',
    horizonRule: 'Plan until: the day before next payday',
    currency: 'Currency: AED',
    language: 'Language: English (Arabic is not in this prototype)',
    editNumbers: 'Edit my starting numbers',
    data: 'Your data',
    export: 'Export my data',
    delete: 'Delete my account',
    notAvailable: 'Not available in the prototype. Both will always be free and never blocked.',
  },

  env: { prefix: 'Environment' },
} as const;

function dueLabel(days: number): string {
  if (days <= 0) return 'due today';
  if (days === 1) return 'due tomorrow';
  return `due in ${days} days`;
}
