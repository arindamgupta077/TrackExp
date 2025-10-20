import { useState, useEffect, useRef } from 'react';
import { Dashboard } from '@/components/Dashboard';
import { AuthForm } from '@/components/AuthForm';
import { ExpenseForm } from '@/components/ExpenseForm';
import CreditForm from '@/components/CreditForm';
import MonthlySalaryModal from '@/components/MonthlySalaryModal';
import { BudgetManager } from '@/components/BudgetManager';
import InitialBankBalanceModal from '@/components/InitialBankBalanceModal';
import { useAuth } from '@/hooks/useAuth';
import { useExpenses } from '@/hooks/useExpenses';
import { useCredits } from '@/hooks/useCredits';
import { useCreditCardExpenses } from '@/hooks/useCreditCardExpenses';
import { useMonthlyRemainingBalances } from '@/hooks/useMonthlyRemainingBalances';
import { useMonthlyUnassignedCredits } from '@/hooks/useMonthlyUnassignedCredits';
import { useSalaryMonthsTracking } from '@/hooks/useSalaryMonthsTracking';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  name: string;
  phone?: string;
  initial_bank_balance?: number;
  has_set_initial_balance?: boolean;
}

const Index = () => {
  console.log('Index component rendering...');
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showCreditForm, setShowCreditForm] = useState(false);
  const [showMonthlySalaryModal, setShowMonthlySalaryModal] = useState(false);
  const [showBudgetManager, setShowBudgetManager] = useState(false);
  const [showInitialBankBalanceModal, setShowInitialBankBalanceModal] = useState(false);
  
  // Callback refs for expense operations
  const onExpenseAdded = useRef<(() => void) | null>(null);
  const onExpenseDeleted = useRef<(() => void) | null>(null);
  const onExpenseUpdated = useRef<(() => void) | null>(null);
  
  // Callback refs for credit operations
  const onCreditAdded = useRef<(() => void) | null>(null);
  const onCreditDeleted = useRef<(() => void) | null>(null);
  const onCreditUpdated = useRef<(() => void) | null>(null);
  const { user, loading: authLoading, signOut } = useAuth();
  const { expenses, loading: expensesLoading, addExpense, deleteExpense, updateExpense, refetch: refetchExpenses } = useExpenses(user?.id);
  const { credits, addCredit, deleteCredit, updateCredit, fetchCredits, getUnassignedCreditsTotal } = useCredits(user?.id);
  const { creditCardExpenses, addCreditCardExpense, deleteCreditCardExpense, updateCreditCardExpense, payCreditCardDue, bulkPayCreditCardDues } = useCreditCardExpenses(user?.id);
  const { addOrUpdateMonthlyCredit } = useMonthlyUnassignedCredits(user?.id);
  const { markSalaryMonth } = useSalaryMonthsTracking(user?.id);
  const currentYear = new Date().getFullYear();
  const { data: monthlyBalances, refetch: refetchMonthlyBalances, updateAllBalances: updateAllMonthlyBalances } = useMonthlyRemainingBalances(user?.id, currentYear);

  console.log('Index component state:', { user, authLoading, expensesLoading, userProfile });

  // Fetch user profile when user is authenticated
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) {
        setUserProfile(null);
        return;
      }

      try {
        // First try with all columns, if that fails, try with basic columns only
        let profileData: UserProfile | null = null;
        
        const { data, error } = await supabase
          .from('profiles')
          .select('name, phone, initial_bank_balance, has_set_initial_balance')
          .eq('user_id', user.id)
          .single();

        // If the query fails due to missing columns, try with basic columns only
        if (error && error.message.includes('column') && error.message.includes('does not exist')) {
          console.log('New columns not found, fetching basic profile data only');
          const basicResult = await supabase
            .from('profiles')
            .select('name, phone')
            .eq('user_id', user.id)
            .single();
          
          if (basicResult.error) {
            throw basicResult.error;
          }
          
          // Create a new object with the additional properties
          profileData = {
            ...basicResult.data,
            initial_bank_balance: 0,
            has_set_initial_balance: true // Set to true for existing users
          };
        } else if (error) {
          throw error;
        } else if (data !== null && 'name' in data) {
          profileData = data as UserProfile;
        }
        
        setUserProfile(profileData);
        
        // Check if user needs to set initial bank balance
        if (profileData && !profileData.has_set_initial_balance) {
          setShowInitialBankBalanceModal(true);
        }
      } catch (error) {
        console.error('Index: Error fetching user profile:', error);
      }
    };

    fetchUserProfile();
  }, [user]);

  // Ensure page starts at top when dashboard loads
  useEffect(() => {
    if (user && !authLoading) {
      // Immediately set scroll position to top without animation
      window.scrollTo(0, 0);
    }
  }, [user, authLoading]);

  // Ensure page starts at top on component mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      setUserProfile(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleAddExpense = async (newExpense: { paymentMethod: string; category: string; amount: number; description: string; date: string }) => {
    if (newExpense.paymentMethod === 'credit_card') {
      // Add to credit card expenses
      const result = await addCreditCardExpense({
        category: newExpense.category,
        amount: newExpense.amount,
        description: newExpense.description,
        date: newExpense.date
      });
      if (result && !result.error) {
        setShowExpenseForm(false);
        // Update and refresh monthly balances to update Accumulated Balance
        updateAllMonthlyBalances();
      }
    } else {
      // Add to regular expenses
      const result = await addExpense({
        category: newExpense.category,
        amount: newExpense.amount,
        description: newExpense.description,
        date: newExpense.date
      });
      if (result && !result.error) {
        setShowExpenseForm(false);
        // Trigger budget refresh callback
        if (onExpenseAdded.current) {
          onExpenseAdded.current();
        }
        // Update and refresh monthly balances to update Accumulated Balance
        updateAllMonthlyBalances();
      }
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    await deleteExpense(expenseId);
    // Trigger budget refresh callback
    if (onExpenseDeleted.current) {
      onExpenseDeleted.current();
    }
    // Update and refresh monthly balances to update Accumulated Balance
    updateAllMonthlyBalances();
  };

  const handleUpdateExpense = async (expenseId: string, updatedExpense: { category: string; amount: number; description: string; date: string }) => {
    const result = await updateExpense(expenseId, updatedExpense);
    if (result && !result.error) {
      // Expense updated successfully
      // Trigger budget refresh callback
      if (onExpenseUpdated.current) {
        onExpenseUpdated.current();
      }
      // Update and refresh monthly balances to update Accumulated Balance
      updateAllMonthlyBalances();
    }
  };

  const handleAddCredit = async (newCredit: { category?: string; amount: number; description?: string; date: string }) => {
    const result = await addCredit(newCredit);
    if (result && !result.error) {
      setShowCreditForm(false);
      // Refresh credits to ensure UI updates
      await fetchCredits();
      // Credit added successfully - budget will be automatically updated by the database trigger
      // Trigger budget refresh callback
      if (onCreditAdded.current) {
        onCreditAdded.current();
      }
    }
  };

  // Handle unassigned credit addition - refresh dashboard
  const handleUnassignedCreditAdded = () => {
    // Trigger budget refresh callback to update unassigned credits in dashboard
    if (onCreditAdded.current) {
      onCreditAdded.current();
    }
  };

  const handleDeleteCredit = async (creditId: string) => {
    await deleteCredit(creditId);
    // Refresh credits to ensure UI updates
    await fetchCredits();
    // Budget will be automatically updated by the database trigger
    // Trigger budget refresh callback
    if (onCreditDeleted.current) {
      onCreditDeleted.current();
    }
  };

  const handleUpdateCredit = async (creditId: string, updatedCredit: { category?: string; amount: number; description?: string; date: string }) => {
    const result = await updateCredit(creditId, updatedCredit);
    if (result && !result.error) {
      // Refresh credits to ensure UI updates
      await fetchCredits();
      // Credit updated successfully - budget will be automatically updated by the database trigger
      // Trigger budget refresh callback
      if (onCreditUpdated.current) {
        onCreditUpdated.current();
      }
    }
  };

  // Credit card expense handlers
  const handleDeleteCreditCardExpense = async (expenseId: string) => {
    await deleteCreditCardExpense(expenseId);
  };

  const handleUpdateCreditCardExpense = async (expenseId: string, updatedExpense: { category: string; amount: number; description: string; date: string }) => {
    const result = await updateCreditCardExpense(expenseId, updatedExpense);
    if (result && !result.error) {
      // Credit card expense updated successfully
    }
  };

  const handlePayCreditCardDue = async (expenseId: string) => {
    const result = await payCreditCardDue(expenseId);
    if (result && !result.error) {
      console.log('🔄 Credit card due paid - refreshing expenses and budget data...');
      
      // Small delay to ensure database operations are complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Explicitly refresh the expenses list to show the newly added expense
      await refetchExpenses();
      
      // Trigger budget refresh callback since we added a new expense
      if (onExpenseAdded.current) {
        onExpenseAdded.current();
      }
      
      console.log('✅ Expenses and budget data refreshed after credit card payment');
    }
  };

  const handleBulkPayCreditCardDues = async (expenseIds: string[]) => {
    const result = await bulkPayCreditCardDues(expenseIds);
    if (result && !result.error) {
      console.log('🔄 Bulk credit card dues paid - refreshing expenses and budget data...');
      
      // Small delay to ensure database operations are complete
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Explicitly refresh the expenses list to show the newly added expenses
      await refetchExpenses();
      
      // Trigger budget refresh callback since we added new expenses
      if (onExpenseAdded.current) {
        onExpenseAdded.current();
      }
      
      console.log('✅ Expenses and budget data refreshed after bulk credit card payment');
    }
  };

  const handleAddCreditCardExpense = async (newExpense: { category: string; amount: number; description: string; date: string }) => {
    const result = await addCreditCardExpense(newExpense);
    if (result && !result.error) {
      console.log('✅ Credit card expense added successfully');
    }
  };

  const handleAddMonthlySalary = async (salaryData: { month: string; amount: number; date: string }) => {
    try {
      // Ensure "Salary" category exists (create if it doesn't)
      const { data: existingCategory } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', user?.id)
        .eq('name', 'Salary')
        .maybeSingle();

      if (!existingCategory) {
        // Create the Salary category
        await supabase
          .from('categories')
          .insert([{ user_id: user?.id, name: 'Salary' }]);
      }

      // Get total budget for the selected month
      const { data: budgets, error: budgetError } = await supabase
        .from('budgets')
        .select(`
          amount,
          categories!inner(name)
        `)
        .eq('user_id', user?.id)
        .eq('month_year', salaryData.month);

      if (budgetError) {
        console.error('Error fetching budget data:', budgetError);
        throw budgetError;
      }

      // Calculate total budget for the month
      const totalBudget = budgets?.reduce((sum, budget) => sum + budget.amount, 0) || 0;

      // Determine how much salary to add as Salary credit and how much as unassigned credit
      let salaryCreditAmount = salaryData.amount;
      let unassignedCreditAmount = 0;

      if (totalBudget > 0 && salaryData.amount > totalBudget) {
        // Salary exceeds budget - add budget amount as Salary credit, excess as unassigned
        salaryCreditAmount = totalBudget;
        unassignedCreditAmount = salaryData.amount - totalBudget;
      }

      // Add salary credit (either full amount or budget amount)
      const salaryCreditData = {
        category: "Salary",
        amount: salaryCreditAmount,
        description: `Monthly salary for ${salaryData.month}${unassignedCreditAmount > 0 ? ` (budget portion)` : ''}`,
        date: salaryData.date
      };

      const salaryResult = await addCredit(salaryCreditData);
      if (salaryResult && !salaryResult.error) {
        // If there's excess amount, add it to monthly_unassigned_credits table
        if (unassignedCreditAmount > 0) {
          // Parse year and month from salaryData.month (format: YYYY-MM)
          const [year, month] = salaryData.month.split('-').map(Number);
          
          const unassignedResult = await addOrUpdateMonthlyCredit(year, month, unassignedCreditAmount);
          if (unassignedResult && !unassignedResult.error) {
            console.log(`Added excess salary amount ₹${unassignedCreditAmount} to monthly_unassigned_credits for ${salaryData.month}`);
          } else {
            console.error('Error adding excess salary to monthly_unassigned_credits:', unassignedResult?.error);
          }
        }

        setShowMonthlySalaryModal(false);
        
        // Mark this month as having salary added for Total calculation
        const [year, month] = salaryData.month.split('-').map(Number);
        await markSalaryMonth(year, month);
        
        // Refresh credits to ensure UI updates
        await fetchCredits();
        
        // Trigger credit refresh callback
        if (onCreditAdded.current) {
          onCreditAdded.current();
        }
      }
    } catch (error) {
      console.error('Error adding monthly salary:', error);
    }
  };

  console.log('Index component before render:', { authLoading, user });

  if (authLoading) {
    console.log('Showing loading screen...');
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    console.log('Showing auth form...');
    return <AuthForm />;
  }

  console.log('Showing dashboard...');
  return (
    <>
      <Dashboard 
        user={userProfile || { name: user.email || 'User', phone: '' }}
        expenses={expenses}
        credits={credits}
        creditCardExpenses={creditCardExpenses}
        getUnassignedCreditsTotal={getUnassignedCreditsTotal}
        onAddExpense={() => setShowExpenseForm(true)}
        onAddCredit={handleAddCredit}
        onOpenCreditForm={() => setShowCreditForm(true)}
        onDeleteExpense={handleDeleteExpense}
        onUpdateExpense={handleUpdateExpense}
        onDeleteCredit={handleDeleteCredit}
        onUpdateCredit={handleUpdateCredit}
        onDeleteCreditCardExpense={handleDeleteCreditCardExpense}
        onUpdateCreditCardExpense={handleUpdateCreditCardExpense}
        onPayCreditCardDue={handlePayCreditCardDue}
        onBulkPayCreditCardDues={handleBulkPayCreditCardDues}
        onAddCreditCardExpense={handleAddCreditCardExpense}
        onLogout={handleLogout}
        loading={expensesLoading}
        onExpenseAdded={onExpenseAdded}
        onExpenseDeleted={onExpenseDeleted}
        onExpenseUpdated={onExpenseUpdated}
        onCreditAdded={onCreditAdded}
        onCreditDeleted={onCreditDeleted}
        onCreditUpdated={onCreditUpdated}
        onManageBudget={() => setShowBudgetManager(true)}
        onAddMonthlyIncome={() => setShowMonthlySalaryModal(true)}
      />
      
      {showExpenseForm && (
        <ExpenseForm 
          onAddExpense={handleAddExpense}
          onClose={() => setShowExpenseForm(false)}
          creditCardExpenses={creditCardExpenses}
          monthlyBalances={monthlyBalances}
        />
      )}

      {showCreditForm && (
        <CreditForm 
          onAddCredit={handleAddCredit}
          onClose={() => setShowCreditForm(false)}
          onAddMonthlySalary={() => {
            setShowCreditForm(false);
            setShowMonthlySalaryModal(true);
          }}
          onUnassignedCreditAdded={handleUnassignedCreditAdded}
        />
      )}

      {showMonthlySalaryModal && (
        <MonthlySalaryModal
          isOpen={showMonthlySalaryModal}
          onClose={() => setShowMonthlySalaryModal(false)}
          onAddSalary={handleAddMonthlySalary}
          onManageBudget={() => {
            setShowMonthlySalaryModal(false);
            setShowBudgetManager(true);
          }}
        />
      )}

      {showBudgetManager && (
        <BudgetManager
          isOpen={showBudgetManager}
          onClose={() => setShowBudgetManager(false)}
        />
      )}

      {showInitialBankBalanceModal && (
        <InitialBankBalanceModal
          isOpen={showInitialBankBalanceModal}
          onComplete={() => {
            setShowInitialBankBalanceModal(false);
            // Refresh user profile to get updated data
            const fetchUserProfile = async () => {
              if (!user) return;
              try {
                const { data, error } = await supabase
                  .from('profiles')
                  .select('name, phone, initial_bank_balance, has_set_initial_balance')
                  .eq('user_id', user.id)
                  .single();
                if (!error && data !== null && 'name' in data) {
                  setUserProfile(data as UserProfile);
                }
              } catch (error) {
                console.error('Error refreshing user profile:', error);
              }
            };
            fetchUserProfile();
          }}
        />
      )}
    </>
  );
};

export default Index;
