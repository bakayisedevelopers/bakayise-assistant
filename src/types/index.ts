export type IncomeType =
  | 'primary_salary'
  | 'spouse_salary'
  | 'freelance'
  | 'side_hustle'
  | 'bonus'
  | 'rental'
  | 'other';

export type CategoryGroup =
  | 'giving'
  | 'housing'
  | 'utilities'
  | 'food'
  | 'transport'
  | 'health_insurance'
  | 'debt_snowball'
  | 'savings_goals'
  | 'lifestyle'
  | 'personal';

export type UserRole = 'Hubby' | 'Wifey';

export type LoggedBy = 'Hubby' | 'Wifey' | 'Shared' | 'Husband' | 'Wife';

export interface EditAuditInfo {
  lastEditedBy?: string; // 'Hubby' | 'Wifey' | custom name
  lastEditedByEmail?: string; // 'jabuobed1@gmail.com' | 'lumzayopa@gmail.com'
  lastEditedAt?: string; // ISO 8601 Timestamp
  householdId?: string; // Standard household/workspace ID
  workspaceId?: string; // Explicit workspace ID
}

export type PeriodStatus = 'active' | 'planning' | 'completed' | 'archived';

export type AccountType =
  | 'cash'
  | 'cheque'
  | 'savings'
  | 'tax_free'
  | 'investment'
  | 'credit_card'
  | 'loan'
  | 'vehicle_loan'
  | 'home_loan'
  | 'other';

export interface FinancialAccount extends EditAuditInfo {
  id: string;
  name: string; // e.g. "Main Cheque", "Emergency 32-Day", "Discovery Platinum CC", "EasyEquities TFSA"
  type: AccountType;
  institution?: string; // e.g. "Capitec", "FNB", "Standard Bank", "Nedbank", "Discovery", "Investec", "TymeBank", "Absa", "WesBank", "MFC", "EasyEquities", "Allan Gray", "Cash", or custom
  accountNumberMask?: string; // e.g. "••• 4821"
  openingBalance: number; // For cash/cheque/savings/investments: positive capital. For credit cards/loans: opening balance owed.
  currentBalance?: number;
  currency?: string; // Default "ZAR"
  color?: string; // Badge accent color
  icon?: string;
  isDefault?: boolean;
  notes?: string;

  // Baby Step Assignment (Step 1, Step 3, Step 4, Step 5, Step 6, or null)
  babyStepAssignment?: number | null;
  babyStepAssignments?: number[]; // Allow multiple assignments (e.g. [1, 3])

  // Credit Card specific fields
  creditLimit?: number; // Total approved credit limit (e.g. R25,000)
  availableCredit?: number; // Credit available to spend (e.g. R7,000)
  balanceOwed?: number; // Outstanding amount borrowed / debt (e.g. R18,000)
  interestRate?: number; // Annual % interest (e.g. 21.75% for credit card, 10.5% for investment)
  monthlyFee?: number; // Monthly card / NCA service fee (can be 0.00)
  minimumPaymentPercentage?: number; // e.g. 3.0%
  minimumPaymentAmount?: number; // Calculated or custom monthly minimum payment (e.g. R624.00)

  // Investment & Tax-Free (TFSA) specific fields
  expectedAnnualReturn?: number; // Expected return / growth % p.a. (e.g. 11.5%)
  managementFeePercentage?: number; // TER / EAC management fee % p.a. (e.g. 0.45%)
  monthlyContribution?: number; // Regular monthly planned investment
  ytdContribution?: number; // For TFSA: contribution so far this tax year towards R36,000 limit
  lifetimeContribution?: number; // For TFSA: contribution towards R500,000 lifetime cap

  // Home Loan / Mortgage Bond specific fields
  purchasePrice?: number; // Original purchase price of the property (ZAR)
  marketValue?: number; // Estimated current market value if sold today (ZAR)
  totalTermYears?: number; // e.g. 20, 25, or 30 years
  remainingTermMonths?: number; // Total months left to payoff
  monthlyInstallment?: number; // Calculated monthly bond repayment
  manualMonthlyInstallment?: number; // Actual monthly debit order amount

