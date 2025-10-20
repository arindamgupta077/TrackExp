import { Expense } from '@/hooks/useExpenses';

export interface MonthlyExpenseData {
  month: string;
  year: number;
  totalAmount: number;
  transactionCount: number;
  categories: Array<{
    category: string;
    amount: number;
    percentage: number;
    transactionCount: number;
  }>;
  dailyBreakdown: Array<{
    date: string;
    amount: number;
    transactionCount: number;
  }>;
  topExpenses: Array<{
    id: string;
    category: string;
    amount: number;
    description: string;
    date: string;
  }>;
}

export interface ExpenseAnalysisResult {
  requestedMonth: string;
  requestedYear: number;
  found: boolean;
  data?: MonthlyExpenseData;
  message: string;
}

export interface CategoryMonthlyAnalysis {
  category: string;
  totalAmount: number;
  percentageOfMonth: number;
  transactionCount: number;
  averageTransaction: number;
  dailyBreakdown: Array<{
    date: string;
    amount: number;
    transactionCount: number;
  }>;
  topExpenses: Array<{
    id: string;
    amount: number;
    description: string;
    date: string;
  }>;
}

export interface CategoryMonthlyAnalysisResult {
  requestedMonth: string;
  requestedYear: number;
  category: string;
  found: boolean;
  message: string;
  data?: CategoryMonthlyAnalysis;
}

export interface RollingTrendPoint {
  month: string;
  monthNumber: number;
  year: number;
  totalAmount: number;
  transactionCount: number;
}

export interface RollingTrendData {
  trend: RollingTrendPoint[];
  averageChange: number;
  direction: 'upward' | 'downward' | 'stable';
  forecast?: {
    month: string;
    year: number;
    projectedTotal: number;
    confidence: 'low' | 'medium' | 'high';
    rationale: string;
  };
}

export interface CategoryAllMonthsAnalysis {
  category: string;
  totalAmount: number;
  transactionCount: number;
  overallShare: number;
  averageTransaction: number;
  monthsCovered: number;
  monthlyBreakdown: Array<{
    month: number;
    year: number;
    monthName: string;
    totalAmount: number;
    transactionCount: number;
    percentageOfCategory: number;
  }>;
}

export interface CategoryAllMonthsAnalysisResult {
  category: string;
  found: boolean;
  message: string;
  data?: CategoryAllMonthsAnalysis;
}

export interface MonthlyComparisonResult {
  month1: { month: string; year: number; data?: MonthlyExpenseData };
  month2: { month: string; year: number; data?: MonthlyExpenseData };
  comparison: {
    totalDifference: number;
    percentageChange: number;
    categoryComparisons: Array<{
      category: string;
      month1Amount: number;
      month2Amount: number;
      difference: number;
      percentageChange: number;
    }>;
    transactionCountDifference: number;
    averageTransactionDifference: number;
  };
  found: boolean;
  message: string;
}

export class ExpenseAnalysisService {
  /**
   * Analyze expenses for a specific month and year
   */
  static analyzeMonthlyExpenses(
    expenses: Expense[], 
    month: number, 
    year: number
  ): ExpenseAnalysisResult {
    // Validate inputs
    if (month < 1 || month > 12) {
      return {
        requestedMonth: this.getMonthName(month),
        requestedYear: year,
        found: false,
        message: `Invalid month: ${month}. Please provide a month between 1-12.`
      };
    }

    if (year < 2000 || year > 2100) {
      return {
        requestedMonth: this.getMonthName(month),
        requestedYear: year,
        found: false,
        message: `Invalid year: ${year}. Please provide a valid year.`
      };
    }

    // Filter expenses for the specific month and year
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999); // Last day of the month

