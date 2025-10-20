import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MonthlyUnassignedCredit {
  id: string;
  user_id: string;
  year: number;
  month: number;
  unassigned_credit_amount: number;
  created_at: string;
  updated_at: string;
}

export const useMonthlyUnassignedCredits = (userId?: string) => {
  const [monthlyCredits, setMonthlyCredits] = useState<MonthlyUnassignedCredit[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all monthly unassigned credits for the user
  const fetchMonthlyCredits = useCallback(async () => {
    if (!userId) {
      setMonthlyCredits([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('monthly_unassigned_credits')
        .select('*')
        .eq('user_id', userId)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) {
        console.error('Error fetching monthly unassigned credits:', error);
        setMonthlyCredits([]);
        return;
      }

      setMonthlyCredits(data || []);
    } catch (error) {
      console.error('Error fetching monthly unassigned credits:', error);
      setMonthlyCredits([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Add or update monthly unassigned credit (accumulates amounts)
  const addOrUpdateMonthlyCredit = async (year: number, month: number, amount: number) => {
    if (!userId) return { error: new Error('User not authenticated') };

    try {
      // First, check if a record already exists for this user, year, and month
      const { data: existingRecord, error: fetchError } = await supabase
        .from('monthly_unassigned_credits')
        .select('*')
        .eq('user_id', userId)
        .eq('year', year)
        .eq('month', month)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching existing monthly unassigned credit:', fetchError);
        return { error: fetchError };
      }

      let finalAmount: number;
      let result;

      if (existingRecord) {
        // If record exists, add the new amount to the existing amount
        finalAmount = existingRecord.unassigned_credit_amount + amount;
        
        const { data, error } = await supabase
          .from('monthly_unassigned_credits')
          .update({
            unassigned_credit_amount: finalAmount,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('year', year)
          .eq('month', month)
          .select()
          .single();

        if (error) {
          console.error('Error updating monthly unassigned credit:', error);
          return { error };
        }
        result = data;
      } else {
        // If no record exists, create a new one
        finalAmount = amount;
        
        const { data, error } = await supabase
          .from('monthly_unassigned_credits')
          .insert({
            user_id: userId,
            year,
            month,
            unassigned_credit_amount: amount
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating monthly unassigned credit:', error);
          return { error };
        }
        result = data;
      }

      // Update local state
      setMonthlyCredits(prev => {
        const existing = prev.find(item => item.year === year && item.month === month);
        if (existing) {
          return prev.map(item => 
            item.year === year && item.month === month 
              ? { ...item, unassigned_credit_amount: finalAmount, updated_at: new Date().toISOString() }
              : item
          );
        } else {
          return [...prev, result].sort((a, b) => b.year - a.year || b.month - a.month);
        }
      });

      return { data: result };
    } catch (error) {
      console.error('Error adding/updating monthly unassigned credit:', error);
      return { error };
    }
  };

  // Delete monthly unassigned credit
  const deleteMonthlyCredit = async (year: number, month: number) => {
    if (!userId) return { error: new Error('User not authenticated') };

    try {
      const { error } = await supabase
        .from('monthly_unassigned_credits')
        .delete()
        .eq('user_id', userId)
        .eq('year', year)
        .eq('month', month);

      if (error) {
        console.error('Error deleting monthly unassigned credit:', error);
        return { error };
      }

      // Update local state
      setMonthlyCredits(prev => prev.filter(item => !(item.year === year && item.month === month)));

      return { data: null };
    } catch (error) {
      console.error('Error deleting monthly unassigned credit:', error);
      return { error };
    }
  };

  // Get total unassigned credits across all months (memoized for performance)
  const getTotalUnassignedCredits = useCallback(() => {
    return monthlyCredits.reduce((sum, credit) => sum + credit.unassigned_credit_amount, 0);
  }, [monthlyCredits]);

  // Get unassigned credits for a specific month (memoized for performance)
  const getUnassignedCreditsForMonth = useCallback((year: number, month: number) => {
    const credit = monthlyCredits.find(item => item.year === year && item.month === month);
    return credit?.unassigned_credit_amount || 0;
  }, [monthlyCredits]);

  // Memoize the total for even better performance
  const totalUnassignedCredits = useMemo(() => {
    return monthlyCredits.reduce((sum, credit) => sum + credit.unassigned_credit_amount, 0);
  }, [monthlyCredits]);

  // Initialize data when userId changes
  useEffect(() => {
    fetchMonthlyCredits();
  }, [userId]);

  return {
    monthlyCredits,
    loading,
    fetchMonthlyCredits,
    addOrUpdateMonthlyCredit,
    deleteMonthlyCredit,
    getTotalUnassignedCredits,
    getUnassignedCreditsForMonth,
    totalUnassignedCredits // Add memoized total for direct access
  };
};
