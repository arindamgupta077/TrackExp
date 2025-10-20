import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { callSupabaseRpc } from '@/lib/supabaseRpc';

export interface SalaryMonth {
  year: number;
  month: number;
  salary_added_at: string;
}

export const useSalaryMonthsTracking = (userId: string | undefined) => {
  const [salaryMonths, setSalaryMonths] = useState<SalaryMonth[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch salary months for the user
  const fetchSalaryMonths = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await callSupabaseRpc<SalaryMonth[]>(
        'get_salary_months_for_user',
        {
          target_user_id: userId
        }
      );

      if (error) throw error;

      setSalaryMonths(data ?? []);
    } catch (error) {
      console.error('Error fetching salary months:', error);
      toast({
        title: "Error",
        description: "Failed to load salary months tracking",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  // Mark a month as having salary added
  const markSalaryMonth = async (year: number, month: number) => {
    if (!userId) {
      return { error: new Error('User not authenticated') };
    }

    try {
      const { error } = await callSupabaseRpc<null>(
        'mark_salary_month_added',
        {
          target_user_id: userId,
          target_year: year,
          target_month: month
        }
      );

      if (error) throw error;

      // Refresh the salary months list
      await fetchSalaryMonths();

      return { error: null };
    } catch (error) {
      console.error('Error marking salary month:', error);
      toast({
        title: "Error",
        description: "Failed to mark salary month",
        variant: "destructive",
      });

      return { error };
    }
  };

  // Unmark a month as having salary removed
  const unmarkSalaryMonth = async (year: number, month: number) => {
    if (!userId) {
      return { error: new Error('User not authenticated') };
    }

    try {
      const { error } = await callSupabaseRpc<null>(
        'unmark_salary_month_removed',
        {
          target_user_id: userId,
          target_year: year,
          target_month: month
        }
      );

      if (error) throw error;

      // Refresh the salary months list
      await fetchSalaryMonths();

      return { error: null };
    } catch (error) {
      console.error('Error unmarking salary month:', error);
      toast({
        title: "Error",
        description: "Failed to unmark salary month",
        variant: "destructive",
      });

      return { error };
    }
  };

  // Check if a month has salary added
  const hasSalaryForMonth = async (year: number, month: number): Promise<boolean> => {
    if (!userId) return false;

    try {
      const { data, error } = await callSupabaseRpc<boolean>(
        'has_salary_for_month',
        {
          target_user_id: userId,
          target_year: year,
          target_month: month
        }
      );

      if (error) throw error;

      return Boolean(data);
    } catch (error) {
      console.error('Error checking salary month:', error);
      return false;
    }
  };

  // Get all salary months as a Set for quick lookup
  const getSalaryMonthsSet = (): Set<string> => {
    return new Set(
      salaryMonths.map(sm => `${sm.year}-${sm.month.toString().padStart(2, '0')}`)
    );
  };

  // Initialize salary months when component mounts
  useEffect(() => {
    fetchSalaryMonths();
  }, [fetchSalaryMonths]);

  return {
    salaryMonths,
    loading,
    markSalaryMonth,
    unmarkSalaryMonth,
    hasSalaryForMonth,
    getSalaryMonthsSet,
    fetchSalaryMonths
  };
};
