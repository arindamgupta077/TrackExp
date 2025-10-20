import { supabase } from '@/integrations/supabase/client';

export class RecurringExpenseService {
  /**
   * Manually trigger the creation of recurring expenses
   * This can be called from the frontend for testing or manual execution
   */
  static async triggerRecurringExpenses(): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.rpc('trigger_recurring_expenses');
      
      if (error) {
        console.error('Error triggering recurring expenses:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Unexpected error triggering recurring expenses:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Get recurring expenses for a specific user
   */
  static async getUserRecurringExpenses(userId: string) {
    try {
      const { data, error } = await supabase.rpc('get_user_recurring_expenses', {
        target_user_id: userId
      });
      
      if (error) {
        console.error('Error fetching user recurring expenses:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching recurring expenses:', error);
      throw error;
    }
  }

  /**
   * Create a new recurring expense
   */
  static async createRecurringExpense(expenseData: {
    userId: string;
    category: string;
    amount: number;
    description?: string;
    dayOfMonth: number;
    timeOfDay: string;
    totalOccurrences: number;
  }) {
    try {
      const { data, error } = await supabase
        .from('recurring_expenses')
        .insert({
          user_id: expenseData.userId,
          category: expenseData.category,
          amount: expenseData.amount,
          description: expenseData.description || null,
          day_of_month: expenseData.dayOfMonth,
          time_of_day: expenseData.timeOfDay,
          total_occurrences: expenseData.totalOccurrences,
          remaining_occurrences: expenseData.totalOccurrences,
          start_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating recurring expense:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Unexpected error creating recurring expense:', error);
      throw error;
    }
  }

  /**
   * Update an existing recurring expense
   */
  static async updateRecurringExpense(
    expenseId: string,
    updateData: {
      category: string;
      amount: number;
      description?: string;
      dayOfMonth: number;
      timeOfDay: string;
      totalOccurrences: number;
    }
  ) {
    try {
      const { error } = await supabase.rpc('update_recurring_expense', {
        expense_id: expenseId,
        new_category: updateData.category,
        new_amount: updateData.amount,
        new_description: updateData.description || null,
        new_day_of_month: updateData.dayOfMonth,
        new_time_of_day: updateData.timeOfDay,
        new_total_occurrences: updateData.totalOccurrences
      });
      
      if (error) {
        console.error('Error updating recurring expense:', error);
        throw error;
      }
      
      return { success: true };
    } catch (error) {
      console.error('Unexpected error updating recurring expense:', error);
      throw error;
    }
  }

  /**
   * Delete a recurring expense
   */
  static async deleteRecurringExpense(expenseId: string) {
    try {
      const { error } = await supabase.rpc('delete_recurring_expense', {
        expense_id: expenseId
      });
      
      if (error) {
        console.error('Error deleting recurring expense:', error);
        throw error;
      }
      
      return { success: true };
    } catch (error) {
      console.error('Unexpected error deleting recurring expense:', error);
      throw error;
    }
  }

  /**
   * Get recurring expense logs for a specific recurring expense
   */
  static async getRecurringExpenseLogs(recurringExpenseId: string) {
    try {
      const { data, error } = await supabase
        .from('recurring_expense_logs')
        .select(`
          *,
          expenses (
            id,
            amount,
            category,
            description,
            date
          )
        `)
        .eq('recurring_expense_id', recurringExpenseId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching recurring expense logs:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching recurring expense logs:', error);
      throw error;
    }
  }

  /**
   * Check if a recurring expense has already been processed for a specific month
   */
  static async isRecurringExpenseProcessedForMonth(
    recurringExpenseId: string,
    year: number,
    month: number
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('recurring_expense_logs')
        .select('id')
        .eq('recurring_expense_id', recurringExpenseId)
        .gte('scheduled_date', `${year}-${month.toString().padStart(2, '0')}-01`)
        .lt('scheduled_date', `${year}-${(month + 1).toString().padStart(2, '0')}-01`)
        .limit(1);
      
      if (error) {
        console.error('Error checking if recurring expense is processed:', error);
        throw error;
      }
      
      return (data && data.length > 0);
    } catch (error) {
      console.error('Unexpected error checking recurring expense processing:', error);
      throw error;
    }
  }
}
