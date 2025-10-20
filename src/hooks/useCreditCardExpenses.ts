/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CreditCardExpense {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  created_at: string;
}

export const useCreditCardExpenses = (userId: string | undefined) => {
  const [creditCardExpenses, setCreditCardExpenses] = useState<CreditCardExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch credit card expenses
  const fetchCreditCardExpenses = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await (supabase as any)
        .from('credit_card')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      setCreditCardExpenses(data || []);
    } catch (error) {
      console.error('Error fetching credit card expenses:', error);
      toast({
        title: "Error",
        description: "Failed to load credit card expenses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  // Add new credit card expense
  const addCreditCardExpense = async (newExpense: Omit<CreditCardExpense, 'id' | 'created_at'>) => {
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

      const { data, error } = await (supabase as any)
        .from('credit_card')
        .insert([expenseData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Add to local state
      setCreditCardExpenses(prev => [data, ...prev]);
      
      toast({
        title: "Credit Card Expense added!",
        description: `₹${newExpense.amount.toLocaleString()} credit card expense for ${newExpense.category} has been recorded.`,
      });

      return { data, error: null };
    } catch (error) {
      console.error('Error adding credit card expense:', error);
      
      // Provide more specific error messages
      let errorMessage = "Failed to add credit card expense";
      if (error instanceof Error) {
        if (error.message.includes('duplicate')) {
          errorMessage = "This credit card expense already exists";
        } else if (error.message.includes('foreign key')) {
          errorMessage = "Invalid category selected";
        } else if (error.message.includes('check constraint')) {
          errorMessage = "Amount must be greater than 0";
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });

      return { data: null, error };
    }
  };

  // Delete credit card expense
  const deleteCreditCardExpense = async (expenseId: string) => {
    if (!userId) {
      return { error: new Error('User not authenticated') };
    }

    try {
      const { error } = await (supabase as any)
        .from('credit_card')
        .delete()
        .eq('id', expenseId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      // Remove from local state
      setCreditCardExpenses(prev => prev.filter(expense => expense.id !== expenseId));
      
      toast({
        title: "Credit Card Expense deleted!",
        description: "The credit card expense has been removed.",
      });

      return { error: null };
    } catch (error) {
      console.error('Error deleting credit card expense:', error);
      
      toast({
        title: "Error",
        description: "Failed to delete credit card expense",
        variant: "destructive",
      });

      return { error };
    }
  };

  // Update credit card expense
  const updateCreditCardExpense = async (expenseId: string, updatedExpense: Omit<CreditCardExpense, 'id' | 'created_at'>) => {
    if (!userId) {
      return { error: new Error('User not authenticated') };
    }

    try {
      const { data, error } = await (supabase as any)
        .from('credit_card')
        .update({
          category: updatedExpense.category,
          amount: updatedExpense.amount,
          description: updatedExpense.description,
          date: updatedExpense.date
        })
        .eq('id', expenseId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update local state
      setCreditCardExpenses(prev => 
        prev.map(expense => 
          expense.id === expenseId ? (data as CreditCardExpense) : expense
        )
      );
      
      toast({
        title: "Credit Card Expense updated!",
        description: "The credit card expense has been updated successfully.",
      });

      return { data, error: null };
    } catch (error) {
      console.error('Error updating credit card expense:', error);
      
      toast({
        title: "Error",
        description: "Failed to update credit card expense",
        variant: "destructive",
      });

      return { data: null, error };
    }
  };

  // Convert credit card expense to regular expense (for due payment)
  const payCreditCardDue = async (creditCardExpenseId: string) => {
    if (!userId) {
      return { error: new Error('User not authenticated') };
    }

    try {
      // Get the credit card expense
      const creditCardExpense = creditCardExpenses.find(exp => exp.id === creditCardExpenseId);
      if (!creditCardExpense) {
        throw new Error('Credit card expense not found');
      }

      // Add to regular expenses table
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .insert([{
          user_id: userId,
          category: creditCardExpense.category,
          amount: creditCardExpense.amount,
          description: `Credit Card Payment: ${creditCardExpense.description}`,
          date: new Date().toISOString().split('T')[0] // Today's date
        }])
        .select()
        .single();

      if (expenseError) {
        throw expenseError;
      }

      // Delete from credit card table
      const { error: deleteError } = await (supabase as any)
        .from('credit_card')
        .delete()
        .eq('id', creditCardExpenseId)
        .eq('user_id', userId);

      if (deleteError) {
        throw deleteError;
      }

      // Remove from local state
      setCreditCardExpenses(prev => prev.filter(expense => expense.id !== creditCardExpenseId));
      
      toast({
        title: "Credit Card Due Paid!",
        description: `₹${creditCardExpense.amount.toLocaleString()} has been moved to expenses and the credit card due has been cleared.`,
      });

      // Return both the expense data and the original credit card expense for reference
      return { 
        data: expenseData, 
        originalCreditCardExpense: creditCardExpense,
        error: null 
      };
    } catch (error) {
      console.error('Error paying credit card due:', error);
      
      toast({
        title: "Error",
        description: "Failed to pay credit card due",
        variant: "destructive",
      });

      return { data: null, originalCreditCardExpense: null, error };
    }
  };

  // Bulk pay credit card dues
  const bulkPayCreditCardDues = async (creditCardExpenseIds: string[]) => {
    if (!userId) {
      return { error: new Error('User not authenticated') };
    }

    try {
      const results = [];
      const errors = [];

      // Process each credit card expense
      for (const expenseId of creditCardExpenseIds) {
        try {
          const result = await payCreditCardDue(expenseId);
          if (result && !result.error) {
            results.push(result);
          } else {
            errors.push({ expenseId, error: result?.error || new Error('Unknown error') });
          }
        } catch (error) {
          errors.push({ expenseId, error });
        }
      }

      // Show summary toast
      const successCount = results.length;
      const errorCount = errors.length;

      if (successCount > 0) {
        const totalAmount = results.reduce((sum, result) => 
          sum + (result.originalCreditCardExpense?.amount || 0), 0
        );

        toast({
          title: "Bulk Payment Complete!",
          description: `Successfully paid ${successCount} credit card dues totaling ₹${totalAmount.toLocaleString()}${errorCount > 0 ? ` (${errorCount} failed)` : ''}`,
        });
      }

      if (errorCount > 0) {
        toast({
          title: "Some Payments Failed",
          description: `${errorCount} credit card dues could not be processed. Please try again.`,
          variant: "destructive",
        });
      }

      return { 
        data: results, 
        errors: errors.length > 0 ? errors : null,
        error: errors.length > 0 ? new Error(`${errors.length} payments failed`) : null 
      };
    } catch (error) {
      console.error('Error in bulk pay credit card dues:', error);
      
      toast({
        title: "Bulk Payment Failed",
        description: "Failed to process bulk payment. Please try again.",
        variant: "destructive",
      });

      return { data: null, errors: null, error };
    }
  };

  useEffect(() => {
    fetchCreditCardExpenses();
  }, [fetchCreditCardExpenses]);

  return {
    creditCardExpenses,
    loading,
    addCreditCardExpense,
    deleteCreditCardExpense,
    updateCreditCardExpense,
    payCreditCardDue,
    bulkPayCreditCardDues,
    refetch: fetchCreditCardExpenses
  };
};

