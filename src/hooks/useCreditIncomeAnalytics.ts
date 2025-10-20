import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CreditIncomeData {
  month: string;
  year: number;
  totalCredits: number;
  totalIncome: number;
  categoryBreakdown: Array<{
    category: string;
    credits: number;
    income: number;
    total: number;
    percentage: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    year: number;
    credits: number;
    income: number;
    total: number;
  }>;
}

export interface CreditIncomeAnalyticsResult {
  data: CreditIncomeData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useCreditIncomeAnalytics = (
  userId: string | undefined,
  selectedMonth?: string,
  selectedYear?: string
): CreditIncomeAnalyticsResult => {
  const [data, setData] = useState<CreditIncomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchCreditIncomeAnalytics = async () => {
    if (!userId) {
      setData(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Determine the date range for filtering
      let startDate: string;
      let endDate: string;
      
      if (selectedMonth && selectedYear) {
        // Specific month and year
        const month = parseInt(selectedMonth);
        const year = parseInt(selectedYear);
        startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        endDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`;
      } else if (selectedYear) {
        // Entire year
        startDate = `${selectedYear}-01-01`;
        endDate = `${parseInt(selectedYear) + 1}-01-01`;
      } else {
        // Current year
        const currentYear = new Date().getFullYear();
        startDate = `${currentYear}-01-01`;
        endDate = `${currentYear + 1}-01-01`;
      }

      // Fetch credits data
      const { data: creditsData, error: creditsError } = await supabase
        .from('credits' as any)
        .select('category, amount, date')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lt('date', endDate);

      if (creditsError) {
        throw creditsError;
      }

      // Fetch expenses data (for income analysis - looking for Salary category)
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('category, amount, date')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lt('date', endDate);

      if (expensesError) {
        throw expensesError;
      }

      // Process credits data
      const credits = creditsData || [];
      const totalCredits = credits.reduce((sum: number, credit: any) => sum + credit.amount, 0);

      // Process income data (from expenses with Salary category)
      const salaryExpenses = expensesData?.filter((expense: any) => expense.category === 'Salary') || [];
      const totalIncome = salaryExpenses.reduce((sum: number, expense: any) => sum + expense.amount, 0);

      // Group credits by category
      const creditCategoryMap = new Map<string, number>();
      credits.forEach((credit: any) => {
        const category = credit.category || 'Unassigned';
        creditCategoryMap.set(category, (creditCategoryMap.get(category) || 0) + credit.amount);
      });

      // Group income by category (mainly Salary, but could be other income categories)
      const incomeCategoryMap = new Map<string, number>();
      salaryExpenses.forEach((expense: any) => {
        const category = expense.category;
        incomeCategoryMap.set(category, (incomeCategoryMap.get(category) || 0) + expense.amount);
      });

      // Get all unique categories
      const allCategories = new Set([
        ...Array.from(creditCategoryMap.keys()),
        ...Array.from(incomeCategoryMap.keys())
      ]);

      // Create category breakdown
      const categoryBreakdown = Array.from(allCategories).map(category => {
        const credits = creditCategoryMap.get(category) || 0;
        const income = incomeCategoryMap.get(category) || 0;
        const total = credits + income;
        
        return {
          category,
          credits,
          income,
          total,
          percentage: totalCredits + totalIncome > 0 ? (total / (totalCredits + totalIncome)) * 100 : 0
        };
      }).sort((a, b) => b.total - a.total);

      // Generate monthly trend data for the selected period
      const monthlyTrend = generateMonthlyTrend(credits, salaryExpenses, startDate, endDate);

      const result: CreditIncomeData = {
        month: selectedMonth ? getMonthName(parseInt(selectedMonth)) : 'All',
        year: selectedYear ? parseInt(selectedYear) : new Date().getFullYear(),
        totalCredits,
        totalIncome,
        categoryBreakdown,
        monthlyTrend
      };

      setData(result);
    } catch (err) {
      console.error('Error fetching credit income analytics:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch analytics data';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: 'Failed to load credit and income analytics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to generate monthly trend data
  const generateMonthlyTrend = (
    credits: any[],
    salaryExpenses: any[],
    startDate: string,
    endDate: string
  ) => {
    const trendData: Array<{
      month: string;
      year: number;
      credits: number;
      income: number;
      total: number;
    }> = [];

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const current = new Date(start);
    while (current < end) {
      const month = current.getMonth() + 1;
      const year = current.getFullYear();
      const monthStr = current.toISOString().slice(0, 7); // YYYY-MM
      
      const monthCredits = credits
        .filter((credit: any) => credit.date.startsWith(monthStr))
        .reduce((sum: number, credit: any) => sum + credit.amount, 0);
      
      const monthIncome = salaryExpenses
        .filter((expense: any) => expense.date.startsWith(monthStr))
        .reduce((sum: number, expense: any) => sum + expense.amount, 0);

      trendData.push({
        month: getMonthName(month),
        year,
        credits: monthCredits,
        income: monthIncome,
        total: monthCredits + monthIncome
      });

      current.setMonth(current.getMonth() + 1);
    }

    return trendData;
  };

  // Helper function to get month name
  const getMonthName = (month: number): string => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return monthNames[month - 1] || 'Unknown';
  };

  useEffect(() => {
    fetchCreditIncomeAnalytics();
  }, [userId, selectedMonth, selectedYear]);

  return {
    data,
    loading,
    error,
    refetch: fetchCreditIncomeAnalytics
  };
};
