import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  created_at: string;
}

export const useExpenses = (userId: string | undefined) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch expenses
  const fetchExpenses = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast({
        title: "Error",
        description: "Failed to load expenses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Add new expense
  const addExpense = async (newExpense: Omit<Expense, 'id' | 'created_at'>) => {
    if (!userId) {
      return { error: new Error('User not authenticated') };
    }

    try {
      const expenseData = {
        user_id: userId,
        category: newExpense.category,
        amount: newExpense.amount,
        description: newExpense.description,
        date: newExpense.date
      };

      const { data, error } = await supabase
        .from('expenses')
        .insert([expenseData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Add to local state
      setExpenses(prev => [data, ...prev]);
      
      toast({
        title: "Expense added!",
        description: `₹${newExpense.amount.toLocaleString()} expense for ${newExpense.category} has been recorded.`,
      });

      return { data, error: null };
    } catch (error) {
      console.error('Error adding expense:', error);
      
      // Provide more specific error messages
      let errorMessage = "Failed to add expense";
      if (error instanceof Error) {
        if (error.message.includes('budget') || error.message.includes('Budget')) {
          errorMessage = "Budget constraint error - please try again";
        } else if (error.message.includes('permission') || error.message.includes('auth')) {
          errorMessage = "Authentication error - please log in again";
        } else if (error.message.includes('category')) {
          errorMessage = "Invalid category selected";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { error };
    }
  };

  // Delete expense
  const deleteExpense = async (expenseId: string) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;

      // Remove from local state
      setExpenses(prev => prev.filter(expense => expense.id !== expenseId));
      
      toast({
        title: "Expense deleted",
        description: "Expense has been removed successfully.",
      });

      return { error: null };
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        title: "Error",
        description: "Failed to delete expense",
        variant: "destructive",
      });
      return { error };
    }
  };

  // Update expense
  const updateExpense = async (expenseId: string, updatedExpense: Omit<Expense, 'id' | 'created_at'>) => {
    if (!userId) {
      return { error: new Error('User not authenticated') };
    }

    try {
      const expenseData = {
        category: updatedExpense.category,
        amount: updatedExpense.amount,
        description: updatedExpense.description,
        date: updatedExpense.date
      };

      const { data, error } = await supabase
        .from('expenses')
        .update(expenseData)
        .eq('id', expenseId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update local state
      setExpenses(prev => prev.map(expense => 
        expense.id === expenseId ? data : expense
      ));
      
      toast({
        title: "Expense updated!",
        description: `₹${updatedExpense.amount.toLocaleString()} expense for ${updatedExpense.category} has been updated.`,
      });

      return { data, error: null };
    } catch (error) {
      console.error('Error updating expense:', error);
      
      toast({
        title: "Error",
        description: "Failed to update expense",
        variant: "destructive",
      });
      return { error };
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [userId]);

  return {
    expenses,
    loading,
    addExpense,
    deleteExpense,
    updateExpense,
    refetch: fetchExpenses
  };
};