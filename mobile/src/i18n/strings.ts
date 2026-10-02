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
    intro:
      'We use these two numbers with your income and expenses to plan until your next payday. You can change them later.',
    balance: 'Spendable balance (AED)',
    buffer: 'Safety buffer to keep (AED)',
    bufferHint: 'A cushion we never count as spendable.',
    errorEmpty: 'Please enter an amount, or 0.',
    errorInvalid: 'Use numbers only, for example 1500 or 1500.50.',
  },

  commitments: {
    title: 'Your income and expenses',
    intro:
      'Tap any item to change it, or add your own. These feed your forecast: change them and your safe-to-spend updates. Sample items shown.',
    essential: 'Essential',
    optional: 'Optional',
    toDashboard: 'See my forecast',
    due: (days: number) => dueLabel(days),
    sectionIncome: 'Income',
    sectionFixed: 'Bills and fixed expenses',
    sectionVariable: 'Everyday budgets',
    sectionVariableHint:
      'What you expect to spend this cycle (payday to payday). Essentials such as groceries, fuel and Salik are set aside; dining and shopping come out of your safe to spend.',
    addIncome: 'Add income',
    addFixed: 'Add a bill',
    addVariable: 'Add an everyday budget',
    spentOf: (spent: string, budget: string) => `${spent} spent of ${budget}`,
    nextIn: (days: number) => (days === 0 ? 'next today' : `next in ${days} days`),
    perFrequency: (amount: string, frequency: string) => `${amount} · ${frequency}`,
    reset: 'Reset to sample data',
  },

  edit: {
    titleNew: 'Add item',
    titleEdit: 'Edit item',
    name: 'Name',
    category: 'Category',
    amount: 'Amount (AED)',
    budgetAmount: 'Budget for this cycle (AED)',
    frequency: 'How often',
    nextDue: 'Next due in (days)',
    nextIncome: 'Next payment in (days)',
    spentSoFar: 'Already spent this cycle (AED)',
    essentialLabel: 'Is it essential?',
    essentialYes: 'Essential',
    essentialNo: 'Optional',
    stableLabel: 'Is this income predictable?',
    stableYes: 'Predictable',
    stableNo: 'Varies',
    save: 'Save',
    delete: 'Delete',
    errorName: 'Please give it a name.',
    errorAmount: 'Use numbers only, for example 1500 or 1500.50.',
    errorDays: 'Enter a whole number of days from 0 to 365.',
    notFound: 'This item no longer exists.',
    salaryNote: 'Your salary date sets how far ahead the plan looks.',
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

  charts: {
    balanceTitle: 'Your balance until payday',
    balanceCaption:
      'Projected after your commitments. The dashed line is money kept aside; the gap above it is your safe to spend.',
    today: 'Today',
    inDays: (n: number) => `In ${n} days`,
    keptAside: (amount: string) => `Kept aside ${amount}`,
    billDue: 'Bill due',
    showTable: 'Show as a table',
    hideTable: 'Hide the table',
    tableDay: 'Day',
    tableBalance: 'Balance',
    summary: (start: string, end: string, days: number, kept: string) =>
      `Projected balance falls from ${start} today to ${end} on day ${days}. ${kept} is kept aside for savings, buffer and everyday spending.`,
    breakdownTitle: 'Where your money goes',
    breakdownCaption: 'Everything you have available until payday, split into its parts.',
    segments: {
      safe: 'Safe to spend',
      commitments: 'Commitments',
      savings: 'Savings',
      buffer: 'Safety buffer',
      planned: 'Everyday spending',
    },
    percent: (n: number) => `${n}%`,
    shortfall: (amount: string) => `Shortfall: this plan needs ${amount} more than you have.`,
  },

  tabs: {
    overview: 'Overview',
    spending: 'Spending',
    savings: 'Savings',
    income: 'Income',
  },

  spending: {
    title: 'Spending',
    cycleNote: (elapsedPct: number, daysLeft: number) =>
      `${elapsedPct}% of this pay cycle has passed. ${daysLeft} days to payday.`,
    tileEveryday: 'Everyday spending',
    tileEverydayNote: (spent: string, budget: string) => `${spent} of ${budget} budgeted`,
    tileBills: 'Bills before payday',
    tileBillsNote: (count: number) => (count === 1 ? '1 bill to pay' : `${count} bills to pay`),
    tileFlex: 'Left for dining, shopping and fun',
    tileFlexNote: 'Remaining non-essential budgets',
    headroomOk: (amount: string) =>
      `Those budgets fit inside your safe to spend, with ${amount} to spare.`,
    headroomShort: (amount: string) =>
      `Those budgets would go ${amount} beyond what you can safely spend. Consider trimming one.`,
    budgetsTitle: 'Budgets this cycle',
    budgetsCaption:
      'The bar shows what you have spent. The thin line shows where an even pace would be by today.',
    groupsTitle: 'Where your money goes each month',
    groupsCaption: 'Average monthly cost by type, including yearly and termly bills spread out.',
    drivingTitle: 'Driving in the UAE',
    drivingBody: (spent: string, budget: string) =>
      `Salik, parking and fuel: ${spent} spent of ${budget} this cycle.`,
    drivingTip: 'Keep your Salik account topped up so tolls never fail to charge.',
    trendTitle: 'Spending, last 6 cycles',
    trendCaption: 'Sample history. The darker bar is your most recent cycle.',
    trendFirst: '6 cycles ago',
    trendLast: 'Last cycle',
    trendSummary: (first: string, last: string) =>
      `Spending over the last six cycles, from ${first} to ${last}.`,
    editExpenses: 'Edit my expenses',
  },

  savings: {
    title: 'Savings',
    tileMonthly: 'Saved each month',
    tileMonthlyNote: (pct: string) => `${pct} of your income`,
    tileTotal: 'Total saved',
    tileTotalNote: 'Across all your goals',
    tileCover: 'Emergency cover',
    tileCoverValue: (months: string) => `${months} months`,
    tileCoverNone: 'None yet',
    levels: {
      none: 'No emergency fund yet',
      low: 'Under 1 month: a start',
      building: 'Building toward 3 months',
      solid: '3 months or more covered',
    },
    coverTitle: 'Emergency fund',
    coverBody: (essential: string, target: string, gap: string) =>
      `Your essential spending is about ${essential} a month. Many people aim for 3 to 6 months. Three months is ${target}, and you are ${gap} away.`,
    coverReached: (target: string) =>
      `Three months of essential spending is ${target}, and you have reached it.`,
    coverMissing: 'Mark one of your goals as your emergency fund to see how many months it covers.',
    goalsTitle: 'Your goals',
    goalLine: (saved: string, target: string, pct: number) => `${saved} of ${target} · ${pct}%`,
    goalDone: '✓ Goal reached',
    goalOnTrack: '✓ On track for the deadline',
    goalBehind: (needed: string) => `▲ Needs ${needed} a month to finish on time`,
    goalPaused: 'Paused: not set aside in your forecast',
    goalEta: (months: number, monthly: string) => `About ${months} months at ${monthly} a month`,
    goalNoEta: 'Set a monthly amount to see when you will get there',
    addGoal: 'Add a goal',
    billsTitle: 'Big bills ahead',
    billsCaption:
      'Termly, yearly and one-off bills. This is what to set aside each month, from today, to be ready on time.',
    billLine: (days: number, perMonth: string) =>
      `Due in ${days} days · set aside ${perMonth} a month`,
    noBills: 'No big bills in the next year.',
    surplusTitle: 'Each month',
    surplusPositive: (amount: string) =>
      `After your average spending and your savings, about ${amount} a month is unallocated.`,
    surplusNegative: (amount: string) =>
      `Your average spending and savings come to ${amount} a month more than your income.`,
    gratuityTitle: 'End-of-service gratuity (estimate)',
    gratuityBody: (years: string, basic: string) =>
      `Based on ${years} years of service and a basic wage of ${basic} a month.`,
    gratuityNote:
      'An illustration only: 21 days of basic wage per year for the first five years, 30 days after that, capped at two years of basic wage. Your contract and the law decide the real figure, so please confirm with your employer or the labour authority.',
    gratuityEdit: 'Edit service details',
    gratuityAdd: 'Add service details',
    trendTitle: 'Saved, last 6 cycles',
    trendCaption: 'Sample history. The darker bar is your most recent cycle.',
    trendSummary: (first: string, last: string) =>
      `Amount saved each cycle over the last six cycles, from ${first} to ${last}.`,
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
        'After your commitments, savings, buffer and everyday spending, this plan needs more than the cash you have.',
      'tight-buffer': 'What is left to spend is smaller than the safety buffer you chose to keep.',
      'commitment-due-soon': (name: string) => `${name} is coming up soon and is already reserved.`,
    },
    actions: {
      shortfall:
        'You could delay the purchase, lower the savings amount, or lower an everyday budget.',
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
      safe: 'Cash + expected income - reserved commitments - savings - safety buffer - expected everyday spending. Never shown below zero; a shortfall is shown separately.',
      daily: 'Safe to spend divided by the number of days in the plan (today counts).',
      forecast:
        'Cash + expected income - reserved commitments - expected everyday spending - savings, on the last day before payday.',
    },
    assumptionsText:
      'The plan runs from today until the day before your next payday, so the payday salary is not counted yet. This rule is a prototype assumption we want your feedback on.',
    rows: {
      cash: 'Spendable cash',
      income: 'Expected income in plan',
      commitments: 'Reserved commitments',
      savings: 'Savings set aside',
      buffer: 'Safety buffer',
      planned: 'Expected everyday spending',
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