    const monthlyExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= monthStart && expenseDate <= monthEnd;
    });

    if (monthlyExpenses.length === 0) {
      return {
        requestedMonth: this.getMonthName(month),
        requestedYear: year,
        found: false,
        message: `No expenses found for ${this.getMonthName(month)} ${year}.`
      };
    }

    // Calculate total amount
    const totalAmount = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Group by category
    const categoryMap = new Map<string, { amount: number; count: number }>();
    monthlyExpenses.forEach(expense => {
      const existing = categoryMap.get(expense.category) || { amount: 0, count: 0 };
      categoryMap.set(expense.category, {
        amount: existing.amount + expense.amount,
        count: existing.count + 1
      });
    });

    // Convert to array and calculate percentages
    const categories = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        percentage: (data.amount / totalAmount) * 100,
        transactionCount: data.count
      }))
      .sort((a, b) => b.amount - a.amount);

    // Group by day for daily breakdown
    const dailyMap = new Map<string, { amount: number; count: number }>();
    monthlyExpenses.forEach(expense => {
      const date = expense.date.split('T')[0]; // Get YYYY-MM-DD part
      const existing = dailyMap.get(date) || { amount: 0, count: 0 };
      dailyMap.set(date, {
        amount: existing.amount + expense.amount,
        count: existing.count + 1
      });
    });

    // Convert to array and sort by date
    const dailyBreakdown = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        amount: data.amount,
        transactionCount: data.count
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Get top 5 expenses by amount
    const topExpenses = monthlyExpenses
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map(expense => ({
        id: expense.id,
        category: expense.category,
        amount: expense.amount,
        description: expense.description,
        date: expense.date
      }));

    const monthlyData: MonthlyExpenseData = {
      month: this.getMonthName(month),
      year,
      totalAmount,
      transactionCount: monthlyExpenses.length,
      categories,
      dailyBreakdown,
      topExpenses
    };

    return {
      requestedMonth: this.getMonthName(month),
      requestedYear: year,
      found: true,
      data: monthlyData,
      message: `Successfully analyzed ${monthlyExpenses.length} expenses for ${this.getMonthName(month)} ${year}.`
    };
  }

  /**
   * Calculate total expenses for a specific month and year
   */
  static calculateMonthlyTotal(
    expenses: Expense[], 
    month: number, 
    year: number
  ): { total: number; count: number; found: boolean; message: string } {
    const analysis = this.analyzeMonthlyExpenses(expenses, month, year);
    
    if (!analysis.found || !analysis.data) {
      return {
        total: 0,
        count: 0,
        found: false,
        message: analysis.message
      };
    }

    return {
      total: analysis.data.totalAmount,
      count: analysis.data.transactionCount,
      found: true,
      message: `Total expenses for ${analysis.requestedMonth} ${year}: ₹${analysis.data.totalAmount.toLocaleString()} (${analysis.data.transactionCount} transactions)`
    };
  }

  /**
   * Get expenses for a specific month and year (simple list)
   */
  static getMonthlyExpenses(
    expenses: Expense[], 
    month: number, 
    year: number
  ): Expense[] {
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= monthStart && expenseDate <= monthEnd;
    });
  }

  /**
   * Parse month and year from various input formats
   */
  static parseMonthYear(input: string): { month: number; year: number; success: boolean; message: string } {
    const lowerInput = input.toLowerCase().trim();
    
    // Try to extract year first
    const yearMatch = lowerInput.match(/\b(20\d{2})\b/);
    if (!yearMatch) {
      return {
        month: 0,
        year: 0,
        success: false,
        message: "Could not find a valid year (2000-2099) in your request."
      };
    }
    
    const year = parseInt(yearMatch[1]);
    
    // Try different month formats
    const monthPatterns = [
      // Month names
      { pattern: /\b(january|jan)\b/, month: 1 },
      { pattern: /\b(february|feb)\b/, month: 2 },
      { pattern: /\b(march|mar)\b/, month: 3 },
      { pattern: /\b(april|apr)\b/, month: 4 },
      { pattern: /\b(may)\b/, month: 5 },
      { pattern: /\b(june|jun)\b/, month: 6 },
      { pattern: /\b(july|jul)\b/, month: 7 },
      { pattern: /\b(august|aug)\b/, month: 8 },
      { pattern: /\b(september|sep|sept)\b/, month: 9 },
      { pattern: /\b(october|oct)\b/, month: 10 },
      { pattern: /\b(november|nov)\b/, month: 11 },
      { pattern: /\b(december|dec)\b/, month: 12 },
      // Month numbers
      { pattern: /\b(0?[1-9]|1[0-2])\b/, month: null } // Will extract number
    ];
    
    for (const { pattern, month: monthValue } of monthPatterns) {
      const match = lowerInput.match(pattern);
      if (match) {
        if (monthValue !== null) {
          return {
            month: monthValue,
            year,
            success: true,
            message: `Parsed: ${this.getMonthName(monthValue)} ${year}`
          };
        } else {
          // Extract the number
          const monthNum = parseInt(match[1]);
          if (monthNum >= 1 && monthNum <= 12) {
            return {
              month: monthNum,
              year,
              success: true,
              message: `Parsed: ${this.getMonthName(monthNum)} ${year}`
            };
          }
        }
      }
    }
    
    return {
      month: 0,
      year,
      success: false,
      message: `Found year ${year} but could not identify the month. Please specify the month name or number (1-12).`
    };
  }

  /**
   * Format monthly expense data for AI consumption
   */
  static formatMonthlyDataForAI(analysis: ExpenseAnalysisResult): string {
    if (!analysis.found || !analysis.data) {
      return `No expense data found for ${analysis.requestedMonth} ${analysis.requestedYear}.`;
    }

    const data = analysis.data;
    const categoryBreakdown = data.categories
      .map(cat => `  • ${cat.category}: ₹${cat.amount.toLocaleString()} (${cat.percentage.toFixed(1)}%, ${cat.transactionCount} transactions)`)
      .join('\n');

    const topExpensesList = data.topExpenses
      .map(expense => `  • ${expense.date.split('T')[0]}: ${expense.category} - ₹${expense.amount.toLocaleString()}${expense.description ? ` (${expense.description})` : ''}`)
      .join('\n');

    const dailySummary = data.dailyBreakdown.length > 0 
      ? `\n**Daily Breakdown:**\n${data.dailyBreakdown.slice(0, 10).map(day => `  • ${day.date}: ₹${day.amount.toLocaleString()} (${day.transactionCount} transactions)`).join('\n')}${data.dailyBreakdown.length > 10 ? `\n  ... and ${data.dailyBreakdown.length - 10} more days` : ''}`
      : '';

    return `
**${data.month} ${data.year} Expense Analysis:**

**Summary:**
• Total Amount: ₹${data.totalAmount.toLocaleString()}
• Total Transactions: ${data.transactionCount}
• Average per Transaction: ₹${(data.totalAmount / data.transactionCount).toFixed(2)}

**Category Breakdown:**
${categoryBreakdown}

**Top 5 Largest Expenses:**
${topExpensesList}${dailySummary}

**Analysis Notes:**
• This represents ${data.categories.length} different expense categories
• Most active spending day: ${data.dailyBreakdown.length > 0 ? data.dailyBreakdown.reduce((max, day) => day.amount > max.amount ? day : max, data.dailyBreakdown[0]).date : 'N/A'}
• Highest spending category: ${data.categories[0]?.category || 'N/A'} (${data.categories[0]?.percentage.toFixed(1)}% of total)
`;
  }

  /**
   * Helper function to get month name from number
   */
  private static getMonthName(month: number): string {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return monthNames[month - 1] || 'Invalid Month';
  }

  /**
   * Compare expenses between two months
   */
  static compareMonthlyExpenses(
    expenses: Expense[],
    month1: number,
    year1: number,
    month2: number,
    year2: number
  ): MonthlyComparisonResult {
    // Analyze both months
    const analysis1 = this.analyzeMonthlyExpenses(expenses, month1, year1);
    const analysis2 = this.analyzeMonthlyExpenses(expenses, month2, year2);

    const month1Name = this.getMonthName(month1);
    const month2Name = this.getMonthName(month2);

    // Check if both months have data
    if (!analysis1.found || !analysis2.found) {
      const missingMonths = [];
      if (!analysis1.found) missingMonths.push(`${month1Name} ${year1}`);
      if (!analysis2.found) missingMonths.push(`${month2Name} ${year2}`);
      
      return {
        month1: { month: month1Name, year: year1, data: analysis1.data },
        month2: { month: month2Name, year: year2, data: analysis2.data },
        comparison: {
          totalDifference: 0,
          percentageChange: 0,
          categoryComparisons: [],
          transactionCountDifference: 0,
          averageTransactionDifference: 0
        },
        found: false,
        message: `Cannot compare: No data found for ${missingMonths.join(' and ')}.`
      };
    }

    const data1 = analysis1.data!;
    const data2 = analysis2.data!;

    // Calculate total differences
    const totalDifference = data2.totalAmount - data1.totalAmount;
    const percentageChange = data1.totalAmount > 0 
      ? (totalDifference / data1.totalAmount) * 100 
      : 0;

    // Calculate transaction count differences
    const transactionCountDifference = data2.transactionCount - data1.transactionCount;
    const averageTransactionDifference = data2.totalAmount / data2.transactionCount - data1.totalAmount / data1.transactionCount;

    // Compare categories
    const allCategories = new Set([
      ...data1.categories.map(c => c.category),
      ...data2.categories.map(c => c.category)
    ]);

    const categoryComparisons = Array.from(allCategories).map(category => {
      const cat1 = data1.categories.find(c => c.category === category);
      const cat2 = data2.categories.find(c => c.category === category);
      
      const month1Amount = cat1?.amount || 0;
      const month2Amount = cat2?.amount || 0;
      const difference = month2Amount - month1Amount;
      const percentageChange = month1Amount > 0 
        ? (difference / month1Amount) * 100 
        : 0;

      return {
        category,
        month1Amount,
        month2Amount,
        difference,
        percentageChange
      };
    }).sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));

    return {
      month1: { month: month1Name, year: year1, data: data1 },
      month2: { month: month2Name, year: year2, data: data2 },
      comparison: {
        totalDifference,
        percentageChange,
        categoryComparisons,
        transactionCountDifference,
        averageTransactionDifference
      },
      found: true,
      message: `Successfully compared ${month1Name} ${year1} and ${month2Name} ${year2}.`
    };
  }

  /**
   * Parse two months and years from comparison queries
   */
  static parseComparisonQuery(input: string): {
    month1: number; year1: number; month2: number; year2: number;
    success: boolean; message: string;
  } {
    const lowerInput = input.toLowerCase().trim();
    
    // Look for comparison keywords
    const comparisonKeywords = ['compare', 'comparison', 'vs', 'versus', 'and', 'between'];
    const hasComparisonKeyword = comparisonKeywords.some(keyword => lowerInput.includes(keyword));
    
    if (!hasComparisonKeyword) {
      return {
        month1: 0, year1: 0, month2: 0, year2: 0,
        success: false,
        message: "Could not identify this as a comparison query. Please use words like 'compare', 'vs', or 'between'."
      };
    }

    // Extract all years
    const yearMatches = lowerInput.match(/\b(20\d{2})\b/g);
    if (!yearMatches || yearMatches.length < 1) {
      return {
        month1: 0, year1: 0, month2: 0, year2: 0,
        success: false,
        message: "Could not find valid years (2000-2099) in your request."
      };
    }

    const year1 = parseInt(yearMatches[0]);
    const year2 = yearMatches.length > 1 ? parseInt(yearMatches[1]) : year1;

    // Extract months
    const monthPatterns = [
      { pattern: /\b(january|jan)\b/, month: 1 },
      { pattern: /\b(february|feb)\b/, month: 2 },
      { pattern: /\b(march|mar)\b/, month: 3 },
      { pattern: /\b(april|apr)\b/, month: 4 },
      { pattern: /\b(may)\b/, month: 5 },
      { pattern: /\b(june|jun)\b/, month: 6 },
      { pattern: /\b(july|jul)\b/, month: 7 },
      { pattern: /\b(august|aug)\b/, month: 8 },
      { pattern: /\b(september|sep|sept)\b/, month: 9 },
      { pattern: /\b(october|oct)\b/, month: 10 },
      { pattern: /\b(november|nov)\b/, month: 11 },
      { pattern: /\b(december|dec)\b/, month: 12 }
    ];

    const foundMonths: number[] = [];
    
    for (const { pattern, month } of monthPatterns) {
      const match = lowerInput.match(pattern);
      if (match) {
        foundMonths.push(month);
      }
    }

    if (foundMonths.length < 2) {
      return {
        month1: 0, year1: 0, month2: 0, year2: 0,
        success: false,
        message: `Found ${foundMonths.length} month(s) but need 2 months for comparison. Please specify both months clearly.`
      };
    }

    return {
      month1: foundMonths[0],
      year1,
      month2: foundMonths[1],
      year2,
      success: true,
      message: `Parsed comparison: ${this.getMonthName(foundMonths[0])} ${year1} vs ${this.getMonthName(foundMonths[1])} ${year2}`
    };
  }

  /**
   * Format monthly comparison data for AI consumption
   */
  static formatComparisonDataForAI(comparison: MonthlyComparisonResult): string {
    if (!comparison.found) {
      return `**Comparison Failed**\n\n${comparison.message}`;
    }

    const { month1, month2, comparison: comp } = comparison;
    const data1 = month1.data!;
    const data2 = month2.data!;

    const totalChange = comp.percentageChange > 0 ? 'increased' : 'decreased';
    const totalChangeIcon = comp.percentageChange > 0 ? '📈' : comp.percentageChange < 0 ? '📉' : '➡️';

    const categoryChanges = comp.categoryComparisons
      .filter(cat => cat.month1Amount > 0 || cat.month2Amount > 0)
      .slice(0, 8)
      .map(cat => {
        const changeIcon = cat.percentageChange > 0 ? '📈' : cat.percentageChange < 0 ? '📉' : '➡️';
        const changeText = cat.percentageChange > 0 ? 'increased' : cat.percentageChange < 0 ? 'decreased' : 'unchanged';
        return `  ${changeIcon} **${cat.category}**: ₹${cat.month1Amount.toLocaleString()} → ₹${cat.month2Amount.toLocaleString()} (${changeText} by ${Math.abs(cat.percentageChange).toFixed(1)}%)`;
      })
      .join('\n');

    return `
**${month1.month} ${month1.year} vs ${month2.month} ${month2.year} Comparison**

**Overall Summary:**
${totalChangeIcon} **Total Spending**: ₹${data1.totalAmount.toLocaleString()} → ₹${data2.totalAmount.toLocaleString()}
• **Change**: ₹${comp.totalDifference.toLocaleString()} (${totalChange} by ${Math.abs(comp.percentageChange).toFixed(1)}%)
• **Transactions**: ${data1.transactionCount} → ${data2.transactionCount} (${comp.transactionCountDifference > 0 ? '+' : ''}${comp.transactionCountDifference})
• **Average per Transaction**: ₹${(data1.totalAmount / data1.transactionCount).toFixed(2)} → ₹${(data2.totalAmount / data2.transactionCount).toFixed(2)}

**Monthly Breakdowns:**

**${month1.month} ${month1.year}:**
• Total: ₹${data1.totalAmount.toLocaleString()}
• Transactions: ${data1.transactionCount}
• Top Category: ${data1.categories[0]?.category || 'N/A'} (${data1.categories[0]?.percentage.toFixed(1)}%)

**${month2.month} ${month2.year}:**
• Total: ₹${data2.totalAmount.toLocaleString()}
• Transactions: ${data2.transactionCount}
• Top Category: ${data2.categories[0]?.category || 'N/A'} (${data2.categories[0]?.percentage.toFixed(1)}%)

**Category Changes:**
${categoryChanges}

**Key Insights:**
• ${comp.percentageChange > 0 ? 'Spending increased' : comp.percentageChange < 0 ? 'Spending decreased' : 'Spending remained stable'} between the two months
• ${comp.transactionCountDifference > 0 ? 'More transactions' : comp.transactionCountDifference < 0 ? 'Fewer transactions' : 'Same number of transactions'} in ${month2.month}
• ${comp.averageTransactionDifference > 0 ? 'Higher average transaction value' : comp.averageTransactionDifference < 0 ? 'Lower average transaction value' : 'Similar average transaction value'} in ${month2.month}
`;
  }

  static analyzeCategoryMonthlyExpenses(
    expenses: Expense[],
    month: number,
    year: number,
    category: string
  ): CategoryMonthlyAnalysisResult {
    const baseAnalysis = this.analyzeMonthlyExpenses(expenses, month, year);
    const requestedMonth = this.getMonthName(month);

    if (!baseAnalysis.found || !baseAnalysis.data) {
      return {
        requestedMonth,
        requestedYear: year,
        category,
        found: false,
        message: baseAnalysis.message
      };
    }

    const normalizedCategory = category.trim().toLowerCase();
    const monthlyExpenses = this.getMonthlyExpenses(expenses, month, year);
    const categoryExpenses = monthlyExpenses.filter(expense => expense.category.trim().toLowerCase() === normalizedCategory);

    if (categoryExpenses.length === 0) {
      return {
        requestedMonth,
        requestedYear: year,
        category,
        found: false,
        message: `No expenses found for ${category} in ${requestedMonth} ${year}.`
      };
    }

    const actualCategory = baseAnalysis.data.categories.find(cat => cat.category.trim().toLowerCase() === normalizedCategory)?.category || categoryExpenses[0].category;
    const categoryTotal = categoryExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const percentage = baseAnalysis.data.totalAmount > 0 ? (categoryTotal / baseAnalysis.data.totalAmount) * 100 : 0;
    const averageTransaction = categoryTotal / categoryExpenses.length;

    const dailyMap = new Map<string, { amount: number; count: number }>();
    categoryExpenses.forEach(expense => {
      const date = expense.date.split('T')[0];
      const existing = dailyMap.get(date) || { amount: 0, count: 0 };
      dailyMap.set(date, {
        amount: existing.amount + expense.amount,
        count: existing.count + 1
      });
    });

    const dailyBreakdown = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        amount: data.amount,
        transactionCount: data.count
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const topExpenses = categoryExpenses
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map(expense => ({
        id: expense.id,
        amount: expense.amount,
        description: expense.description,
        date: expense.date
      }));

    return {
      requestedMonth,
      requestedYear: year,
      category: actualCategory,
      found: true,
      message: `Analyzed ${categoryExpenses.length} ${actualCategory} expenses for ${requestedMonth} ${year}.`,
      data: {
        category: actualCategory,
        totalAmount: categoryTotal,
        percentageOfMonth: percentage,
        transactionCount: categoryExpenses.length,
        averageTransaction,
        dailyBreakdown,
        topExpenses
      }
    };
  }

  static formatCategoryMonthlyDataForAI(
    monthlyAnalysis: ExpenseAnalysisResult,
    categoryAnalysis: CategoryMonthlyAnalysisResult
  ): string {
    if (!monthlyAnalysis.found || !monthlyAnalysis.data) {
      return `No monthly data available for ${monthlyAnalysis.requestedMonth} ${monthlyAnalysis.requestedYear}.`;
    }

    if (!categoryAnalysis.found || !categoryAnalysis.data) {
      return `**${categoryAnalysis.category} in ${categoryAnalysis.requestedMonth} ${categoryAnalysis.requestedYear}:**\n\n${categoryAnalysis.message}`;
    }

    const monthData = monthlyAnalysis.data;
    const categoryData = categoryAnalysis.data;

    const dailySection = categoryData.dailyBreakdown.length > 0
      ? `\n**${categoryData.category} Daily Activity:**\n${categoryData.dailyBreakdown.slice(0, 10).map(day => `  • ${day.date}: ₹${day.amount.toLocaleString()} (${day.transactionCount} transactions)`).join('\n')}${categoryData.dailyBreakdown.length > 10 ? `\n  ... and ${categoryData.dailyBreakdown.length - 10} more days` : ''}`
      : '';

    const topExpensesList = categoryData.topExpenses.length > 0
      ? `\n**Highest ${categoryData.category} Expenses:**\n${categoryData.topExpenses.map(expense => `  • ${expense.date.split('T')[0]} - ₹${expense.amount.toLocaleString()}${expense.description ? ` (${expense.description})` : ''}`).join('\n')}`
      : '';

    return `
**${monthData.month} ${monthData.year} – ${categoryData.category} Focus:**

**Category Summary:**
• Total Spent: ₹${categoryData.totalAmount.toLocaleString()}
• Share of Monthly Spend: ${categoryData.percentageOfMonth.toFixed(1)}%
• Transactions: ${categoryData.transactionCount}
• Average Transaction: ₹${categoryData.averageTransaction.toFixed(2)}

**Month Context:**
• Monthly Total: ₹${monthData.totalAmount.toLocaleString()}
• Overall Transactions: ${monthData.transactionCount}
• Top Category Overall: ${monthData.categories[0]?.category || 'N/A'} (${monthData.categories[0]?.percentage.toFixed(1)}%)${dailySection}${topExpensesList}
`;
  }

  static getRollingTrend(expenses: Expense[], windowSize = 3): RollingTrendData {
    const availableMonths = this.getAvailableMonths(expenses);
    if (availableMonths.length === 0) {
      return {
        trend: [],
        averageChange: 0,
        direction: 'stable'
      };
    }

    const selectedMonths = availableMonths.slice(0, windowSize).reverse();
    const trend = selectedMonths.map(data => ({
      month: data.monthName,
      monthNumber: data.month,
      year: data.year,
      totalAmount: data.total,
      transactionCount: data.count
    }));

    const changes: number[] = [];
    for (let i = 1; i < trend.length; i += 1) {
      changes.push(trend[i].totalAmount - trend[i - 1].totalAmount);
    }

    const averageChange = changes.length > 0
      ? changes.reduce((sum, change) => sum + change, 0) / changes.length
      : 0;

    let direction: 'upward' | 'downward' | 'stable' = 'stable';
    if (averageChange > 0) direction = 'upward';
    else if (averageChange < 0) direction = 'downward';

    let confidence: 'low' | 'medium' | 'high' = 'low';
    if (changes.length === 1) {
      confidence = 'medium';
    } else if (changes.length >= 2) {
      const meanChange = averageChange;
      const variance = changes.reduce((sum, change) => sum + Math.pow(change - meanChange, 2), 0) / changes.length;
      const stdDeviation = Math.sqrt(variance);
      const normalizedVolatility = Math.abs(meanChange) > 0 ? stdDeviation / Math.abs(meanChange) : stdDeviation;
      if (normalizedVolatility <= 0.3) confidence = 'high';
      else if (normalizedVolatility <= 0.7) confidence = 'medium';
      else confidence = 'low';
    }

    const latestMonth = availableMonths[0];
    const nextMonthNumber = latestMonth.month === 12 ? 1 : latestMonth.month + 1;
    const nextYear = latestMonth.month === 12 ? latestMonth.year + 1 : latestMonth.year;
    const nextMonthName = this.getMonthName(nextMonthNumber);
    const lastTotal = trend.length > 0 ? trend[trend.length - 1].totalAmount : 0;
    const projectedTotal = Math.max(0, lastTotal + averageChange);

    return {
      trend,
      averageChange,
      direction,
      forecast: {
        month: nextMonthName,
        year: nextYear,
        projectedTotal,
        confidence,
        rationale: `Based on ${trend.length} month trend showing ${direction === 'stable' ? 'a stable pattern' : `${direction} movement`}.`
      }
    };
  }

  static formatRollingTrendForAI(rollingTrend: RollingTrendData): string {
    if (rollingTrend.trend.length === 0) {
      return '**Rolling 3-Month Trend:**\n• Not enough historical data to compute a trend yet.';
    }

    const trendLines = rollingTrend.trend
      .map(point => `• ${point.month} ${point.year}: ₹${point.totalAmount.toLocaleString()} (${point.transactionCount} transactions)`)
      .join('\n');

    const averageChangeText = `• Average Change: ₹${rollingTrend.averageChange.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    const directionText = `• Direction: ${rollingTrend.direction.charAt(0).toUpperCase()}${rollingTrend.direction.slice(1)}`;

    const forecastText = rollingTrend.forecast
      ? `\n**Forecast:**\n• Next Month (${rollingTrend.forecast.month} ${rollingTrend.forecast.year}) Projection: ₹${rollingTrend.forecast.projectedTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}\n• Confidence: ${rollingTrend.forecast.confidence.charAt(0).toUpperCase()}${rollingTrend.forecast.confidence.slice(1)}\n• Notes: ${rollingTrend.forecast.rationale}`
      : '';

    return `**Rolling 3-Month Trend:**\n${trendLines}\n${averageChangeText}\n${directionText}${forecastText}`;
  }

  static analyzeCategoryAcrossAllMonths(expenses: Expense[], category: string): CategoryAllMonthsAnalysisResult {
    if (!category.trim()) {
      return {
        category,
        found: false,
        message: 'Please provide a valid category name to analyze.'
      };
    }

    const normalizedCategory = category.trim().toLowerCase();
    const categoryExpenses = expenses.filter(expense => expense.category.trim().toLowerCase() === normalizedCategory);

    if (categoryExpenses.length === 0) {
      return {
        category,
        found: false,
        message: `No expenses found for category ${category}.`
      };
    }

    const actualCategory = categoryExpenses[0].category;
    const totalAmount = categoryExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const transactionCount = categoryExpenses.length;
    const averageTransaction = totalAmount / transactionCount;
    const overallTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const overallShare = overallTotal > 0 ? (totalAmount / overallTotal) * 100 : 0;

    const monthlyMap = new Map<string, { month: number; year: number; total: number; count: number }>();
    categoryExpenses.forEach(expense => {
      const date = new Date(expense.date);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const key = `${year}-${month}`;
      const existing = monthlyMap.get(key) || { month, year, total: 0, count: 0 };
      monthlyMap.set(key, {
        month,
        year,
        total: existing.total + expense.amount,
        count: existing.count + 1
      });
    });

    const monthlyBreakdown = Array.from(monthlyMap.values())
      .map(entry => ({
        month: entry.month,
        year: entry.year,
        monthName: this.getMonthName(entry.month),
        totalAmount: entry.total,
        transactionCount: entry.count,
        percentageOfCategory: totalAmount > 0 ? (entry.total / totalAmount) * 100 : 0
      }))
      .sort((a, b) => b.year - a.year || b.month - a.month);

    return {
      category: actualCategory,
      found: true,
      message: `Analyzed ${transactionCount} ${actualCategory} transactions across ${monthlyBreakdown.length} months.`,
      data: {
        category: actualCategory,
        totalAmount,
        transactionCount,
        overallShare,
        averageTransaction,
        monthsCovered: monthlyBreakdown.length,
        monthlyBreakdown
      }
    };
  }

  static formatCategoryAllMonthsForAI(result: CategoryAllMonthsAnalysisResult): string {
    if (!result.found || !result.data) {
      return `**${result.category} – All Months Overview**\n\n${result.message}`;
    }

    const data = result.data;
    const breakdownLines = data.monthlyBreakdown.slice(0, 12).map(entry => `  • ${entry.monthName} ${entry.year}: ₹${entry.totalAmount.toLocaleString()} (${entry.transactionCount} transactions, ${entry.percentageOfCategory.toFixed(1)}% of category total)`);
    const additionalMonths = data.monthlyBreakdown.length > 12 ? `\n  ... and ${data.monthlyBreakdown.length - 12} more month(s)` : '';

    const topMonths = [...data.monthlyBreakdown]
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 3)
      .map(entry => `  • ${entry.monthName} ${entry.year}: ₹${entry.totalAmount.toLocaleString()} (${entry.percentageOfCategory.toFixed(1)}%)`)
      .join('\n');

    return `
**${data.category} – All Months Overview**

**Category Summary:**
• Total Spent: ₹${data.totalAmount.toLocaleString()}
• Transactions: ${data.transactionCount}
• Share of All Expenses: ${data.overallShare.toFixed(1)}%
• Average Transaction: ₹${data.averageTransaction.toFixed(2)}
• Months with Activity: ${data.monthsCovered}

**Top Months by Spend:**
${topMonths || '  • Not enough data to highlight top months'}

**Monthly Breakdown:**
${breakdownLines.join('\n')}${additionalMonths}
`;
  }

  /**
   * Get available months and years from expense data
   */
  static getAvailableMonths(expenses: Expense[]): Array<{ month: number; year: number; monthName: string; count: number; total: number }> {
    const monthMap = new Map<string, { month: number; year: number; count: number; total: number }>();
    
    expenses.forEach(expense => {
      const date = new Date(expense.date);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const key = `${year}-${month}`;
      
      const existing = monthMap.get(key) || { month, year, count: 0, total: 0 };
      monthMap.set(key, {
        month,
        year,
        count: existing.count + 1,
        total: existing.total + expense.amount
      });
    });
    
    return Array.from(monthMap.values())
      .map(data => ({
        ...data,
        monthName: this.getMonthName(data.month)
      }))
      .sort((a, b) => b.year - a.year || b.month - a.month);
  }
}
