/** All user-facing text lives here (localization readiness, PRD section 11). English only for now. */
export const t = {
  appName: 'UAE Cash-Flow Planner',
  tagline: 'Know what is safe to spend before your next payday.',
  prototypeNote: 'Prototype: what you enter is saved on this phone only. Nothing is sent anywhere.',
  welcome: {
    benefit1: 'See what is safe to spend until your next payday.',
    benefit2: 'Never miss a bill, with reminders you choose.',
    benefit3: 'Understand every number, and try a what-if before you spend.',
  },
  start: 'Get started',
  continue: 'Continue',
  back: 'Back',

  addItem: 'Add item',

  swipe: {
    delete: 'Delete',
    cancel: 'Cancel',
    deleteLabel: (name: string) => `Delete ${name}`,
    confirmTitle: (name: string) => `Delete ${name}?`,
    confirmBody: 'This removes it from your plan. Earlier months and past spending are kept.',
  },

  setup: {
    title: 'Your savings',
    intro:
      'Tell us what you have saved so far and what you plan to save each month. You can leave either at 0 and change it later.',
    openingLabel: 'Savings you already have (AED)',
    openingHint:
      'This is your starting balance. It is not counted as income or as saved this month.',
    dateLabel: 'Balance as of',
    targetLabel: 'Monthly savings target (AED)',
    targetHint:
      'What you plan to put aside each month. A target is a plan, not money already saved.',
    errorAmount: 'Use numbers only, for example 5000 or 0.',
    errorDate: 'Choose the date this balance applies from.',
    errorFuture: 'The balance date cannot be in the future.',
    save: 'Save and continue',
  },

  incomePage: {
    title: 'Income',
    emptyTitle: 'No income added yet',
    emptyBody:
      'Add your salary and any other income. Choose a category, then enter the amount, how often you are paid and the next payment date.',
    predictable: 'Predictable',
    varies: 'Varies',
    zero: 'Not receiving this month',
  },

  budgetPage: {
    title: 'Budgeting',
    billsTitle: 'Bills and fixed expenses',
    billsEmptyTitle: 'No bills added yet',
    billsEmptyBody:
      'Add rent, utilities, loans and other bills that fall due on a date. Choose a category, enter the amount and the due date.',
    everydayTitle: 'Everyday budgets',
    everydayHint:
      'A monthly amount for each kind of spending, such as groceries or petrol. Record what you actually spend on the Actual spending page.',
    everydayEmptyTitle: 'No everyday budgets yet',
    everydayEmptyBody:
      'Add a monthly budget for each category you want to keep track of, for example groceries AED 3,000.',
    monthly: (amount: string) => `${amount} a month`,
    paid: (date: string) => `Paid on ${date}`,
    markPaid: 'Mark as paid',
    markPaidLabel: (name: string) => `Mark ${name} as paid`,
    dueOn: (date: string) => `Due ${date}`,
    nextDue: (date: string) => `Next due ${date}`,
  },

  spendingPage: {
    title: 'Actual spending',
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
    summaryBudget: 'Monthly budget',
    summarySpent: 'Spent',
    summaryRemaining: 'Remaining',
    summaryOver: 'Over budget by',
    emptyTitle: 'No spending recorded yet',
    emptyBody:
      'Add each purchase when you make it: choose the category, the amount and the date. It is compared with that category budget.',
    categoriesTitle: 'Budget against spending',
    budget: 'Budget',
    spent: 'Spent',
    remaining: 'Remaining',
    overBy: (amount: string) => `Over by ${amount}`,
    unbudgeted: 'Unbudgeted: no budget set for this category',
    onBudget: 'Within budget',
    recordsTitle: 'Spending records',
    noRecords: 'Nothing recorded this month.',
  },

  spendForm: {
    titleNew: 'Add spending',
    titleEdit: 'Edit spending',
    category: 'Category',
    note: 'Note (optional)',
    amount: 'Amount (AED)',
    date: 'Date',
    errorAmount: 'Enter an amount above zero, for example 200.',
    errorDate: 'Choose a date.',
    save: 'Save',
  },

  savingsPage: {
    title: 'Savings planning',
    totalTitle: 'Total savings',
    totalAsOf: (date: string) => `As of ${date}`,
    notSet: 'Not set yet',
    openingLine: (amount: string, date: string) => `Existing savings: ${amount} as of ${date}`,
    editOpening: 'Change existing savings',
    targetTitle: 'Monthly savings target',
    targetNote: 'A plan, not money already saved.',
    editTarget: 'Change target',
    projectedTitle: 'This month (projected)',
    projectedNote:
      'An estimate, not money saved yet. It assumes you spend your plan, or what you have already spent if that is more.',
    projectedSaving: 'Projected to add to savings',
    projectedTaken: 'Projected to come from existing savings',
    projectedClosing: 'Projected balance at month end',
    addMoney: 'Add money',
    takeOut: 'Take out',
    activityTitle: 'Savings activity',
    noActivity: 'No savings activity yet.',
    monthClose: (month: string) => `Month result: ${month}`,
    correction: (month: string) => `Correction for ${month}`,
    deposit: 'Added',
    withdrawal: 'Taken out',
    monthsTitle: 'Finished months',
    monthLine: (income: string, spending: string) => `Income ${income} · Spending ${spending}`,
    goalsTitle: 'Savings goals',
    goalsEmptyTitle: 'No savings goals yet',
    goalsEmptyBody:
      'Add something you are saving for, with a target amount and what you put aside each month.',
    investments: 'Investments',
    formTitleIn: 'Add money to savings',
    formTitleOut: 'Take money out of savings',
    formAmount: 'Amount (AED)',
    formNote: 'Note (optional)',
    formDate: 'Date',
    errorAmount: 'Enter an amount above zero, for example 500.',
    errorInsufficient: (balance: string) => `You only have ${balance} saved.`,
    errorBeforeOpening: 'That date is before your savings balance starts.',
    errorNoOpening: 'Set your existing savings first.',
    targetFormTitle: 'Monthly savings target',
    openingFormTitle: 'Existing savings',
  },

  dashboardPage: {
    title: 'Dashboard',
    showing: (from: string, to: string) => `Showing ${from} to ${to}`,
    presets: {
      'current-month': 'Current month',
      'last-week': 'Last week',
      'last-month': 'Last month',
      'last-quarter': 'Last quarter',
      'last-year': 'Last year',
      custom: 'Custom range',
    },
    rangeLabel: 'Date range',
    from: 'From',
    to: 'To',
    dateHint: 'Type a date as YYYY-MM-DD, for example 2026-01-01. Any start and end date works.',
    errorStart: 'Enter a valid start date, for example 2026-01-01.',
    errorEnd: 'Enter a valid end date, for example 2026-12-31.',
    errorOrder: 'The end date cannot be before the start date.',
    incomeTitle: 'Income',
    received: 'Received',
    expected: 'Still expected',
    spendingTitle: 'Spending against budget',
    budget: 'Budget for these dates',
    spent: 'Actual spending',
    remaining: 'Remaining budget',
    overBy: 'Over budget by',
    prorated:
      'For part of a month, everyday budgets are shared out by days and bills count when they fall due.',
    unbudgeted: (amount: string) => `Unbudgeted spending included: ${amount}`,
    savingsTitle: 'Savings',
    thisMonthSavings: 'This month’s savings',
    periodSavings: 'Period savings',
    totalSavings: 'Total savings',
    periodNote:
      'Net savings added in these dates, including any reductions. Your starting balance is not included.',
    totalNote: (date: string) => `Cumulative balance at the end of ${date}`,
    totalUnknown: 'Not available: your savings balance starts after these dates.',
    projectedNote: (amount: string) => `Projected balance at month end: ${amount}`,
    budgetsTitle: 'Budgets',
    budgetsNone: 'No budgets set yet.',
    openSpending: 'Open actual spending',
    openBudget: 'Open budgeting',
  },

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
    deleteConfirm: 'Yes, delete it',
    deleteCancel: 'Keep it',
    deleteAsk: 'Delete this for good? Tap the button again to confirm.',
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
    dashboard: 'Dashboard',
    income: 'Income',
    savings: 'Savings planning',
    budget: 'Budgeting',
    spending: 'Actual spending',
    shared: 'Shared',
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

  shared: {
    title: 'Shared dashboard',
    previewNote:
      'PREVIEW: this is a mock-up on this phone with a made-up partner. Nothing is stored or sent. Real linking needs accounts, which come later.',
    notLinkedHint:
      'Link your account with another person to share chosen savings and spending on a separate Shared dashboard. Nothing is shared unless you choose it, item by item.',
    linkAccount: 'Link with another account',
    linkTitle: 'Link with another account',
    linkIntro:
      'Enter the username of the person you want to link with. In the finished app they accept, and you both see a Shared dashboard. You choose exactly which items to share.',
    usernameLabel: 'Their username',
    usernameHint: 'For example sara_ahmed. The preview links you with a made-up partner.',
    errorUsername: 'Enter a username of at least 3 characters.',
    linkButton: 'Link accounts (preview)',
    linkedTitle: 'Accounts linked',
    linkedWith: (name: string) => `Linked with ${name}`,
    linkedExplain:
      'Only items you tap Share on appear on the Shared dashboard. Your own dashboard stays private.',
    openShared: 'Open the Shared dashboard',
    unlink: 'Unlink and stop sharing everything',
    shareLabel: (name: string) => `Share with ${name}?`,
    private: 'Private',
    shared: 'Shared',
    you: 'You',
    combined: 'Together',
    due: (when: string) => `due ${when}`,
    nothingYet: 'Nothing shared here yet.',
    emptyHint:
      'You have not shared anything yet. Open an item and choose Shared, or add to your savings with Shared selected.',
    stopSharing: 'Stop sharing this',
    savingsTitle: 'Shared savings',
    savingsNote: 'Savings you each chose to share.',
    upcomingTitle: 'Upcoming essential spending',
    upcomingNote: 'Bills you each shared, soonest first.',
    spendingTitle: 'Shared spending',
    spendingNote: 'Monthly spending budgets you each shared.',
    manageLink: 'Manage the link',
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
    editNumbers: 'Edit my spendable balance and safety buffer',
    loadSample: 'Load sample data (for demos)',
    loadSampleHint:
      'Replaces what you have entered with made-up sample data. Use it only for demos and interviews.',
    loadSampleDone: 'Sample data loaded.',
    data: 'Your data',
    export: 'Export my data',
    delete: 'Delete my account',
    notAvailable:
      'Your entries are saved on this phone only. You can export a copy; deleting everything at once is not available yet, but you can delete items one by one.',
    appearance: 'Appearance',
    appearanceHint: 'Match your phone, or always use light or dark.',
    appearanceSystem: 'Match my phone',
    appearanceLight: 'Light',
    appearanceDark: 'Dark',
    exportTitle: 'My cash-flow planner data',
    exportMessage:
      'A copy of everything saved on this phone was offered to the share sheet. Keep it somewhere safe: it contains your financial details.',
    exportFailed: 'The copy could not be shared. Nothing was changed.',
    deleteMessage:
      'Deleting everything at once is not available yet. Delete items one by one on each page; earlier months are kept.',
  },

  env: { prefix: 'Environment' },
} as const;

function dueLabel(days: number): string {
  if (days <= 0) return 'due today';
  if (days === 1) return 'due tomorrow';
  return `due in ${days} days`;
}
