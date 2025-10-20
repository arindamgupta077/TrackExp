import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Credit {
  id: string;
  category?: string;
  amount: number;
  description?: string;
  date: string;
  created_at: string;
}

export const useCredits = (userId: string | undefined) => {
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch credits
  const fetchCredits = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('credits')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      setCredits(data || []);
    } catch (error) {
      console.error('Error fetching credits:', error);
      toast({
        title: "Error",
        description: "Failed to load credits",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Add new credit
  const addCredit = async (newCredit: Omit<Credit, 'id' | 'created_at'>) => {
    if (!userId) {
      return { error: new Error('User not authenticated') };
    }

    try {
      const creditData = {
        user_id: userId,
        category: newCredit.category || null,
        amount: newCredit.amount,
        description: newCredit.description || null,
        date: newCredit.date
      };

      const { data, error } = await supabase
        .from('credits')
        .insert([creditData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Add to local state
      setCredits(prev => [data, ...prev]);
      
      const categoryText = newCredit.category ? ` for ${newCredit.category}` : ' (unassigned)';
      toast({
        title: "Credit added!",
        description: `₹${newCredit.amount.toLocaleString()} credit${categoryText} has been recorded.`,
      });

      return { data, error: null };
    } catch (error) {
      console.error('Error adding credit:', error);
      
      // Provide more specific error messages
      let errorMessage = "Failed to add credit";
      if (error instanceof Error) {
        if (error.message.includes('amount')) {
          errorMessage = "Please enter a valid amount";
        } else if (error.message.includes('date')) {
          errorMessage = "Please enter a valid date";
        }
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });

      return { error, data: null };
    }
  };

  // Delete credit
  const deleteCredit = async (creditId: string) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('credits')
        .delete()
        .eq('id', creditId);

      if (error) throw error;

      // Remove from local state
      setCredits(prev => prev.filter(credit => credit.id !== creditId));
      
      toast({
        title: "Credit deleted",
        description: "Credit has been removed successfully.",
      });
    } catch (error) {
      console.error('Error deleting credit:', error);
      toast({
        title: "Error",
        description: "Failed to delete credit",
        variant: "destructive",
      });
    }
  };

  // Update credit
  const updateCredit = async (creditId: string, updatedCredit: Omit<Credit, 'id' | 'created_at'>) => {
    if (!userId) return { error: new Error('User not authenticated') };

    try {
      const creditData = {
        category: updatedCredit.category || null,
        amount: updatedCredit.amount,
        description: updatedCredit.description || null,
        date: updatedCredit.date
      };

      const { data, error } = await supabase
        .from('credits')
        .update(creditData)
        .eq('id', creditId)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setCredits(prev => prev.map(credit => 
        credit.id === creditId ? { ...credit, ...data } : credit
      ));

      const categoryText = updatedCredit.category ? ` for ${updatedCredit.category}` : ' (unassigned)';
      toast({
        title: "Credit updated!",
        description: `₹${updatedCredit.amount.toLocaleString()} credit${categoryText} has been updated.`,
      });

      return { data, error: null };
    } catch (error) {
      console.error('Error updating credit:', error);
      
      let errorMessage = "Failed to update credit";
      if (error instanceof Error) {
        if (error.message.includes('amount')) {
          errorMessage = "Please enter a valid amount";
        } else if (error.message.includes('date')) {
          errorMessage = "Please enter a valid date";
        }
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });

      return { error, data: null };
    }
  };

  // Get unassigned credits total
  const getUnassignedCreditsTotal = () => {
    return credits
      .filter(credit => !credit.category)
      .reduce((sum, credit) => sum + credit.amount, 0);
  };

  // Get credits for a specific month
  const getCreditsForMonth = (monthYear: string) => {
    return credits.filter(credit => credit.date.startsWith(monthYear));
  };

  // Get credits for a specific category and month
  const getCreditsByCategory = (category: string, monthYear?: string) => {
    let filteredCredits = credits.filter(credit => credit.category === category);
    if (monthYear) {
      filteredCredits = filteredCredits.filter(credit => credit.date.startsWith(monthYear));
    }
    return filteredCredits;
  };

  // Initialize credits when component mounts
  useEffect(() => {
    fetchCredits();
  }, [userId]);

  return {
    credits,
    loading,
    addCredit,
    deleteCredit,
    updateCredit,
    fetchCredits,
    getUnassignedCreditsTotal,
    getCreditsForMonth,
    getCreditsByCategory
  };
};
