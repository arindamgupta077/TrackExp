import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface RecurringExpense {
  id: string;
  category: string;
  amount: number;
  description?: string;
  day_of_month: number;
  time_of_day: string;
  total_occurrences: number;
  remaining_occurrences: number;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useRecurringExpenses = (userId: string | undefined) => {
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch recurring expenses
  const fetchRecurringExpenses = async () => {
    if (!userId) {
      setRecurringExpenses([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_user_recurring_expenses', {
        target_user_id: userId
      });

      if (error) throw error;
      setRecurringExpenses(data || []);
    } catch (error) {
      console.error('Error fetching recurring expenses:', error);
      toast({
        title: "Error",
        description: "Failed to load recurring expenses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Create new recurring expense
  const createRecurringExpense = async (expenseData: {
    category: string;
    amount: number;
    description?: string;
    day_of_month: number;
    time_of_day: string;
    total_occurrences: number;
  }) => {
    if (!userId) {
      return { error: new Error('User not authenticated') };
    }

    try {
      const { data, error } = await supabase
        .from('recurring_expenses')
        .insert({
          user_id: userId,
          category: expenseData.category,
          amount: expenseData.amount,
          description: expenseData.description || null,
          day_of_month: expenseData.day_of_month,
          time_of_day: expenseData.time_of_day,
          total_occurrences: expenseData.total_occurrences,
          remaining_occurrences: expenseData.total_occurrences,
          start_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      setRecurringExpenses(prev => [data, ...prev]);
      
      toast({
        title: "Success",
        description: "Recurring expense created successfully",
      });

      return { data, error: null };
    } catch (error) {
      console.error('Error creating recurring expense:', error);
      toast({
        title: "Error",
        description: "Failed to create recurring expense",
        variant: "destructive",
      });
      return { error };
    }
  };

  // Update recurring expense
  const updateRecurringExpense = async (
    expenseId: string,
    updateData: {
      category: string;
      amount: number;
      description?: string;
      day_of_month: number;
      time_of_day: string;
      total_occurrences: number;
    }
  ) => {
    try {
      const { error } = await supabase.rpc('update_recurring_expense', {
        expense_id: expenseId,
        new_category: updateData.category,
        new_amount: updateData.amount,
        new_description: updateData.description || null,
        new_day_of_month: updateData.day_of_month,
        new_time_of_day: updateData.time_of_day,
        new_total_occurrences: updateData.total_occurrences
      });

      if (error) throw error;

      // Update local state
      setRecurringExpenses(prev => prev.map(expense => 
        expense.id === expenseId 
          ? { ...expense, ...updateData, updated_at: new Date().toISOString() }
          : expense
      ));
      
      toast({
        title: "Success",
        description: "Recurring expense updated successfully",
      });

      return { error: null };
    } catch (error) {
      console.error('Error updating recurring expense:', error);
      toast({
        title: "Error",
        description: "Failed to update recurring expense",
        variant: "destructive",
      });
      return { error };
    }
  };

  // Delete recurring expense
  const deleteRecurringExpense = async (expenseId: string) => {
    try {
      const { error } = await supabase.rpc('delete_recurring_expense', {
        expense_id: expenseId
      });

      if (error) throw error;

      // Remove from local state
      setRecurringExpenses(prev => prev.filter(expense => expense.id !== expenseId));
      
      toast({
        title: "Success",
        description: "Recurring expense deleted successfully",
      });

      return { error: null };
    } catch (error) {
      console.error('Error deleting recurring expense:', error);
      toast({
        title: "Error",
        description: "Failed to delete recurring expense",
        variant: "destructive",
      });
      return { error };
    }
  };

  // Manually trigger recurring expenses (for testing or manual execution)
  const triggerRecurringExpenses = async () => {
    try {
      const { error } = await supabase.rpc('trigger_recurring_expenses');
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Recurring expenses processed successfully",
      });
      
      // Refresh the list
      await fetchRecurringExpenses();
      
      return { error: null };
    } catch (error) {
      console.error('Error triggering recurring expenses:', error);
      toast({
        title: "Error",
        description: "Failed to process recurring expenses",
        variant: "destructive",
      });
      return { error };
    }
  };

  useEffect(() => {
    fetchRecurringExpenses();
  }, [userId]);

  return {
    recurringExpenses,
    loading,
    createRecurringExpense,
    updateRecurringExpense,
    deleteRecurringExpense,
    triggerRecurringExpenses,
    refetch: fetchRecurringExpenses
  };
};
