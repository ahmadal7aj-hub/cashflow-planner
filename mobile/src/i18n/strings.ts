/** All user-facing text lives here (localization readiness, PRD section 11). English only for now. */
export const t = {
  appName: 'UAE Cash-Flow Planner',
  tagline: 'Know what is safe to spend before your next payday.',
  prototypeNote: 'Prototype: sample data only. Nothing is saved or sent.',
  welcome: {
    benefit1: 'See what is safe to spend until your next payday.',
    benefit2: 'Never miss a bill, with reminders you choose.',
    benefit3: 'Understand every number, and try a what-if before you spend.',
  },
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
    editBalance: 'Edit my balance and safety buffer',
    remove: (name: string) => `Remove ${name}`,
    removeShort: 'Remove',
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
    nextOn: (date: string, relative: string) => `next ${date} (${relative})`,
    perFrequency: (amount: string, frequency: string) => `${amount} · ${frequency}`,
    reset: 'Reset to sample data',
  },

  edit: {
    titleNew: 'Add item',
    titleEdit: 'Edit item',
    name: 'Name',
    category: 'Category',
    amount: 'Amount (AED)',
    incomeZeroHint: 'Not receiving this one this month? Enter 0, or use Delete below to remove it.',
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
    salaryNote:
      'Your salary date sets how far ahead the plan looks. If today is payday and your salary is already in your balance, enter your next payday instead.',
    errorSalaryDays: 'Enter a salary date within the next 62 days.',
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

  dates: {
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
    today: 'today',
    choose: 'Choose a date',
    tapToChange: 'Opens a calendar',
    clear: 'Clear the date',
    dueDate: 'Due date',
    dueDateHint: 'The next time this bill is due. Repeating bills keep this day each period.',
    nextPayment: 'Next payment date',
    deadline: 'Deadline (optional)',
    errorDueDate: 'Please choose a due date.',
    errorPastOneOff: 'A one-off bill needs today or a later date.',
    errorSalaryDate: 'Choose a salary date within the next 62 days.',
  },

  reminder: {
    label: 'Remind me',
    none: 'No reminder',
    custom: 'Pick a date',
    pickLabel: 'Reminder date',
    summary: (date: string, daysBefore: number) =>
      daysBefore === 0
        ? `You will see a reminder on the day (${date}).`
        : `You will see a reminder from ${date}.`,
    errorCustom: 'Choose a day that is before the due date and not in the past.',
    set: (daysBefore: number) =>
      daysBefore === 0
        ? 'Reminder on the day'
        : daysBefore === 1
          ? 'Reminder 1 day before'
          : `Reminder ${daysBefore} days before`,
    cardTitle: 'Reminders',
    line: (name: string, when: string, date: string) => `${name} is due ${when} (${date})`,
    insightTitle: (name: string) => `Reminder: ${name}`,
    insightBody: (when: string, amount: string) => `Due ${when}. The bill is ${amount}.`,
  },

  investments: {
    title: 'Investments',
    openCard: 'Open investments',
    summaryNote: (count: number) => (count === 1 ? '1 investment' : `${count} investments`),
    disclaimer:
      'For tracking only. This is not investment advice, and returns are not guaranteed. Values are the numbers you enter.',
    tileInvested: 'Total invested',
    tileValue: 'Worth now',
    tileProfit: 'Profit or loss',
    profitNote: (ratio: string) => ratio,
    tileIncome: 'Income each month',
    incomeNote: (yieldPct: string) => `About ${yieldPct} a year on what it is worth`,
    gain: 'Profit',
    loss: 'Loss',
    allocationTitle: 'What you hold',
    allocationCaption: 'Current value by type of investment.',
    listTitle: 'Your investments',
    add: 'Add an investment',
    empty:
      'No investments yet. Add one to track what you put in, what it is worth and what it pays.',
    line: (type: string, invested: string) => `${type} · put in ${invested}`,
    income: (monthly: string) => `Income about ${monthly} a month`,
    contribution: (monthly: string) => `Adding ${monthly} a month`,
    paused: 'Monthly contribution paused',
    noIncome: 'No income entered',
    formType: 'Type of investment',
    formName: 'Name',
    formInvested: 'Total put in (AED)',
    formValue: 'Worth now (AED)',
    formContribution: 'Adding each month (AED, optional)',
    formContributionHint: 'Set aside in your forecast so it is not counted as spendable.',
    formIncomeFrequency: 'How often the income is paid',
    formIncomeHint:
      'Leave at 0 if it pays nothing. Profit from the value going up is worked out for you.',
    formEnabled: 'Set aside the monthly contribution in my forecast?',
    formEnabledYes: 'Yes, set it aside',
    formEnabledNo: 'Paused',
    errorNumber: 'Use numbers only, for example 1500 or 1500.50.',
  },

  tabs: {
    overview: 'Overview',
    spending: 'Spending',
    savings: 'Savings',
    income: 'Income',
    insights: 'Insights',
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
    currentTitle: 'Current savings',
    currentNote:
      'Your goals set aside parts of this. It goes up when you add money or save, and down when you take money out or spend more than you earn.',
    belowZero:
      'Your savings are below zero. That means more was spent than earned. Adding money or trimming spending will bring it back up.',
    addMoney: 'Add money',
    takeOut: 'Take out',
    cycleTitle: 'End of this pay cycle',
    cycleBody: (income: string, spending: string) =>
      `A typical month: ${income} comes in and ${spending} goes out.`,
    cycleGain: (amount: string) =>
      `That leaves about ${amount}. Apply it to add it to your savings.`,
    cycleLoss: (amount: string) =>
      `That is about ${amount} more going out than coming in. Applying it reduces your savings.`,
    cycleApply: 'Apply this to my savings',
    cycleDone: 'This pay cycle has already been added to your savings.',
    cycleNote:
      'An estimate from your typical month. The real app will use your actual transactions instead.',
    activityTitle: 'Recent activity',
    noActivity: 'No activity yet. Add money or apply a pay cycle and it will appear here.',
    entryKinds: { deposit: 'Added', withdrawal: 'Taken out', cycle: 'Pay cycle' },
    entryLine: (date: string, kind: string, note: string) =>
      `${date} · ${kind}${note ? ` · ${note}` : ''}`,
    formTitleIn: 'Add to savings',
    formTitleOut: 'Take out of savings',
    formAmount: 'Amount (AED)',
    formNote: 'Note (optional)',
    formNoteHint: 'For example: bonus, car repair.',
    errorInsufficient: (balance: string) => `You only have ${balance} saved.`,
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

  income: {
    title: 'Income',
    tileTotal: 'Income each month',
    tileTotalNote: 'Average, including yearly and irregular income',
    tileStable: 'Predictable income',
    tileStableNote: (pct: number) => `${pct}% of your income`,
    tileCover: 'Covers your spending',
    tileCoverNote: 'Predictable income vs average monthly spending',
    sourcesTitle: 'Where your income comes from',
    sourcesCaption: 'Average monthly value of each source, yearly and quarterly income spread out.',
    predictable: 'Predictable',
    varies: 'Varies',
    sourceLine: (kind: string, frequency: string, next: string) =>
      `${kind} · ${frequency} · ${next}`,
    addIncome: 'Add income',
    upcomingTitle: 'Money coming in',
    upcomingCaption: 'The next 60 days.',
    inDays: (n: number) => (n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`),
    noUpcoming: 'No income expected in the next 60 days.',
    stabilityTitle: 'How steady is it?',
    stabilityGap: (coverage: number, gap: string) =>
      `Your predictable income covers ${coverage}% of your average spending. After savings, about ${gap} a month comes from irregular income. That is common; a little extra buffer helps in months it comes in lower.`,
    stabilityOk: (spare: string) =>
      `Your predictable income covers your average spending and savings, with about ${spare} a month to spare.`,
    rangeTitle: 'Last 6 cycles',
    rangeBody: (min: string, max: string, avg: string) =>
      `Your income ranged from ${min} to ${max}, averaging ${avg}.`,
    trendTitle: 'Income, last 6 cycles',
    netTitle: 'Left after spending, last 6 cycles',
    trendCaption: 'Sample history. The darker bar is your most recent cycle.',
    trendSummary: (first: string, last: string) =>
      `Income each cycle over the last six cycles, from ${first} to ${last}.`,
    netSummary: (first: string, last: string) =>
      `Money left after spending each cycle over the last six cycles, from ${first} to ${last}.`,
  },

  insights: {
    title: 'Insights',
    intro: 'Plain-language notes from your plan. Tap one to see the numbers behind it.',
    empty: 'Nothing needs your attention right now.',
    severity: {
      attention: '⚠ Needs attention',
      'heads-up': '▲ Heads-up',
      info: '• Good to know',
    },
    shortfallTitle: 'This plan is short before payday',
    shortfallBody: (amount: string) =>
      `The plan needs ${amount} more than you have. Delaying a purchase or trimming a budget would close the gap.`,
    overTitle: (name: string) => `${name} is over budget`,
    overBody: (amount: string) =>
      `You are ${amount} past the budget you set. You could move money from another budget or raise this one.`,
    aheadTitle: (name: string) => `${name} is ahead of pace`,
    aheadBody: (amount: string) =>
      `${amount} is left for the rest of the cycle. A slightly slower pace keeps you inside the budget.`,
    billTitle: (name: string) => `${name} is coming up`,
    billBody: (days: number, perMonth: string) =>
      `Due in ${days} days. Setting aside ${perMonth} a month from now would have it covered.`,
    tightTitle: 'Your fun budgets are bigger than what is safe to spend',
    tightBody: (amount: string) =>
      `They would go ${amount} beyond what you can safely spend this cycle. Trimming one would help.`,
    cashTitle: 'Your emergency fund is small',
    cashBody: (amount: string) =>
      `Three months of essential spending is a common goal and you are ${amount} away. Even a small monthly top-up helps.`,
    goalTitle: (name: string) => `${name} needs a bigger monthly amount`,
    goalBody: (amount: string) =>
      `To finish on time it needs ${amount} a month. You can raise the amount or move the deadline.`,
    gapTitle: 'You rely on irregular income',
    gapBody: (amount: string) =>
      `Your predictable income falls ${amount} short of spending plus savings each month. Irregular income fills the gap, so a little extra buffer is wise.`,
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

  monthlyPlan: {
    title: 'Your monthly plan',
    intro:
      'Start with what comes in, decide what to save, and the rest is yours to spend. Everything here is a typical month.',
    step1: '1. What comes in',
    step1Note:
      'Salary and other income, including investment income. Change them under Your income and expenses.',
    editIncome: 'Edit my income',
    step2: '2. What I save each month',
    saveLabel: 'Amount to save each month (AED)',
    saveHint: 'Type 0 if you are not saving yet. This is on top of any savings goals below.',
    errorSave: 'Enter an amount of zero or more, for example 2000.',
    goalsLine: 'Savings goals (already set)',
    investLine: 'Investing (already set)',
    totalSet: 'Set aside each month',
    step3: '3. Left to spend',
    leftNote:
      'What is left of your income after saving. Bills and everyday spending come out of this.',
    plannedLine: 'Spending you have entered',
    roomLine: 'Room left over',
    overLine: 'More than what is left',
    overNote:
      'The spending you entered is more than what is left after saving. Lower the savings or the spending.',
    setAsideMore: 'You are setting aside more than your income. Lower the amount to save.',
    unbudgetedAfter: (amount: string) =>
      `After this, ${amount} of your monthly balance is still unbudgeted.`,
    overAfter: (amount: string) =>
      `After this, your spending is ${amount} more than your monthly balance.`,
    spendingTitle: 'Your spending budget',
    spendingIntro: 'What is left after saving is the most your budgets can add up to.',
    spendingLeft: 'Left to spend each month',
    spendingBudgeted: 'Already budgeted',
    spendingUnbudgeted: 'Still unbudgeted',
    spendingOver: 'Over your balance by',
    zeroIncome: 'Not receiving this month',
    clearSample: 'Clear sample data and start fresh',
    open: 'Plan my monthly savings',
    saved: 'Saved. Your safe to spend now sets this amount aside.',
    save: 'Save my plan',
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
    appearance: 'Appearance',
    appearanceHint: 'Match your phone, or always use light or dark.',
    appearanceSystem: 'Match my phone',
    appearanceLight: 'Light',
    appearanceDark: 'Dark',
    exportMessage:
      'Export is not available in this prototype yet. In the real app you will be able to download all of your own data.',
    deleteMessage:
      'Nothing is saved in this prototype, so there is nothing to delete. In the real app, deleting will remove your account and data.',
  },

  env: { prefix: 'Environment' },
} as const;

function dueLabel(days: number): string {
  if (days <= 0) return 'due today';
  if (days === 1) return 'due tomorrow';
  return `due in ${days} days`;
}
