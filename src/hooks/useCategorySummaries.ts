/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CategorySummary {
  category_name: string;
  total_budget: number;
  total_spent: number;
  remaining_balance: number;
  month_year: string;
  accumulated_remaining_balance: number;
}

export const useCategorySummaries = (userId: string | undefined, monthYear: string) => {
  const [data, setData] = useState<CategorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchCategorySummaries = useCallback(async () => {
    if (!userId || !monthYear) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get category summaries
      const { data: summaries, error: fetchError } = await (supabase as any).rpc(
        'get_category_summaries',
        {
          target_user_id: userId,
          target_month_year: monthYear
        }
      );

      if (fetchError) {
        throw fetchError;
      }

      // Get accumulated remaining balances for the year
      const year = monthYear.split('-')[0];
      const { data: monthlyBalances, error: monthlyError } = await (supabase as any).rpc(
        'get_user_monthly_remaining_balances',
        {
          target_user_id: userId,
          target_year: parseInt(year)
        }
      );

      if (monthlyError) {
        console.warn('Could not fetch monthly balances:', monthlyError);
      }

      // Combine the data and filter out the special category and Salary category
      const combinedData = (summaries || [])
        .filter(summary => 
          summary.category_name !== '__SKIP_DEFAULT_CATEGORIES__' && 
          summary.category_name !== 'Salary'
        )
        .map(summary => {
          // Find the corresponding monthly balance data for this category
          const monthlyData = (monthlyBalances || []).find(mb => mb.category_name === summary.category_name);
          
          // Calculate accumulated remaining balance (sum of all months up to current month)
          let accumulatedBalance = 0;
          if (monthlyData) {
            const currentMonth = parseInt(monthYear.split('-')[1]);
            const months = ['january', 'february', 'march', 'april', 'may', 'june', 
                           'july', 'august', 'september', 'october', 'november', 'december'];
            
            for (let i = 0; i < currentMonth; i++) {
              const monthValue = monthlyData[months[i] as keyof typeof monthlyData] as number || 0;
              accumulatedBalance += monthValue;
            }
          }

          return {
            ...summary,
            accumulated_remaining_balance: accumulatedBalance
          };
        });

      setData(combinedData);
    } catch (err) {
      console.error('Error fetching category summaries:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch category summaries');
      toast({
        title: 'Error',
        description: 'Failed to fetch category summaries',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [userId, monthYear, toast]);

  const updateAllSummaries = async () => {
    if (!userId || !monthYear) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await (supabase as any).rpc(
        'update_all_category_summaries',
        {
          target_user_id: userId,
          target_month_year: monthYear
        }
      );

      if (updateError) {
        throw updateError;
      }

      // Refresh data after update
      await fetchCategorySummaries();
      
      toast({
        title: 'Success',
        description: 'Category summaries updated successfully',
      });
    } catch (err) {
      console.error('Error updating category summaries:', err);
      setError(err instanceof Error ? err.message : 'Failed to update category summaries');
      toast({
        title: 'Error',
        description: 'Failed to update category summaries',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getTotalBudget = () => {
    return data.reduce((sum, summary) => sum + (summary.total_budget || 0), 0);
  };

  const getTotalSpent = () => {
    return data.reduce((sum, summary) => sum + (summary.total_spent || 0), 0);
  };

  const getTotalRemaining = () => {
    return data.reduce((sum, summary) => sum + (summary.remaining_balance || 0), 0);
  };

  const getTotalAccumulatedRemaining = () => {
    return data.reduce((sum, summary) => sum + (summary.accumulated_remaining_balance || 0), 0);
  };

  const getOverBudgetCategoriesSummary = () => {
    return data.filter(summary => (summary.remaining_balance || 0) < 0);
  };

  const getUnderBudgetCategoriesSummary = () => {
    return data.filter(summary => (summary.remaining_balance || 0) > 0);
  };

  const getOnBudgetCategoriesSummary = () => {
    return data.filter(summary => (summary.remaining_balance || 0) === 0);
  };

  const formatMonthYear = (monthYear: string) => {
    const [year, month] = monthYear.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  useEffect(() => {
    fetchCategorySummaries();
  }, [fetchCategorySummaries]);

  return {
    data,
    loading,
    error,
    refetch: fetchCategorySummaries,
    updateAllSummaries,
    getTotalBudget,
    getTotalSpent,
    getTotalRemaining,
    getTotalAccumulatedRemaining,
    getOverBudgetCategoriesSummary,
    getUnderBudgetCategoriesSummary,
    getOnBudgetCategoriesSummary,
    formatMonthYear
  };
};