  // Personal Loan / Debt specific fields
  originalLoanAmount?: number; // Original principal amount borrowed
  creditLifeInsurance?: number; // Monthly Credit Life Insurance (CLI) premium (ZAR)
  totalTermMonths?: number; // e.g. 36, 48, 60, 72 months

  // Vehicle Finance specific fields
  vehicleMakeModel?: string; // e.g. "2023 VW Polo 1.0 TSI", "Toyota Fortuner 2.8 GD-6"
  balloonPaymentPercentage?: number; // Balloon / residual percentage (e.g. 20% or 35%)
  balloonAmount?: number; // Balloon / residual settlement amount (ZAR)

  createdAt: string;
  updatedAt: string;
}

export interface BudgetPeriod extends EditAuditInfo {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  setupDueDate: string; // YYYY-MM-DD
  status: PeriodStatus;
  totalPlannedIncome: number;
  totalPlannedExpenses: number;
  openingFloatingBalance?: number; // Floating unspent cash carried over from previous pay cycle
  closingFloatingBalance?: number; // Calculated net floating cash remaining at end of cycle
  autoCarryoverFromPrevious?: boolean; // Default true: automatically carry over leftover cash from previous cycle
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Income extends EditAuditInfo {
  id: string;
  periodId: string;
  title: string;
  amount: number;
  baseAmount?: number; // Base planned/expected income (source of truth before transfers)
  availableBudgetAmount?: number; // Working budgeted amount available after transfers
  type: IncomeType;
  incomeClassification?: 'external_income' | 'internal_transfer' | 'debt_payment_deposit';
  isTransfer?: boolean;
  sourceTag?: string;
  accountId?: string; // Destination financial account
  sourceAccountId?: string; // Source financial account for transfers
  targetAccountId?: string; // Destination financial account (alias for clarity)
  transferType?: 'standard' | 'debt_payment' | 'internal_transfer';
  receivedDate?: string;
  status: 'expected' | 'received';
  order?: number; // Position in Excel list
  notes?: string;
  transferId?: string; // Link related transfer entries
  linkedExpenseId?: string; // Link to corresponding expense
  linkedDebtId?: string;
  debtPaymentType?: 'installment' | 'direct_deposit';
  principalReduction?: number;
  interestCharged?: number;
  feesCharged?: number;
  balanceBefore?: number; // Snapshot of account balance prior to receiving income
  balanceAfter?: number; // Snapshot of account balance immediately following receiving income
  accountBalanceAtTransactionTime?: number; // Balance at transaction time
  createdAt: string;
  updatedAt: string;
}

export interface BudgetCategory extends EditAuditInfo {
  id: string;
  periodId: string;
  name: string;
  group: CategoryGroup;
  tag?: string; // e.g. 'debt', 'bond', 'entertainment', 'food', 'transport', 'utilities'
  tags?: string[];
  allocatedAmount: number;
  defaultAccountId?: string; // Linked default financial account
  color?: string;
  icon?: string;
  order?: number; // Position in Excel list
  isEssential: boolean; // Essential expenses for 3-6 months emergency fund calculation
  isRecurring?: boolean; // Default true: for Baby Step 3 calculation
  createdAt: string;
  updatedAt: string;
}

export interface Expense extends EditAuditInfo {
  id: string;
  periodId: string;
  categoryId: string;
  amount: number;
  title: string;
  date: string; // YYYY-MM-DD
  loggedBy: LoggedBy;
  expenseClassification?: 'external_expense' | 'internal_transfer' | 'debt_payment';
  isTransfer?: boolean;
  accountId?: string; // Source financial account paid from
  paymentMethod?: string;
  notes?: string;
  receiptUrl?: string;
  transferId?: string; // Link related transfer entries
  sourceIncomeId?: string; // ID of the source income stream whose available budget was debited
  transferDeductedAmount?: number; // Amount deducted from the source income's available budget
  linkedDebtId?: string; // Optional: Link to a Debt snowball item to deduct balance
  targetAccountId?: string; // Optional: Destination account for internal transfers / card payoffs
  transferType?: 'standard' | 'debt_payment' | 'internal_transfer';
  debtPaymentType?: 'installment' | 'direct_deposit'; // 'installment' applies interest/fees amortization rules; 'direct_deposit' is 100% principal reduction
  principalReduction?: number; // Calculated amount reducing the principal balance
  interestCharged?: number; // Calculated interest portion of payment
  feesCharged?: number; // Calculated service fee portion of payment
  balanceBefore?: number; // Snapshot of account balance prior to transaction
  balanceAfter?: number; // Snapshot of account balance immediately following transaction
  accountBalanceAtTransactionTime?: number; // Balance at transaction time
  createdAt: string;
  updatedAt: string;
}

export type DebtCategory =
  | 'store_card'
  | 'credit_card'
  | 'personal_loan'
  | 'car_finance'
  | 'student_loan'
  | 'other';

export interface Debt extends EditAuditInfo {
  id: string;
  name: string;
  lender?: string;
  category: DebtCategory;
  balance: number;
  originalBalance: number;
  minimumPayment: number;
  interestRate: number; // Annual %
  monthlyFee?: number; // Monthly administrative or service fee (e.g. R69 or R0)
  linkedAccountId?: string;
  order?: number;
  status: 'active' | 'paid_off';
  paidOffDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BabyStepsState extends EditAuditInfo {
  id: string;
  currentStep: number; // 1 to 7
  step1EmergencyFundTarget: number; // Default R20,000 for South Africa
  step1CurrentBalance: number;
  step3MonthsTarget: number; // 3 or 6 months
  step3CurrentBalance: number;
  step4MonthlyInvestment: number;
  step5CollegeFundBalance: number;
  step6BondBalance: number;
  step6MonthlyExtra: number;
  step7GivingMonthly: number;
  notes?: string;
  updatedAt: string;
}

export interface EmergencyFundLog extends EditAuditInfo {
  id: string;
  step: 1 | 3;
  type: 'deposit' | 'withdrawal' | 'adjustment';
  amount: number;
  date: string;
  description: string;
  createdAt: string;
}

export interface PublicHoliday {
  date: string; // YYYY-MM-DD
  name: string;
  isObserved?: boolean;
}

export interface ArchivedWorksheet extends EditAuditInfo {
  id: string;
  title: string;
  archivedAt: string;
  archivedBy: string;
  archivedByEmail?: string;
  periodName?: string;
  householdId?: string;
  dataSnapshot: {
    periods: BudgetPeriod[];
    incomes: Income[];
    categories: BudgetCategory[];
    expenses: Expense[];
    debts?: Debt[];
    accounts?: FinancialAccount[];
    babyStepsState?: BabyStepsState | null;
    emergencyLogs?: EmergencyFundLog[];
  };
  notes?: string;
}

export interface Workspace extends EditAuditInfo {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  memberIds: string[];
  isPrivate?: boolean; // If true, only the owner can access. If false/undefined, all family members (Hubby/Wifey) can view and join.
  createdAt: string;
  updatedAt: string;
  userId?: string;
}

export interface UserProfile extends EditAuditInfo {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  householdId: string; // Deprecated or kept for compatibility
  activeWorkspaceId?: string;
  workspaceIds?: string[];
  defaultWorkspaceId?: string;
  linkedUserIds?: string[];
  avatarColor?: string;
  phoneNumber?: string;
  titleOrMotto?: string;
  bio?: string;
  themePreference?: 'dark' | 'light' | 'system';
  spouseLink?: SpouseLinkDoc;
  createdAt?: string;
  updatedAt?: string;
}

export interface SpouseLinkDoc {
  id: string; // [email1, email2].sort().join('__')
  requesterEmail: string;
  requesterName: string;
  requesterRole: 'Husband' | 'Wife';
  targetEmail: string;
  targetName?: string;
  targetRole: 'Husband' | 'Wife';
  status: 'pending' | 'connected' | 'declined';
  requestedAt: string;
  confirmedAt?: string;
  declinedAt?: string;
}

export interface AssistantApp {
  id: string; // e.g. 'budget', 'notes', 'meals', 'prayer'
  appName?: string;
  name?: string;
  appDescription?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  migrationStatus?: string;
  sourceProject?: string;
  icon?: string;
  category?: string;
  status?: 'active' | 'coming_soon' | 'in_development';
  route?: string;
  dataPath?: string;
  aiModel?: string;
  features?: string[];
}

export interface GlobalUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  avatarColor?: string;
  accessibleApps?: string[];
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type NoteType = 'book' | 'sermon' | 'bible_study' | 'normal' | 'general';
export type NoteInputMethod = 'manual' | 'camera_ocr' | 'mic_recording' | 'system_audio';

export interface BookProgress {
  currentPage?: number;
  totalPages?: number;
  chapter?: string;
  completed?: boolean;
}

export interface NoteItem {
  id: string;
  title: string;
  type: NoteType;
  sourceTitle?: string; // Book title, church name, series
  speakerOrAuthor?: string; // Pastor, author
  biblePassage?: string; // Scripture reference (e.g. Romans 8:28)
  date: string; // YYYY-MM-DD
  rawContent: string; // Transcribed text from pictures, audio, or manual entry
  summary: string; // Structured AI summary
  keyTakeaways: string[]; // Core takeaway bullet points
  quotesOrScriptures?: string[]; // Memorable quotes or cited verses
  actionPoints?: string[]; // Practical life applications / reflections
  tags: string[];
  inputMethod: NoteInputMethod;
  readingProgress?: BookProgress;
  workspaceId: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  modelUsed?: string; // 'kilo-auto/free'

