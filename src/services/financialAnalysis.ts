import { Expense } from '@/hooks/useExpenses';

export interface FinancialInsights {
  totalExpenses: number;
  currentMonthExpenses: number;
  previousMonthExpenses: number;
  monthlyTrend: 'increasing' | 'decreasing' | 'stable';
  topCategories: Array<{ category: string; amount: number; percentage: number }>;
  currentMonthTopCategories: Array<{ category: string; amount: number; percentage: number }>;
  averageDailySpending: number;
  currentMonthDailyAverage: number;
  budgetUtilization: number;
  spendingPatterns: string[];
  recommendations: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export class FinancialAnalysisService {
  static analyzeExpenses(expenses: Expense[]): FinancialInsights {
    if (expenses.length === 0) {
      return {
        totalExpenses: 0,
        currentMonthExpenses: 0,
        previousMonthExpenses: 0,
        monthlyTrend: 'stable',
        topCategories: [],
        currentMonthTopCategories: [],
        averageDailySpending: 0,
        currentMonthDailyAverage: 0,
        budgetUtilization: 0,
        spendingPatterns: [],
        recommendations: ['Start tracking your expenses to get personalized insights!']
      };
    }

    // Calculate total expenses
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Get current month and previous month dates
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Filter expenses for current month
    const currentMonthExpenses = expenses.filter(expense => 
      new Date(expense.date) >= currentMonthStart
    );

    // Filter expenses for previous month
    const previousMonthExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= previousMonthStart && expenseDate <= previousMonthEnd;
    });

    // Calculate monthly totals
    const currentMonthTotal = currentMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const previousMonthTotal = previousMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Group by category for all expenses
    const categoryTotals = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    // Group by category for current month
    const currentMonthCategoryTotals = currentMonthExpenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    // Get top categories for all time
    const topCategories = Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: (amount / totalExpenses) * 100
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Get top categories for current month
    const currentMonthTopCategories = Object.entries(currentMonthCategoryTotals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: (amount / currentMonthTotal) * 100
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Calculate monthly trend
    let monthlyTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (previousMonthTotal > 0) {
      if (currentMonthTotal > previousMonthTotal * 1.1) monthlyTrend = 'increasing';
      else if (currentMonthTotal < previousMonthTotal * 0.9) monthlyTrend = 'decreasing';
    }

    // Calculate average daily spending
    const daysWithExpenses = new Set(expenses.map(expense => expense.date)).size;
    const averageDailySpending = daysWithExpenses > 0 ? totalExpenses / daysWithExpenses : 0;

    // Calculate current month daily average
    const currentMonthDays = Math.max(1, Math.ceil((now.getTime() - currentMonthStart.getTime()) / (1000 * 60 * 60 * 24)));
    const currentMonthDailyAverage = currentMonthTotal / currentMonthDays;

    // Generate spending patterns
    const spendingPatterns = this.generateSpendingPatterns(expenses, topCategories, currentMonthTotal, previousMonthTotal);

    // Generate recommendations
    const recommendations = this.generateRecommendations(expenses, topCategories, monthlyTrend, currentMonthTotal, previousMonthTotal);

    return {
      totalExpenses,
      currentMonthExpenses: currentMonthTotal,
      previousMonthExpenses: previousMonthTotal,
      monthlyTrend,
      topCategories,
      currentMonthTopCategories,
      averageDailySpending,
      currentMonthDailyAverage,
      budgetUtilization: 0, // This would need budget data
      spendingPatterns,
      recommendations
    };
  }

  private static generateSpendingPatterns(expenses: Expense[], topCategories: any[], currentMonthTotal: number, previousMonthTotal: number): string[] {
    const patterns: string[] = [];

    if (topCategories.length > 0) {
      patterns.push(`Your highest spending category is ${topCategories[0].category} (${topCategories[0].percentage.toFixed(1)}% of total expenses)`);
    }

    // Add monthly comparison
    if (previousMonthTotal > 0) {
      const change = ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100;
      if (change > 10) {
        patterns.push(`This month's spending is ${change.toFixed(1)}% higher than last month`);
      } else if (change < -10) {
        patterns.push(`This month's spending is ${Math.abs(change).toFixed(1)}% lower than last month`);
      } else {
        patterns.push('Your monthly spending is relatively stable compared to last month');
      }
    }

    // Check for weekend vs weekday spending
    const weekendExpenses = expenses.filter(expense => {
      const day = new Date(expense.date).getDay();
      return day === 0 || day === 6; // Sunday or Saturday
    });
    const weekendTotal = weekendExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const weekdayTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0) - weekendTotal;

    if (weekendTotal > weekdayTotal * 0.4) {
      patterns.push('You tend to spend more on weekends');
    }

    return patterns;
  }

  private static generateRecommendations(expenses: Expense[], topCategories: any[], monthlyTrend: string, currentMonthTotal: number, previousMonthTotal: number): string[] {
    const recommendations: string[] = [];

    if (monthlyTrend === 'increasing') {
      recommendations.push('Consider reviewing your spending habits as expenses are trending upward');
    } else if (monthlyTrend === 'decreasing') {
      recommendations.push('Great job! Your spending has decreased compared to last month');
    }

    if (topCategories.length > 0 && topCategories[0].percentage > 40) {
      recommendations.push(`Consider diversifying your spending - ${topCategories[0].category} represents a large portion of your expenses`);
    }

    if (expenses.length < 10) {
      recommendations.push('Track more expenses to get better insights and recommendations');
    }

    // Add monthly-specific recommendations
    if (currentMonthTotal > 0 && previousMonthTotal > 0) {
      const change = ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100;
      if (change > 20) {
        recommendations.push('Your spending has increased significantly this month - consider reviewing your budget');
      }
    }

    return recommendations;
  }

  static formatExpenseDataForAI(expenses: Expense[], insights: FinancialInsights): string {
    const now = new Date();
    const currentMonthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    const previousMonthName = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

    const expenseSummary = expenses.slice(0, 20).map(expense => 
      `${expense.date}: ${expense.category} - ₹${expense.amount}${expense.description ? ` (${expense.description})` : ''}`
    ).join('\n');

    return `
User's Financial Data Summary:

**Monthly Expenses:**
- Current Month (${currentMonthName}): ₹${insights.currentMonthExpenses.toLocaleString()}
- Previous Month (${previousMonthName}): ₹${insights.previousMonthExpenses.toLocaleString()}
- Monthly Trend: ${insights.monthlyTrend}
- Current Month Daily Average: ₹${insights.currentMonthDailyAverage.toFixed(2)}

**Overall Statistics:**
- Total Expenses (All Time): ₹${insights.totalExpenses.toLocaleString()}
- Average Daily Spending: ₹${insights.averageDailySpending.toFixed(2)}

**Current Month Top Categories:**
${insights.currentMonthTopCategories.map(c => `- ${c.category}: ₹${c.amount.toLocaleString()} (${c.percentage.toFixed(1)}%)`).join('\n')}

**All-Time Top Categories:**
${insights.topCategories.map(c => `- ${c.category}: ₹${c.amount.toLocaleString()} (${c.percentage.toFixed(1)}%)`).join('\n')}

**Recent Expenses:**
${expenseSummary}

${expenses.length > 20 ? `... and ${expenses.length - 20} more expenses` : ''}
`;
  }

  static formatRecommendationsForAI(insights: FinancialInsights): string {
    if (!insights.recommendations || insights.recommendations.length === 0) {
      return '**Recommendations:**\n• No personalized recommendations available yet.';
    }

    return `**Recommendations:**\n${insights.recommendations.map(rec => `• ${rec}`).join('\n')}`;
  }
}
