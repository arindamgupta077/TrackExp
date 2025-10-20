import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  category_name: string;
  month_year: string;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface BudgetAlert {
  id: string;
  user_id: string;
  category_id: string;
  category_name: string;
  month_year: string;
  budget_amount: number;
  spent_amount: number;
  exceeded_by: number;
  is_read: boolean;
  created_at: string;
}

export interface BudgetWithCarryover extends Budget {
  carryover_amount: number; // Always 0 - no carryover functionality
  total_budget: number;
  spent_amount: number;
  remaining_amount: number;
}

export const useBudgets = (userId: string | undefined) => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch budgets with category names
  const fetchBudgets = async () => {
    if (!userId) {
      setBudgets([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('budgets')
        .select(`
          *,
          categories!inner(name)
        `)
        .order('month_year', { ascending: false });

      if (error) throw error;

      console.log('Fetched budgets from database:', data);

      const budgetsWithCategoryNames = data?.map(budget => ({
        ...budget,
        category_name: budget.categories.name
      })) || [];

      console.log('Processed budgets:', budgetsWithCategoryNames);

      setBudgets(budgetsWithCategoryNames);
    } catch (error) {
      console.error('Error fetching budgets:', error);
      toast({
        title: 'Error',
        description: 'Failed to load budgets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch budget alerts with category names
  const fetchBudgetAlerts = async () => {
    if (!userId) {
      setBudgetAlerts([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('budget_alerts')
        .select(`
          *,
          categories!inner(name)
        `)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const alertsWithCategoryNames = data?.map(alert => ({
        ...alert,
        category_name: alert.categories.name
      })) || [];

      setBudgetAlerts(alertsWithCategoryNames);
    } catch (error) {
      console.error('Error fetching budget alerts:', error);
    }
  };

  // Get budget for a specific month and category (no carryover)
  const getBudgetWithCarryover = async (categoryId: string, monthYear: string): Promise<BudgetWithCarryover | null> => {
    if (!userId) return null;

    try {
      // Get current budget
      const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .select(`
          *,
          categories!inner(name)
        `)
        .eq('user_id', userId)
        .eq('category_id', categoryId)
        .eq('month_year', monthYear)
        .single();

      // Get category name
      let categoryName = '';
      if (budgetData?.categories?.name) {
        categoryName = budgetData.categories.name;
      } else {
        // If no budget exists, get category name from categories table
        const { data: categoryData, error: categoryError } = await supabase
          .from('categories')
          .select('name')
          .eq('id', categoryId)
          .single();
        
        if (categoryError) {
          console.error('Error getting category name:', categoryError);
          return null;
        }
        categoryName = categoryData.name;
      }

      const currentBudget = budgetData?.amount || 0;
      const totalBudget = currentBudget; // No carryover

      // Check if this is a future month
      const currentDate = new Date();
      const currentMonthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      
      let spentAmount = 0;
      
      if (monthYear > currentMonthYear) {
        // For future months, there are no expenses yet
        console.log('Future month detected in getBudgetWithCarryover:', monthYear, '- no expenses to calculate');
        spentAmount = 0;
      } else {
        // Calculate spent amount for current/past month
        const monthStart = `${monthYear}-01`;
        const nextMonth = new Date(monthStart);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const monthEnd = nextMonth.toISOString().slice(0, 10);

        const { data: spentData, error: spentError } = await supabase
          .from('expenses')
          .select('amount')
          .eq('user_id', userId)
          .eq('category', categoryName)
          .gte('date', monthStart)
          .lt('date', monthEnd);

        if (spentError) throw spentError;

        spentAmount = spentData?.reduce((sum, expense) => sum + expense.amount, 0) || 0;
      }
      
      const remainingAmount = totalBudget - spentAmount;

      return {
        id: budgetData?.id || '',
        user_id: userId,
        category_id: categoryId,
        category_name: categoryName,
        month_year: monthYear,
        amount: currentBudget,
        created_at: budgetData?.created_at || new Date().toISOString(),
        updated_at: budgetData?.updated_at || new Date().toISOString(),
        carryover_amount: 0, // No carryover
        total_budget: totalBudget,
        spent_amount: spentAmount,
        remaining_amount: remainingAmount
      };
    } catch (error) {
      console.error('Error getting budget:', error);
      return null;
    }
  };

  // Get total budget for a month (optimized using category_summaries table)
  const getTotalBudgetForMonth = async (monthYear: string): Promise<{
    totalBudget: number;
    totalSpent: number;
    totalRemaining: number;
  } | null> => {
    if (!userId) return null;

    // Check if the selected month is in the future
    const currentDate = new Date();
    const currentMonthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    
    if (monthYear > currentMonthYear) {
      // For future months, only show budget data (no expenses yet)
      console.log('Future month selected:', monthYear, '- showing budget only');
      return await getTotalBudgetForMonthFallback(monthYear);
    }

    try {
      // Use the optimized category_summaries RPC function
      const { data: summaries, error: summariesError } = await supabase.rpc(
        'get_category_summaries',
        {
          target_user_id: userId,
          target_month_year: monthYear
        }
      );

      if (summariesError) {
        console.warn('Category summaries RPC failed, falling back to manual calculation:', summariesError);
        // Fallback to the original method if RPC fails
        return await getTotalBudgetForMonthFallback(monthYear);
      }

      // Filter out special categories and calculate totals
      const filteredSummaries = (summaries || []).filter(summary => 
        summary.category_name !== '__SKIP_DEFAULT_CATEGORIES__' && 
        summary.category_name !== 'Salary'
      );

      const totalBudget = filteredSummaries.reduce((sum, summary) => sum + (summary.total_budget || 0), 0);
      const totalSpent = filteredSummaries.reduce((sum, summary) => sum + (summary.total_spent || 0), 0);
      const totalRemaining = filteredSummaries.reduce((sum, summary) => sum + (summary.remaining_balance || 0), 0);

      return {
        totalBudget,
        totalSpent,
        totalRemaining
      };
    } catch (error) {
      console.error('Error getting total budget for month:', error);
      // Fallback to manual calculation
      return await getTotalBudgetForMonthFallback(monthYear);
    }
  };

  // Fallback method for when category_summaries RPC is not available
  const getTotalBudgetForMonthFallback = async (monthYear: string): Promise<{
    totalBudget: number;
    totalSpent: number;
    totalRemaining: number;
  } | null> => {
    if (!userId) return null;

    try {
      // Get all budgets for the month
      const { data: budgetsData, error: budgetsError } = await supabase
        .from('budgets')
        .select(`
          *,
          categories!inner(name)
        `)
        .eq('user_id', userId)
        .eq('month_year', monthYear);

      if (budgetsError) throw budgetsError;

      let totalBudget = 0;
      let totalSpent = 0;

      // Calculate total budget and spent for all categories
      for (const budget of budgetsData || []) {
        const categoryName = budget.categories.name;
        totalBudget += budget.amount;

        // Check if this is a future month
        const currentDate = new Date();
        const currentMonthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        
        if (monthYear > currentMonthYear) {
          // For future months, there are no expenses yet
          console.log('Future month detected in fallback:', monthYear, '- no expenses to calculate');
          totalSpent = 0;
        } else {
          // Calculate spent amount for this category (only for current/past months)
          const monthStart = `${monthYear}-01`;
          const nextMonth = new Date(monthStart);
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          const monthEnd = nextMonth.toISOString().slice(0, 10);

          const { data: spentData, error: spentError } = await supabase
            .from('expenses')
            .select('amount')
            .eq('user_id', userId)
            .eq('category', categoryName)
            .gte('date', monthStart)
            .lt('date', monthEnd);

          if (spentError) throw spentError;

          const categorySpent = spentData?.reduce((sum, expense) => sum + expense.amount, 0) || 0;
          totalSpent += categorySpent;
        }
      }

      const totalRemaining = totalBudget - totalSpent;

      return {
        totalBudget,
        totalSpent,
        totalRemaining
      };
    } catch (error) {
      console.error('Error in fallback total budget calculation:', error);
      return null;
    }
  };

  // Calculate carryover amount manually - accumulates from all previous months
  const calculateCarryoverAmount = async (userId: string, categoryId: string, monthYear: string, categoryName: string): Promise<number> => {
    // This function is deprecated - no carryover functionality
    return 0;
  };

  // Set budget for a category and month
  const setBudget = async (categoryId: string, monthYear: string, amount: number, budgetId?: string) => {
    if (!userId) return { error: new Error('User not authenticated') };

    console.log('Setting budget with monthYear:', monthYear, 'budgetId:', budgetId);

    try {
      let data, error;

      if (budgetId) {
        // Update existing budget
        const { data: updateData, error: updateError } = await supabase
          .from('budgets')
          .update({
            amount: amount
          })
          .eq('id', budgetId)
          .select(`
            *,
            categories!inner(name)
          `)
          .single();
        
        data = updateData;
        error = updateError;
      } else {
        // Create new budget or update existing one
        const { data: insertData, error: insertError } = await supabase
          .from('budgets')
          .upsert({
            user_id: userId,
            category_id: categoryId,
            month_year: monthYear,
            amount: amount
          }, {
            onConflict: 'user_id,category_id,month_year'
          })
          .select(`
            *,
            categories!inner(name)
          `)
          .single();
        
        data = insertData;
        error = insertError;
      }

      if (error) throw error;

      console.log('Budget saved with data:', data);

      const budgetWithCategoryName = {
        ...data,
        category_name: data.categories.name
      };

      // Update local state
      setBudgets(prev => {
        const existingIndex = prev.findIndex(b => 
          b.category_id === categoryId && b.month_year === monthYear
        );
        
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = budgetWithCategoryName;
          return updated;
        } else {
          return [budgetWithCategoryName, ...prev];
        }
      });

      toast({
        title: budgetId ? 'Budget updated!' : 'Budget set!',
        description: `Budget for ${budgetWithCategoryName.category_name} in ${monthYear} has been ${budgetId ? 'updated to' : 'set to'} ₹${amount.toLocaleString()}.`,
      });

      return { data: budgetWithCategoryName, error: null };
    } catch (error) {
      console.error('Error setting budget:', error);
      toast({
        title: 'Error',
        description: 'Failed to set budget',
        variant: 'destructive',
      });
      return { error };
    }
  };

  // Delete budget
  const deleteBudget = async (budgetId: string) => {
    try {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', budgetId);

      if (error) throw error;

      // Update local state
      setBudgets(prev => prev.filter(b => b.id !== budgetId));

      toast({
        title: 'Budget deleted',
        description: 'Budget has been removed successfully.',
      });

      return { error: null };
    } catch (error) {
      console.error('Error deleting budget:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete budget',
        variant: 'destructive',
      });
      return { error };
    }
  };

  // Mark budget alert as read
  const markAlertAsRead = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('budget_alerts')
        .update({ is_read: true })
        .eq('id', alertId);

      if (error) throw error;

      // Update local state
      setBudgetAlerts(prev => prev.filter(alert => alert.id !== alertId));

      return { error: null };
    } catch (error) {
      console.error('Error marking alert as read:', error);
      return { error };
    }
  };

  // Mark all alerts as read
  const markAllAlertsAsRead = async () => {
    if (!userId) return { error: new Error('User not authenticated') };

    try {
      const { error } = await supabase
        .from('budget_alerts')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;

      // Update local state
      setBudgetAlerts([]);

      return { error: null };
    } catch (error) {
      console.error('Error marking all alerts as read:', error);
      return { error };
    }
  };

  // Initialize data
  useEffect(() => {
    fetchBudgets();
    fetchBudgetAlerts();
  }, [userId]);

  return {
    budgets,
    budgetAlerts,
    loading,
    fetchBudgets,
    fetchBudgetAlerts,
    getBudgetWithCarryover,
    getTotalBudgetForMonth,
    setBudget,
    deleteBudget,
    markAlertAsRead,
    markAllAlertsAsRead
  };
};