  // Books: multiple chapter note entries belong to a book & chapter
  bookTitle?: string;
  chapter?: string;
  pageRange?: string;

  // Sermons: can belong to a sermon series or be standalone
  seriesName?: string;
  sermonTitle?: string;

  // Bible Study: belongs to a dynamic book of the Bible
  bibleBook?: string;
  bibleChapter?: string;

  // Normal Notes & future life categories (Vision for Family, Life goals, etc.)
  categoryName?: string;
}

export interface WeeklySummary {
  id: string;
  weekNumber: number;
  year: number;
  startDate: string;
  endDate: string;
  title: string;
  summary: string;
  notesCount: number;
  keyThemes: string[];
  scriptureHighlights?: string[];
  workspaceId: string;
  createdAt: string;
}

// -------------------------------------------------------------
// MEAL PLANNER TYPES
// -------------------------------------------------------------

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert';

export type DietaryPreference =
  | 'balanced'
  | 'high_protein'
  | 'low_carb'
  | 'keto'
  | 'vegetarian'
  | 'vegan'
  | 'halal'
  | 'kosher'
  | 'gluten_free'
  | 'dairy_free'
  | 'budget_friendly'
  | 'quick_prep';

export type PantryCategory =
  | 'produce'
  | 'meat_protein'
  | 'dairy_eggs'
  | 'grains_pantry'
  | 'spices_sauces'
  | 'frozen'
  | 'beverages'
  | 'other';

export interface MealIngredient {
  id: string;
  name: string;
  amount: string | number;
  unit: string;
  category?: PantryCategory | string;
  inPantry?: boolean;
}

export interface MealNutrition {
  calories?: number;
  protein?: number; // grams
  carbs?: number; // grams
  fats?: number; // grams
}

export interface MealItem {
  id: string;
  title: string;
  description: string;
  type: MealType;
  cuisine?: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  estimatedCostZAR?: number;
  ingredients: MealIngredient[];
  instructions: string[];
  nutrition?: MealNutrition;
  tags: string[];
  isFavorite?: boolean;
  source?: 'ai_suggested' | 'family_recipe' | 'custom';
  whySuggested?: string;
  pantryMatchPercentage?: number;
  imageOrEmoji?: string;
  workspaceId: string;
  authorId?: string;
  authorName?: string;
  createdAt: string;
  updatedAt: string;
}

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface MealPlanSlot {
  id: string;
  dayOfWeek: DayOfWeek;
  date?: string; // YYYY-MM-DD
  type: MealType;
  mealId?: string;
  mealTitle?: string;
  meal?: MealItem;
  notes?: string;
}

export interface MealPlan {
  id: string;
  weekStartDate: string; // YYYY-MM-DD
  title: string;
  slots: MealPlanSlot[];
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PantryItem {
  id: string;
  name: string;
  category: PantryCategory;
  quantity: number;
  unit: string;
  inStock: boolean;
  expiryDate?: string;
  notes?: string;
  workspaceId: string;
  updatedAt: string;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  category: string;
  quantity: string | number;
  unit: string;
  checked: boolean;
  estimatedPriceZAR?: number;
  sourceMealTitle?: string;
  workspaceId: string;
  createdAt: string;
}

export interface FamilyMealPreferences {
  id: string;
  householdMembersCount: number;
  dietaryGoals: DietaryPreference[];
  allergiesAndDislikes: string[];
  favoriteIngredients: string[];
  maxPrepTimeMinutes: number;
  weeklyFoodBudgetZAR?: number;
  cuisinePreferences: string[];
  workspaceId: string;
  updatedAt: string;
}

// -------------------------------------------------------------
// PRAYER JOURNAL TYPES
// -------------------------------------------------------------

export type PrayerRelationship =
  | 'Myself'
  | 'Husband'
  | 'Wife'
  | 'Spouse'
  | 'Son'
  | 'Daughter'
  | 'Children'
  | 'Spiritual Son'
  | 'Spiritual Daughter'
  | 'Father'
  | 'Mother'
  | 'Spiritual Father'
  | 'Spiritual Mother'
  | 'Parents'
  | 'Brother'
  | 'Sister'
  | 'Brother-in-law'
  | 'Sister-in-law'
  | 'Mother-in-law'
  | 'Father-in-law'
  | 'Family'
  | 'Pastor'
  | 'Brother in Christ'
  | 'Sister in Christ'
  | 'Church & Ministry'
  | 'Friend'
  | 'Work & Colleagues'
  | 'Community'
  | 'Other';

export interface PrayerPerson {
  id: string;
  name: string;
  isMyself: boolean;
  relationship: PrayerRelationship;
  customRelationship?: string; // If 'Other' or custom family/sub-category (e.g. Cousin, Aunt, Mentee)
  notes?: string;
  avatarColor?: string;
  userId: string;
  authorEmail?: string;
  authorName?: string;
  sharedWithUserIds?: string[];
  sharedWithEmails?: string[];
  isPrivate?: boolean;
  linkedSpouseEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export type PrayerStatus =
  | 'open'           // Still praying / ongoing
  | 'answered_yes'   // God answered Yes
  | 'answered_no'    // God answered No
  | 'delayed'        // Wait / in God's timing
  | 'closed';        // Concluded / answered

export interface PrayerScripture {
  id: string;
  reference: string; // e.g. "Philippians 4:6-7"
  text: string;      // Verse content
  translation?: string; // e.g. "WEB", "KJV", "NIV"
  book?: string;
  chapter?: number;
  verse?: string;
}

export interface PrayerSessionLog {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO 8601
  promptingNotes?: string; // What the Lord is prompting you to do
  prayedBy?: string;
  prayedByEmail?: string;
  prayedByRole?: string;
  sessionNotes?: string;
}

export interface PrayerRequestItem {
  id: string;
  personId: string;
  personName?: string;
  /** All people this prayer is about. Legacy requests fall back to personId. */
  personIds?: string[];
  userId: string;
  authorEmail?: string;
  authorName?: string;
  sharedWithUserIds?: string[];
  sharedWithEmails?: string[];
  isPrivate?: boolean;
  title: string;
  details?: string;
  status: PrayerStatus;
  scriptures: PrayerScripture[];
  prayerSessions: PrayerSessionLog[];
  prayersCount: number;
  lastPrayedAt?: string;
  lastPrayedBy?: string;
  lastPrayedByEmail?: string;
  lastPrayedByRole?: string;
  notes?: string;
  dateAnswered?: string;
  answerTestimony?: string;
  createdAt: string;
  updatedAt: string;
}


