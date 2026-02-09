export enum View {
  DASHBOARD = 'dashboard',
  GOALS_CONFIG = 'goals_config',
  GOALS_HIERARCHY = 'goals_hierarchy',
  GOALS_HISTORY = 'goals_history',
  EXPENSE_CONFIG = 'expense_config',
  EXPENSE_ANALYSIS = 'expense_analysis',
}

export interface NavItem {
  id: View;
  label: string;
  icon: string;
}

export interface GoalHistoryItem {
  id: string;
  title: string;
  date: string;
  baseComparison: string;
  projectedGrowth: number;
  status: 'Rascunho' | 'Publicada' | 'Arquivada';
}

export interface HierarchyRow {
  id: string;
  branch: string;
  sector: string;
  department: string;
  section: string;
  salesMonthMinus2: number;
  salesMonthMinus1: number;
  salesRefMonth: number;
  growth: number;
  projectedGoal: number;
}
