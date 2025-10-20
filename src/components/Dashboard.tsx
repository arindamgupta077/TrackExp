import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, TrendingUp, Calendar, DollarSign, PieChart, User, BarChart3, Trash2, Menu, Settings, Edit, Target, Wallet, Tag, Bot, Search, Filter, Trash, CreditCard, Split, Repeat, PiggyBank, ChevronDown, ChevronUp } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { BudgetManager } from '@/components/BudgetManager';
import { CategoriesManager } from '@/components/CategoriesManager';

import { EditExpenseForm } from '@/components/EditExpenseForm';
import EditCreditForm from '@/components/EditCreditForm';
import ReassignCreditsModal from '@/components/ReassignCreditsModal';
import SplitCreditModal from '@/components/SplitCreditModal';
import { RecurringExpensesModal } from '@/components/RecurringExpensesModal';
import { CreditCardModal } from '@/components/CreditCardModal';
import { useBudgets } from '@/hooks/useBudgets';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories'
import { getIconByCategoryName } from '@/data/categoryIcons';
import { Credit } from '@/hooks/useCredits';
import type { CreditCardExpense } from '@/hooks/useCreditCardExpenses';
import type { CategorySummary } from '@/hooks/useCategorySummaries';
import { useIsMobile } from '@/hooks/use-mobile';
import { getCurrentDateStringInIST, getMonthYearInIST, formatDateInIST, formatCurrencyInIST } from '@/lib/dateUtils';
import { useMonthlyRemainingBalances } from '@/hooks/useMonthlyRemainingBalances';
import { useMonthlyUnassignedCredits } from '@/hooks/useMonthlyUnassignedCredits';
import { useSalaryMonthsTracking } from '@/hooks/useSalaryMonthsTracking';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { callSupabaseRpc } from '@/lib/supabaseRpc';
import heroImage from '@/assets/hero-bg.jpg';

interface User {
  name: string;
  phone?: string;
}

interface UserProfile {
  name: string;
  phone?: string;
  avatar_url?: string;
}

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  created_at: string;
}

interface DashboardProps {
  user: User;
  expenses: Expense[];
  credits: Credit[];
  creditCardExpenses: CreditCardExpense[];
  getUnassignedCreditsTotal: () => number;
  onAddExpense: () => void;
  onAddCredit: (credit: { category?: string; amount: number; description?: string; date: string }) => Promise<void>;
  onOpenCreditForm: () => void;
  onDeleteExpense: (expenseId: string) => void;
  onUpdateExpense: (expenseId: string, expense: { category: string; amount: number; description: string; date: string }) => void;
  onDeleteCredit: (creditId: string) => void;
  onUpdateCredit: (creditId: string, credit: { category?: string; amount: number; description?: string; date: string }) => void;
  onDeleteCreditCardExpense: (expenseId: string) => void;
  onUpdateCreditCardExpense: (expenseId: string, expense: { category: string; amount: number; description: string; date: string }) => void;
  onPayCreditCardDue: (expenseId: string) => void;
  onBulkPayCreditCardDues: (expenseIds: string[]) => void;
  onAddCreditCardExpense: (expense: { category: string; amount: number; description: string; date: string }) => void;
  onLogout: () => void;
  loading?: boolean;
  onExpenseAdded?: React.MutableRefObject<(() => void) | null>;
  onExpenseDeleted?: React.MutableRefObject<(() => void) | null>;
  onExpenseUpdated?: React.MutableRefObject<(() => void) | null>;
  onCreditAdded?: React.MutableRefObject<(() => void) | null>;
  onCreditDeleted?: React.MutableRefObject<(() => void) | null>;
  onCreditUpdated?: React.MutableRefObject<(() => void) | null>;
  onManageBudget?: () => void;
  onAddMonthlyIncome?: () => void;
}

export const Dashboard = ({ user, expenses, credits, creditCardExpenses, getUnassignedCreditsTotal, onAddExpense, onAddCredit, onOpenCreditForm, onDeleteExpense, onUpdateExpense, onDeleteCredit, onUpdateCredit, onDeleteCreditCardExpense, onUpdateCreditCardExpense, onPayCreditCardDue, onBulkPayCreditCardDues, onAddCreditCardExpense, onLogout, loading, onExpenseAdded, onExpenseDeleted, onExpenseUpdated, onCreditAdded, onCreditDeleted, onCreditUpdated, onManageBudget, onAddMonthlyIncome }: DashboardProps) => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const { categories } = useCategories(authUser?.id);
  const isMobile = useIsMobile();
  const { isDarkMode } = useTheme();
  // Credits are now passed as props from Index.tsx
  
  // Monthly remaining balances for Total Accumulated Balance calculation
  const currentYear = new Date().getFullYear();
  const { data: monthlyBalances, getTotalRemainingForMonth, getRemainingBalanceForMonth, updateAllBalances, getAccumulatedTotalForCategory } = useMonthlyRemainingBalances(authUser?.id, currentYear);
  const { getTotalUnassignedCredits: getTotalMonthlyUnassignedCredits, fetchMonthlyCredits, totalUnassignedCredits: memoizedTotalUnassignedCredits } = useMonthlyUnassignedCredits(authUser?.id);
  
  // Salary months tracking for consistent Total calculation
  const { getSalaryMonthsSet } = useSalaryMonthsTracking(authUser?.id);
  
  // No longer using getBudgetWithCarryover - removed carryover functionality

  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteCreditId, setDeleteCreditId] = useState<string | null>(null);
  const [editingCredit, setEditingCredit] = useState<Credit | null>(null);
  const [splittingCredit, setSplittingCredit] = useState<Credit | null>(null);
  const [splitLoading, setSplitLoading] = useState(false);
  const [showReassignCredits, setShowReassignCredits] = useState(false);

  // Utility functions for SplitCreditModal
  
  // Helper function to get category icon
  const getCategoryIcon = (categoryName: string): string => {
    const category = categories.find(cat => cat.name === categoryName);
    return category?.icon || getIconByCategoryName(categoryName);
  };

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 2; i <= currentYear + 2; i++) {
      years.push(i);
    }
    return years;
  };

  const generateMonthOptions = () => {
    const months = [];
    for (let i = 1; i <= 12; i++) {
      const date = new Date(2024, i - 1, 1);
      months.push({
        value: i,
        label: date.toLocaleDateString('en-US', { month: 'long' })
      });
    }
    return months;
  };

  const handleDashboardRefresh = useCallback(() => {
    navigate(0);
  }, [navigate]);

  // Handle split credit operation
  const handleSplitCredit = async (assignments: Array<{category: string, amount: string}>, targetYear: number, targetMonth: number) => {
    if (!splittingCredit) return;

    setSplitLoading(true);
    try {
      const targetDateString = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
      
      // Create credit records for each assignment
      for (const assignment of assignments) {
        if (assignment.category && assignment.amount && parseFloat(assignment.amount) > 0) {
          const creditData = {
            category: assignment.category,
            amount: parseFloat(assignment.amount),
            description: `Split from unassigned credit (${formatDateInIST(splittingCredit.date, { month: 'long', year: 'numeric' })}) to ${generateMonthOptions()[targetMonth - 1].label} ${targetYear}`,
            date: targetDateString
          };

          await onAddCredit(creditData);
        }
      }

      // Delete the original unassigned credit
      await onDeleteCredit(splittingCredit.id);
      
      setSplittingCredit(null);
      refreshBudgetData(true);
    } catch (error) {
      console.error('Error splitting credit:', error);
    } finally {
      setSplitLoading(false);
    }
  };
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showBudgetManager, setShowBudgetManager] = useState(false);
  const [showCategoriesManager, setShowCategoriesManager] = useState(false);
  const [showRecurringExpenses, setShowRecurringExpenses] = useState(false);
  const [showCreditCardModal, setShowCreditCardModal] = useState(false);
  const [isCreditCardExpanded, setIsCreditCardExpanded] = useState(false);
  const [categorySummaries, setCategorySummaries] = useState<CategorySummary[]>([]);
  
  // User profile state
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  // Touch gesture state for sidebar
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  
  const [monthlyBudget, setMonthlyBudget] = useState(0);
  const [remainingBudget, setRemainingBudget] = useState(0);
  const [monthlyBudgetLoading, setMonthlyBudgetLoading] = useState(true);
  const [remainingBudgetLoading, setRemainingBudgetLoading] = useState(true);
  const budgetCalculationRef = useRef<boolean>(false);
  const [isRefreshingBudget, setIsRefreshingBudget] = useState(false);
  const lastBudgetUpdateRef = useRef<number>(0);
  const [hasInitializedBudget, setHasInitializedBudget] = useState(false);
  const [lastCalculatedRemainingBudget, setLastCalculatedRemainingBudget] = useState<number | null>(null);

  // Bank balance state
  const [bankBalance, setBankBalance] = useState(0);
  const [bankBalanceLoading, setBankBalanceLoading] = useState(true);
  const [initialBankBalance, setInitialBankBalance] = useState(0);
  const [totalUnassignedCredits, setTotalUnassignedCredits] = useState(0);
  const bankBalanceInitializedRef = useRef(false);

  // Calculate totals
  const today = getCurrentDateStringInIST();
  const thisMonth = getMonthYearInIST().monthYear;

  const quickActionButtonBaseClass = 'glass-button hover:scale-110 px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg font-semibold w-full sm:w-auto';
  const addExpenseButtonClass = isDarkMode
    ? `${quickActionButtonBaseClass} bg-gradient-primary`
    : `${quickActionButtonBaseClass} bg-gradient-to-r from-purple-300 via-pink-300 to-pink-400 text-white border border-purple-300/60 shadow-[0_12px_28px_-14px_rgba(192,132,252,0.55)]`;
  const addCreditButtonClass = isDarkMode
    ? `${quickActionButtonBaseClass} bg-gradient-to-r from-green-500 to-emerald-500`
    : `${quickActionButtonBaseClass} bg-gradient-to-r from-green-300 via-emerald-300 to-teal-300 text-white border border-emerald-300/60 shadow-[0_12px_28px_-14px_rgba(34,197,94,0.45)]`;

  // Function to refresh monthly budget (static - only changes when budgets are modified)
  const refreshMonthlyBudget = useCallback(async () => {
    if (!authUser?.id) return;

    try {
      setMonthlyBudgetLoading(true);
      let totalMonthlyBudget = 0;

      // Get category summaries for the current month
      const { data: categorySummaryData, error: summaryError } = await callSupabaseRpc<CategorySummary[]>(
        'get_category_summaries',
        {
          target_user_id: authUser.id,
          target_month_year: thisMonth
        }
      );

      if (summaryError) {
        console.warn('⚠️ Category summaries query error:', summaryError);
        // Fallback to old method if summaries don't exist
        const { data: categories } = await supabase
          .from('categories')
          .select('id, name')
          .eq('user_id', authUser.id);

        if (categories) {
          for (const category of categories) {
            const { data: budgetData } = await supabase
              .from('budgets')
              .select('amount')
              .eq('user_id', authUser.id)
              .eq('category_id', category.id)
              .eq('month_year', thisMonth)
              .maybeSingle();
            
            totalMonthlyBudget += budgetData?.amount || 0;
          }
        }
      } else {
        // Use category summaries data
        totalMonthlyBudget = (categorySummaryData ?? []).reduce((sum, summary) => sum + (summary.total_budget || 0), 0);
      }

      setMonthlyBudget(totalMonthlyBudget);
      
      
    } catch (error) {
      console.error('Error refreshing monthly budget:', error);
      setMonthlyBudget(0);
    } finally {
      setMonthlyBudgetLoading(false);
    }
  }, [authUser?.id, thisMonth]);

  // Function to refresh remaining budget (dynamic - changes when expenses change)
  const refreshRemainingBudget = useCallback(async () => {
    if (!authUser?.id || isRefreshingBudget) return; // Prevent multiple simultaneous calls

    // Throttle updates to prevent rapid toggling (minimum 500ms between updates)
    const now = Date.now();
    if (now - lastBudgetUpdateRef.current < 500) {
      console.log('⏱️ Throttling budget update (too soon since last update)');
      return;
    }

    try {
      console.log('🔄 Refreshing remaining budget from category summaries...');
      lastBudgetUpdateRef.current = now;
      setIsRefreshingBudget(true);
      setRemainingBudgetLoading(true);
      let totalRemainingBudget = 0;

      // Get category summaries for the current month
      const { data: categorySummaryData, error: summaryError } = await callSupabaseRpc<CategorySummary[]>(
        'get_category_summaries',
        {
          target_user_id: authUser.id,
          target_month_year: thisMonth
        }
      );

      if (summaryError) {
        console.warn('⚠️ Category summaries query error:', summaryError);
        // Fallback to old method if summaries don't exist
        const { data: categories } = await supabase
          .from('categories')
          .select('id, name')
          .eq('user_id', authUser.id);

        if (categories) {
          for (const category of categories) {
            const { data: budgetData } = await supabase
              .from('budgets')
              .select('amount')
              .eq('user_id', authUser.id)
              .eq('category_id', category.id)
              .eq('month_year', thisMonth)
              .maybeSingle();
            
            const budgetAmount = budgetData?.amount || 0;
            
            // Calculate spent amount for this category in current month using local expenses array
            const monthStart = `${thisMonth}-01`;
            const nextMonth = new Date(monthStart);
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            const monthEnd = nextMonth.toISOString().slice(0, 10);

            const spentAmount = expenses
              .filter(expense => 
                expense.category === category.name && 
                expense.date >= monthStart && 
                expense.date < monthEnd
              )
              .reduce((sum, expense) => sum + expense.amount, 0);
            const remainingAmount = budgetAmount - spentAmount;
            
            totalRemainingBudget += remainingAmount;
          }
        }
      } else {
        // Use category summaries data
        totalRemainingBudget = (categorySummaryData ?? []).reduce((sum, summary) => sum + (summary.remaining_balance || 0), 0);
      }

      console.log('✅ Remaining budget updated from summaries:', totalRemainingBudget);
      
      // Always update the remaining budget value
      setRemainingBudget(totalRemainingBudget);
      setLastCalculatedRemainingBudget(totalRemainingBudget);
    } catch (error) {
      console.error('❌ Error refreshing remaining budget:', error);
      setRemainingBudget(0);
    } finally {
      setRemainingBudgetLoading(false);
      setIsRefreshingBudget(false);
    }
  }, [authUser?.id, thisMonth, expenses, isRefreshingBudget]);

  // Function to update category summaries for current month
  const updateCategorySummaries = useCallback(async () => {
    if (!authUser?.id) return;

    try {
      console.log('🔄 Updating category summaries for current month...');
      const { error } = await callSupabaseRpc<null>(
        'update_all_category_summaries',
        {
          target_user_id: authUser.id,
          target_month_year: thisMonth
        }
      );

      if (error) {
        console.warn('⚠️ Could not update category summaries:', error);
      } else {
        console.log('✅ Category summaries updated successfully');
      }
    } catch (error) {
      console.error('❌ Error updating category summaries:', error);
    }
  }, [authUser?.id, thisMonth]);

  // Function to refresh all budget data (for initial load and budget changes)
  // This will be defined after refreshBankBalance to avoid dependency issues

  // Function to fetch initial bank balance from user profile
  const fetchInitialBankBalance = useCallback(async () => {
    if (!authUser?.id) return;

    try {
      // First try with the new column, if it fails, use default value
      type InitialBankBalanceRow = { initial_bank_balance: number | null };

      const { data, error } = await supabase
        .from('profiles')
        .select('initial_bank_balance')
        .eq('user_id', authUser.id)
        .maybeSingle<InitialBankBalanceRow>();

      if (error) {
        console.log('Initial bank balance column not found, using default value');
        setInitialBankBalance(0);
        return;
      }

      setInitialBankBalance(data?.initial_bank_balance ?? 0);
    } catch (error) {
      console.error('Error fetching initial bank balance:', error);
      setInitialBankBalance(0);
    }
  }, [authUser?.id]);

  // Function to fetch user profile data
  const fetchUserProfile = useCallback(async () => {
    if (!authUser?.id) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, phone, avatar_url')
        .eq('user_id', authUser.id)
        .single();

      if (error) {
        console.log('Profile fetch error:', error);
        return;
      }

      setUserProfile(data ? {
        name: data.name,
        phone: data.phone ?? undefined,
        avatar_url: data.avatar_url ?? undefined
      } : null);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }, [authUser?.id]);

  // Touch gesture handlers for sidebar
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!showMobileSidebar) return;

    console.log('Touch start:', e.targetTouches[0].clientX);
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsDragging(false);
    setDragOffset(0);
  }, [showMobileSidebar]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!showMobileSidebar || touchStart === null) return;

    const currentTouch = e.targetTouches[0].clientX;
    const diff = currentTouch - touchStart;

    console.log('Touch move:', { currentTouch, diff, dragOffset });

    if (diff <= 0) {
      return;
    }

    const activationThreshold = 12;
    if (!isDragging && diff < activationThreshold) {
      return;
    }

    if (!isDragging) {
      setIsDragging(true);
    }

    e.preventDefault();
    setDragOffset(diff);
  }, [showMobileSidebar, touchStart, isDragging, dragOffset]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!showMobileSidebar || touchStart === null) return;

    if (isDragging) {
      e.preventDefault();
    }

    console.log('Touch end:', { dragOffset, isDragging });

    if (isDragging) {
      // Threshold for closing the sidebar (30% of viewport width)
      const threshold = typeof window !== 'undefined' ? window.innerWidth * 0.3 : 120;

      if (dragOffset > threshold) {
        console.log('Closing sidebar - threshold exceeded');
        setShowMobileSidebar(false);
      } else {
        console.log('Snapping back - threshold not met');
      }
    }

    setIsDragging(false);
    setTouchStart(null);
    setTouchEnd(null);
    setDragOffset(0);
  }, [showMobileSidebar, touchStart, dragOffset, isDragging]);

  // Function to get total unassigned credits from monthly_unassigned_credits table (optimized)
  const fetchTotalUnassignedCredits = useCallback(async () => {
    try {
      console.log('🔍 Getting unassigned credits from monthly_unassigned_credits table');
      // Use the hook's function to get current total instead of memoized value
      const total = getTotalMonthlyUnassignedCredits();
      console.log('💰 Total unassigned credits from monthly table:', total);
      console.log('💰 Previous total in state:', totalUnassignedCredits);
      setTotalUnassignedCredits(total);
      console.log('✅ Updated totalUnassignedCredits state to:', total);
    } catch (error) {
      console.error('❌ Error getting unassigned credits:', error);
      setTotalUnassignedCredits(0);
    }
  }, [getTotalMonthlyUnassignedCredits, totalUnassignedCredits]);

  // Function to calculate and update bank balance
  const calculateBankBalance = useCallback((accumulatedBalance: number) => {
    const calculatedBankBalance = accumulatedBalance + totalUnassignedCredits + initialBankBalance;
    
    // Debug logging for bank balance calculation
    console.log('🏦 Bank Balance Calculation:', {
      totalAccumulatedBalance: accumulatedBalance,
      totalUnassignedCredits: totalUnassignedCredits,
      initialBankBalance: initialBankBalance,
      calculatedBankBalance: calculatedBankBalance,
      timestamp: new Date().toLocaleTimeString()
    });
    
    setBankBalance(calculatedBankBalance);
    setBankBalanceLoading(false);
  }, [totalUnassignedCredits, initialBankBalance]);

  // Function to refresh bank balance data (optimized - only fetch when needed)
  const refreshBankBalance = useCallback(async (forceRefresh = false) => {
    if (!authUser?.id) return;

    // Only set loading to true on initial load
    if (!bankBalanceInitializedRef.current) {
      setBankBalanceLoading(true);
    }
    
    try {
      await fetchInitialBankBalance();
      
      // Only refresh monthly credits if forced or on initial load
      if (forceRefresh || !bankBalanceInitializedRef.current) {
        console.log('🔄 Force refreshing monthly credits...');
        await fetchMonthlyCredits();
        console.log('✅ Monthly credits refreshed');
      }
      
      console.log('🔄 Fetching total unassigned credits');
      await fetchTotalUnassignedCredits();
    } catch (error) {
      console.error('Error refreshing bank balance data:', error);
    }
  }, [authUser?.id, fetchInitialBankBalance, fetchMonthlyCredits, fetchTotalUnassignedCredits]);

  // Function to refresh all budget data (for initial load and budget changes) - optimized
  const refreshBudgetData = useCallback(async (forceRefresh = false) => {
    try {
      console.log('🔄 Refreshing all budget data...');
      // First update category summaries to ensure data is current
      await updateCategorySummaries();
      // Then refresh budget calculations
      await refreshMonthlyBudget();
      await refreshRemainingBudget();
      // Also update and refresh monthly remaining balances for Total Accumulated Balance
      console.log('🔄 Updating monthly remaining balances...');
      await updateAllBalances();
      // Refresh bank balance (only force refresh unassigned credits when needed)
      await refreshBankBalance(forceRefresh);
      console.log('✅ All budget data refreshed successfully');
    } catch (error) {
      console.error('❌ Error refreshing budget data:', error);
    }
  }, [updateCategorySummaries, refreshMonthlyBudget, refreshRemainingBudget, updateAllBalances, refreshBankBalance]);

  
  // Credits are now passed as props, no need to fetch them here

  // Set up expense operation callbacks to refresh budget data
  useEffect(() => {
    if (onExpenseAdded) {
      onExpenseAdded.current = () => {
        console.log('🔄 Expense added - refreshing budget data...');
        refreshBudgetData();
      };
    }
  }, [onExpenseAdded, refreshBudgetData]);

  useEffect(() => {
    if (onExpenseDeleted) {
      onExpenseDeleted.current = () => {
        console.log('🔄 Expense deleted - refreshing budget data...');
        refreshBudgetData();
      };
    }
  }, [onExpenseDeleted, refreshBudgetData]);

  useEffect(() => {
    if (onExpenseUpdated) {
      onExpenseUpdated.current = () => {
        console.log('🔄 Expense updated - refreshing budget data...');
        refreshBudgetData();
      };
    }
  }, [onExpenseUpdated, refreshBudgetData]);

  // Set up credit operation callbacks to refresh budget data
  useEffect(() => {
    if (onCreditAdded) {
      onCreditAdded.current = () => {
        console.log('🔄 Credit added - refreshing budget data...');
        refreshBudgetData(true); // Force refresh for credit additions (may include unassigned credits)
      };
    }
  }, [onCreditAdded, refreshBudgetData]);

  useEffect(() => {
    if (onCreditDeleted) {
      onCreditDeleted.current = () => {
        console.log('🔄 Credit deleted - refreshing budget data...');
        refreshBudgetData(true); // Force refresh for credit deletions (may affect unassigned credits)
      };
    }
  }, [onCreditDeleted, refreshBudgetData]);

  useEffect(() => {
    if (onCreditUpdated) {
      onCreditUpdated.current = () => {
        console.log('🔄 Credit updated - refreshing budget data...');
        refreshBudgetData(true); // Force refresh for credit updates (may affect unassigned credits)
      };
    }
  }, [onCreditUpdated, refreshBudgetData]);

  // Initialize bank balance data only once when user is available
  useEffect(() => {
    if (authUser?.id && !bankBalanceInitializedRef.current) {
      bankBalanceInitializedRef.current = true;
      refreshBankBalance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id]); // Remove refreshBankBalance from dependencies to prevent multiple calls

  // Fetch category summaries for credit card expenses grouping
  const fetchCategorySummaries = useCallback(async () => {
    if (!authUser?.id) return;

    try {
      const { data: summaryData, error } = await callSupabaseRpc<CategorySummary[]>(
        'get_category_summaries',
        {
          target_user_id: authUser.id,
          target_month_year: thisMonth
        }
      );

      if (error) {
        console.warn('⚠️ Category summaries query error:', error);
        setCategorySummaries([]);
      } else {
        setCategorySummaries(summaryData ?? []);
      }
    } catch (error) {
      console.error('❌ Error fetching category summaries:', error);
      setCategorySummaries([]);
    }
  }, [authUser?.id, thisMonth]);

  // Initialize user profile data when user is available
  useEffect(() => {
    if (authUser?.id) {
      fetchUserProfile();
      fetchCategorySummaries();
    }
  }, [authUser?.id, fetchUserProfile, fetchCategorySummaries]);

  // Calculate Total Accumulated Balance (same logic as Monthly Remaining Balances Total column)
  const totalAccumulatedBalance = monthlyBalances.length > 0 
    ? monthlyBalances.reduce((sum, categoryData) => {
        // Use the same calculation as Monthly Remaining Balances Total column
        // This includes salary months and ensures consistency across all tables
        const categoryTotal = getAccumulatedTotalForCategory(categoryData);
        return sum + categoryTotal;
      }, 0)
    : 0;

  // Get accumulated balance for a specific category from Monthly Remaining Balances
  const getCategoryAccumulatedBalance = useCallback((categoryName: string) => {
    const categoryData = monthlyBalances.find(balance => balance.category_name === categoryName);
    if (!categoryData) return 0;
    
    // Use the same calculation as Monthly Remaining Balances Total column
    // This includes salary months and ensures consistency across all tables
    return getAccumulatedTotalForCategory(categoryData);
  }, [monthlyBalances, getAccumulatedTotalForCategory]);

  // Group credit card expenses by category
  interface CreditCardExpenseGroup {
    category: string;
    totalAmount: number;
    expenses: CreditCardExpense[];
  }

  const groupedCreditCardExpenses = useMemo<CreditCardExpenseGroup[]>(() => {
    const grouped = creditCardExpenses.reduce<Record<string, CreditCardExpenseGroup>>((acc, expense) => {
      if (!acc[expense.category]) {
        acc[expense.category] = {
          category: expense.category,
          totalAmount: 0,
          expenses: []
        };
      }
      acc[expense.category].totalAmount += expense.amount;
      acc[expense.category].expenses.push(expense);
      return acc;
    }, {});

    // Sort by credit card impact percentage (highest impact first)
    return Object.values(grouped).sort((a, b) => {
      const getImpactPercentage = (group: CreditCardExpenseGroup) => {
        const accumulatedBalance = getCategoryAccumulatedBalance(group.category);
        return (group.totalAmount / Math.max(accumulatedBalance, group.totalAmount)) * 100;
      };
      
      const impactA = getImpactPercentage(a);
      const impactB = getImpactPercentage(b);
      
      return impactB - impactA; // Sort in descending order (highest impact first)
    });
  }, [creditCardExpenses, getCategoryAccumulatedBalance]);

  // Get category summary data for a specific category
  const getCategorySummary = useCallback((categoryName: string) => {
    return categorySummaries.find(summary => summary.category_name === categoryName);
  }, [categorySummaries]);

  // Debug logging for monthly balances refresh
  console.log(`📊 Monthly Balances Data:`, {
    length: monthlyBalances.length,
    totalAccumulatedBalance: `₹${formatCurrencyInIST(totalAccumulatedBalance)}`,
    timestamp: new Date().toLocaleTimeString()
  });

  // Calculate bank balance when totalAccumulatedBalance changes
  useEffect(() => {
    calculateBankBalance(totalAccumulatedBalance);
  }, [totalAccumulatedBalance, calculateBankBalance]);

  // Update unassigned credits when monthly credits change (optimized with debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchTotalUnassignedCredits();
    }, 100); // Debounce by 100ms to prevent excessive calls

    return () => clearTimeout(timeoutId);
  }, [fetchTotalUnassignedCredits, memoizedTotalUnassignedCredits]);

  // Calculate totals
  const todayTotal = expenses
    .filter(expense => expense.date === today)
    .reduce((sum, expense) => sum + expense.amount, 0);
     
  const monthTotal = expenses
    .filter(expense => expense.date.startsWith(thisMonth))
    .reduce((sum, expense) => sum + expense.amount, 0);
     
  const yearTotal = expenses
    .filter(expense => expense.date.startsWith(new Date().getFullYear().toString()))
    .reduce((sum, expense) => sum + expense.amount, 0);

  // Calculate credit totals
  const todayCredits = credits
    .filter(credit => credit.date === today)
    .reduce((sum, credit) => sum + credit.amount, 0);
     
  const monthCredits = credits
    .filter(credit => credit.date.startsWith(thisMonth))
    .reduce((sum, credit) => sum + credit.amount, 0);
     
  const yearCredits = credits
    .filter(credit => credit.date.startsWith(new Date().getFullYear().toString()))
    .reduce((sum, credit) => sum + credit.amount, 0);

  // Unassigned credits are now fetched from monthly_unassigned_credits table
  // const unassignedCredits = getUnassignedCreditsTotal(); // Removed - using monthly table instead

  // Get recent expenses (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoString = thirtyDaysAgo.toISOString().split('T')[0];
   
  const recentExpenses = expenses
    .filter(expense => expense.date >= thirtyDaysAgoString)
    .sort((a, b) => {
      // First sort by date (newest first)
      const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateComparison !== 0) return dateComparison;
       
      // If dates are the same, sort by created_at timestamp (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  // Get recent credits (last 30 days)
  const recentCredits = credits
    .filter(credit => credit.date >= thirtyDaysAgoString)
    .sort((a, b) => {
      // First sort by date (newest first)
      const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateComparison !== 0) return dateComparison;
       
      // If dates are the same, sort by created_at timestamp (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });


  // Calculate monthly budget and remaining budget (initial load and month changes)
  useEffect(() => {
    if (authUser?.id && !budgetCalculationRef.current && !loading) {
      console.log('🚀 Initial load - refreshing budget data...');
      budgetCalculationRef.current = true; // Mark as started
      refreshBudgetData();
    }
  }, [authUser?.id, thisMonth, loading, refreshBudgetData]);


  // Mark budget as initialized after first successful calculation
  useEffect(() => {
    if (monthlyBudget >= 0 && !hasInitializedBudget && !remainingBudgetLoading && !monthlyBudgetLoading) {
      console.log('✅ Budget initialization complete');
      setHasInitializedBudget(true);
      setLastCalculatedRemainingBudget(remainingBudget);
    }
  }, [monthlyBudget, remainingBudget, hasInitializedBudget, remainingBudgetLoading, monthlyBudgetLoading]);

  // Single effect to refresh remaining budget when expenses change
  useEffect(() => {
    if (authUser?.id && hasInitializedBudget && !loading) {
      // Only refresh if budget has been initialized and expenses are loaded
      // Note: expenses.length can be 0 if user has no expenses, which is valid
      const timeoutId = setTimeout(() => {
        // Refresh with full database calculation for accuracy
        refreshRemainingBudget();
      }, 300); // 300ms delay to prevent rapid updates

      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses, authUser?.id, hasInitializedBudget, loading]); // Only depend on expenses array, not individual properties

  // Additional effect to trigger remaining budget calculation when expenses are first loaded
  useEffect(() => {
    if (authUser?.id && !loading && expenses.length > 0 && !hasInitializedBudget) {
      console.log('🚀 Expenses loaded - triggering remaining budget calculation');
      const timeoutId = setTimeout(() => {
        refreshRemainingBudget();
      }, 100);

      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses, authUser?.id, loading, hasInitializedBudget]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background with hero image */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      
      {/* Glass overlay */}
      <div className="absolute inset-0 bg-gradient-surface" />
      
      {/* Content */}
      <div className="relative z-10 p-3 sm:p-6 max-w-7xl mx-auto">
        {/* Current Date - Desktop Only */}
        <div className="hidden sm:block absolute top-4 right-6 text-xs text-muted-foreground font-medium tracking-wide">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            timeZone: 'Asia/Kolkata'
          })}
        </div>
        
        {/* Header */}
        <header className="mb-3 sm:mb-8 fade-in">
          {/* Top Row - TrackExp Title and Navigation */}
          <div className="flex items-center justify-between mb-0.5">
             {/* TrackExp Title - Top Left */}
             <div className="flex-1 min-w-0">
               <div className="flex flex-col">
                 <div className="premium-glow">
                  <h1
                    className="premium-heading text-3xl sm:text-3xl md:text-4xl lg:text-5xl font-heading mb-0.5 sm:mb-2 truncate cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/70"
                    role="button"
                    tabIndex={0}
                    onClick={handleDashboardRefresh}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleDashboardRefresh();
                      }
                    }}
                  >
                    TrackExp
                  </h1>
                 </div>
                 <p className="text-muted-foreground text-sm sm:text-base font-medium tracking-wide">Your personal finance manager</p>
               </div>
             </div>
            
            {/* Mobile Menu Button */}
            <div className="sm:hidden">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowMobileSidebar(!showMobileSidebar)}
                className={`glass-button transition-all duration-200 ease-out ${
                  showMobileSidebar 
                    ? 'bg-white/20 border-white/40 scale-95' 
                    : 'hover:bg-white/10 hover:scale-105'
                }`}
                style={{
                  transform: showMobileSidebar ? 'scale(0.95)' : 'scale(1)',
                  transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                }}
              >
                <Menu 
                  className={`h-4 w-4 transition-transform duration-200 ${
                    showMobileSidebar ? 'rotate-90' : 'rotate-0'
                  }`} 
                />
              </Button>
            </div>
            
            {/* Desktop Navigation - Top Right */}
            <div className="hidden sm:flex gap-2 md:gap-3 flex-wrap justify-end">
              {user && (
                <>
                  <Button 
                    variant="outline" 
                    size="default"
                    onClick={onManageBudget || (() => setShowBudgetManager(true))}
                    className="glass-button border-green-500/50 hover:bg-green-500/20 text-sm px-4 py-2.5"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    <span className="hidden md:inline">Budgets</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="default"
                    onClick={() => setShowRecurringExpenses(true)}
                    className="glass-button border-orange-500/50 hover:bg-orange-500/20 text-sm px-4 py-2.5"
                  >
                    <Repeat className="h-4 w-4 mr-2" />
                    <span className="hidden md:inline">Expense Automation</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="default"
                    onClick={() => navigate('/analytics')}
                    className="glass-button border-accent/50 hover:bg-accent/20 text-sm px-4 py-2.5"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    <span className="hidden md:inline">Analytics</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="default"
                    onClick={() => navigate('/ai-agent')}
                    className="glass-button border-blue-500/50 hover:bg-blue-500/20 text-sm px-4 py-2.5"
                  >
                    <Bot className="h-4 w-4 mr-2" />
                    <span className="hidden md:inline">AI Agent</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="default"
                    onClick={() => navigate('/learn-more')}
                    className="glass-button border-purple-500/50 hover:bg-purple-500/20 text-sm px-4 py-2.5"
                  >
                    <span className="hidden md:inline">Learn More</span>
                    <span className="md:hidden">Learn</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="default"
                    onClick={() => navigate('/profile')}
                    className="glass-button border-primary/50 hover:bg-primary/20 text-sm px-4 py-2.5"
                  >
                    <User className="h-4 w-4 mr-2" />
                    <span className="hidden md:inline">Profile</span>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Lower Navbar - Action Buttons (Desktop Only) */}
          <div className="hidden sm:flex sm:justify-end items-center gap-2">
            {user && (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onAddMonthlyIncome}
                  className="glass-button border-cyan-500/50 hover:bg-cyan-500/20 text-sm px-4 py-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Monthly Income
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowCreditCardModal(true)}
                  className="glass-button border-red-500/50 hover:bg-red-500/20 text-sm px-4 py-2"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Credit Card
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowReassignCredits(true)}
                  className="glass-button border-yellow-500/50 hover:bg-yellow-500/20 text-sm px-4 py-2"
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Unassigned Credits
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowCategoriesManager(true)}
                  className="glass-button border-purple-500/50 hover:bg-purple-500/20 text-sm px-3 py-2"
                >
                  <Tag className="h-4 w-4 mr-2" />
                  <span className="hidden md:inline">Category</span>
                  <span className="md:hidden">Categories</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/manage-transactions')}
                  className="glass-button border-blue-500/50 hover:bg-blue-500/20 text-sm px-4 py-2"
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Manage Transactions
                </Button>
              </>
            )}
            
          </div>
          
          {/* Mobile Navigation Menu */}
          {showMobileMenu && (
            <div className="sm:hidden bg-white/10 backdrop-blur-lg rounded-lg p-4 mb-4 border border-white/20">
              <div className="flex flex-col gap-2">
                {user && (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        if (onManageBudget) {
                          onManageBudget();
                        } else {
                          setShowBudgetManager(true);
                        }
                        setShowMobileMenu(false);
                      }}
                      className="glass-button border-green-500/50 hover:bg-green-500/20 justify-start"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Budgets
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowRecurringExpenses(true);
                        setShowMobileMenu(false);
                      }}
                      className="glass-button border-orange-500/50 hover:bg-orange-500/20 justify-start"
                    >
                      <Repeat className="h-4 w-4 mr-2" />
                      Expense Automation
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        navigate('/analytics');
                        setShowMobileMenu(false);
                      }}
                      className="glass-button border-accent/50 hover:bg-accent/20 justify-start"
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Analytics
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        navigate('/ai-agent');
                        setShowMobileMenu(false);
                      }}
                      className="glass-button border-blue-500/50 hover:bg-blue-500/20 justify-start"
                    >
                      <Bot className="h-4 w-4 mr-2" />
                      AI Agent
                    </Button>
                    {/* Action Buttons for Mobile */}
                    <div className="border-t border-white/20 my-2"></div>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        onAddMonthlyIncome();
                        setShowMobileMenu(false);
                      }}
                      className="glass-button border-cyan-500/50 hover:bg-cyan-500/20 justify-start"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Monthly Income
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowCreditCardModal(true);
                        setShowMobileMenu(false);
                      }}
                      className="glass-button border-red-500/50 hover:bg-red-500/20 justify-start"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Credit Card
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowReassignCredits(true);
                        setShowMobileMenu(false);
                      }}
                      className="glass-button border-yellow-500/50 hover:bg-yellow-500/20 justify-start"
                    >
                      <Wallet className="h-4 w-4 mr-2" />
                      Unassigned Credits
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowCategoriesManager(true);
                        setShowMobileMenu(false);
                      }}
                      className="glass-button border-purple-500/50 hover:bg-purple-500/20 justify-start"
                    >
                      <Tag className="h-4 w-4 mr-2" />
                      Category
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        navigate('/manage-transactions');
                        setShowMobileMenu(false);
                      }}
                      className="glass-button border-blue-500/50 hover:bg-blue-500/20 justify-start"
                    >
                      <Trash className="h-4 w-4 mr-2" />
                      Manage Transactions
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </header>

        {/* Mobile Sidebar */}
        {showMobileSidebar && (
          <>
            {/* Overlay */}
            <div 
              className="fixed inset-0 mobile-sidebar-overlay z-40 sm:hidden transition-all duration-200 ease-out"
              onClick={() => setShowMobileSidebar(false)}
              style={{
                opacity: showMobileSidebar ? (isDragging ? 0.65 : 1) : 0,
                animation: showMobileSidebar ? 'fadeIn 0.2s ease-out' : 'fadeOut 0.2s ease-out'
              }}
            />
            
            {/* Sidebar */}
            <div 
              className="mobile-sidebar-panel fixed right-0 top-0 h-full w-80 max-w-[85vw] border-l z-50 sm:hidden"
              style={{
                transform: isDragging 
                  ? `translateX(${Math.min(dragOffset, 320)}px)` 
                  : showMobileSidebar ? 'translateX(0)' : 'translateX(100%)',
                transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.25s ease-out, opacity 0.2s ease-out',
                boxShadow: showMobileSidebar ? 'var(--shadow-card)' : 'none',
                opacity: showMobileSidebar ? 1 : 0
              }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={(e) => {
                if (!showMobileSidebar) return;
                
                // Don't interfere with button clicks
                const target = e.target as HTMLElement;
                if (target.closest('button')) {
                  return;
                }
                
                e.preventDefault();
                console.log('Mouse down:', e.clientX);
                setTouchStart(e.clientX);
                setIsDragging(true);
                setDragOffset(0);
              }}
              onMouseMove={(e) => {
                if (!showMobileSidebar || !touchStart || !isDragging) return;
                e.preventDefault();
                const diff = e.clientX - touchStart;
                console.log('Mouse move:', { clientX: e.clientX, diff, dragOffset });
                if (diff > 0) {
                  setDragOffset(diff);
                }
              }}
              onMouseUp={(e) => {
                if (!showMobileSidebar || !touchStart) return;
                e.preventDefault();
                console.log('Mouse up:', { dragOffset });
                setIsDragging(false);
                const threshold = 120;
                if (dragOffset > threshold) {
                  console.log('Closing sidebar - threshold exceeded');
                  setShowMobileSidebar(false);
                } else {
                  console.log('Snapping back - threshold not met');
                }
                setTouchStart(null);
                setDragOffset(0);
              }}
            >
              <div className="flex flex-col h-full">
                {/* Header with Profile */}
                <div 
                  className="mobile-sidebar-header p-6"
                  style={{
                    animation: showMobileSidebar ? 'slideInFromTop 0.3s ease-out 0.05s both' : 'none'
                  }}
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16">
                      <AvatarImage 
                        src={userProfile?.avatar_url} 
                        alt={userProfile?.name || 'User'} 
                      />
                      <AvatarFallback className="bg-gradient-primary text-white text-2xl font-bold">
                        {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : <User className="h-8 w-8" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-foreground truncate">
                        {userProfile?.name || user.name || 'User'}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {userProfile?.phone || user.phone || 'Personal Finance Manager'}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        console.log('Close button clicked');
                        setShowMobileSidebar(false);
                      }}
                      className="text-foreground hover:bg-muted/20 p-2 flex-shrink-0 transition-all duration-150 hover:scale-110 rounded-lg"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </Button>
                  </div>
                </div>

                {/* Navigation Menu */}
                <div className="mobile-sidebar-scroll flex-1 p-4 space-y-2 overflow-y-auto">
                  {/* Profile Button */}
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      navigate('/profile');
                      setShowMobileSidebar(false);
                    }}
                    className="w-full glass-button border-primary/50 hover:bg-primary/20 justify-start transition-all duration-150 hover:scale-[1.02]"
                    style={{
                      animation: showMobileSidebar ? 'slideInFromLeft 0.25s ease-out 0.1s both' : 'none'
                    }}
                  >
                    <User className="h-4 w-4 mr-3" />
                    Profile
                  </Button>
                  
                  <div className="mobile-sidebar-divider border-t my-4"></div>
                  
                  {/* Category */}
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowCategoriesManager(true);
                      setShowMobileSidebar(false);
                    }}
                    className="w-full glass-button border-purple-500/50 hover:bg-purple-500/20 justify-start transition-all duration-150 hover:scale-[1.02]"
                    style={{
                      animation: showMobileSidebar ? 'slideInFromLeft 0.25s ease-out 0.15s both' : 'none'
                    }}
                  >
                    <Tag className="h-4 w-4 mr-3" />
                    Category
                  </Button>
                  
                  {/* Budgets */}
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      if (onManageBudget) {
                        onManageBudget();
                      } else {
                        setShowBudgetManager(true);
                      }
                      setShowMobileSidebar(false);
                    }}
                    className="w-full glass-button border-green-500/50 hover:bg-green-500/20 justify-start transition-all duration-150 hover:scale-[1.02]"
                    style={{
                      animation: showMobileSidebar ? 'slideInFromLeft 0.25s ease-out 0.2s both' : 'none'
                    }}
                  >
                    <Settings className="h-4 w-4 mr-3" />
                    Budgets
                  </Button>
                  
                  {/* Analytics */}
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      navigate('/analytics');
                      setShowMobileSidebar(false);
                    }}
                    className="w-full glass-button border-accent/50 hover:bg-accent/20 justify-start transition-all duration-150 hover:scale-[1.02]"
                    style={{
                      animation: showMobileSidebar ? 'slideInFromLeft 0.25s ease-out 0.25s both' : 'none'
                    }}
                  >
                    <BarChart3 className="h-4 w-4 mr-3" />
                    Analytics
                  </Button>
                  
                  {/* AI Agent */}
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      navigate('/ai-agent');
                      setShowMobileSidebar(false);
                    }}
                    className="w-full glass-button border-blue-500/50 hover:bg-blue-500/20 justify-start transition-all duration-150 hover:scale-[1.02]"
                    style={{
                      animation: showMobileSidebar ? 'slideInFromLeft 0.25s ease-out 0.3s both' : 'none'
                    }}
                  >
                    <Bot className="h-4 w-4 mr-3" />
                    AI Agent
                  </Button>
                  
                  {/* Add Monthly Income */}
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      onAddMonthlyIncome();
                      setShowMobileSidebar(false);
                    }}
                    className="w-full glass-button border-cyan-500/50 hover:bg-cyan-500/20 justify-start transition-all duration-150 hover:scale-[1.02]"
                    style={{
                      animation: showMobileSidebar ? 'slideInFromLeft 0.25s ease-out 0.35s both' : 'none'
                    }}
                  >
                    <Plus className="h-4 w-4 mr-3" />
                    Add Monthly Income
                  </Button>
                  
                  {/* Credit Card */}
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowCreditCardModal(true);
                      setShowMobileSidebar(false);
                    }}
                    className="w-full glass-button border-red-500/50 hover:bg-red-500/20 justify-start transition-all duration-150 hover:scale-[1.02]"
                    style={{
                      animation: showMobileSidebar ? 'slideInFromLeft 0.25s ease-out 0.4s both' : 'none'
                    }}
                  >
                    <CreditCard className="h-4 w-4 mr-3" />
                    Credit Card
                  </Button>
                  
                  {/* Expense Automation */}
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowRecurringExpenses(true);
                      setShowMobileSidebar(false);
                    }}
                    className="w-full glass-button border-orange-500/50 hover:bg-orange-500/20 justify-start transition-all duration-150 hover:scale-[1.02]"
                    style={{
                      animation: showMobileSidebar ? 'slideInFromLeft 0.25s ease-out 0.45s both' : 'none'
                    }}
                  >
                    <Repeat className="h-4 w-4 mr-3" />
                    Expense Automation
                  </Button>
                  
                  {/* Unassigned Credits */}
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowReassignCredits(true);
                      setShowMobileSidebar(false);
                    }}
                    className="w-full glass-button border-yellow-500/50 hover:bg-yellow-500/20 justify-start transition-all duration-150 hover:scale-[1.02]"
                    style={{
                      animation: showMobileSidebar ? 'slideInFromLeft 0.25s ease-out 0.5s both' : 'none'
                    }}
                  >
                    <Wallet className="h-4 w-4 mr-3" />
                    Unassigned Credits
                  </Button>
                  
                  {/* Learn More */}
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      navigate('/learn-more');
                      setShowMobileSidebar(false);
                    }}
                    className="w-full glass-button border-purple-500/50 hover:bg-purple-500/20 justify-start transition-all duration-150 hover:scale-[1.02]"
                    style={{
                      animation: showMobileSidebar ? 'slideInFromLeft 0.25s ease-out 0.55s both' : 'none'
                    }}
                  >
                    <span className="mr-3">📚</span>
                    Learn More
                  </Button>
                  
                  {/* Manage Transactions */}
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      navigate('/manage-transactions');
                      setShowMobileSidebar(false);
                    }}
                    className="w-full glass-button border-blue-500/50 hover:bg-blue-500/20 justify-start transition-all duration-150 hover:scale-[1.02]"
                    style={{
                      animation: showMobileSidebar ? 'slideInFromLeft 0.25s ease-out 0.6s both' : 'none'
                    }}
                  >
                    <Trash className="h-4 w-4 mr-3" />
                    Manage Transactions
                  </Button>
                  
                  <div 
                    className="mobile-sidebar-divider border-t my-4"
                    style={{
                      animation: showMobileSidebar ? 'slideInFromLeft 0.25s ease-out 0.65s both' : 'none'
                    }}
                  ></div>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      onLogout();
                      setShowMobileSidebar(false);
                    }}
                    className="w-full glass-button border-destructive/50 hover:bg-destructive/20 justify-start transition-all duration-150 hover:scale-[1.02]"
                    style={{
                      animation: showMobileSidebar ? 'slideInFromLeft 0.25s ease-out 0.7s both' : 'none'
                    }}
                  >
                    <svg className="h-4 w-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {user ? (
          /* Authenticated Dashboard */
          <div className="space-y-3 sm:space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 slide-up">
              <Card className="glass-card p-3 sm:p-6 hover-lift">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 rounded-xl bg-gradient-primary">
                    <Calendar className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-muted-foreground">Today Expenses</p>
                    <p className="text-lg sm:text-2xl font-bold truncate text-red-400">₹{formatCurrencyInIST(todayTotal)}</p>
                    {todayCredits > 0 && !isMobile && (
                      <p className="text-xs text-green-400">+₹{formatCurrencyInIST(todayCredits)} credits</p>
                    )}
                  </div>
                </div>
              </Card>
              
              <Card className="glass-card p-3 sm:p-6 hover-lift">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 rounded-xl bg-gradient-secondary">
                    <TrendingUp className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-muted-foreground">Month Expenses</p>
                    <p className="text-lg sm:text-2xl font-bold truncate text-red-400">₹{formatCurrencyInIST(monthTotal)}</p>
                    {monthCredits > 0 && !isMobile && (
                      <p className="text-xs text-green-400">+₹{formatCurrencyInIST(monthCredits)} credits</p>
                    )}
                  </div>
                </div>
              </Card>
              
              <Card className="glass-card p-3 sm:p-6 hover-lift">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 rounded-xl bg-gradient-accent">
                    <DollarSign className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-muted-foreground">Year Expenses</p>
                    <p className="text-lg sm:text-2xl font-bold truncate text-red-400">₹{formatCurrencyInIST(yearTotal)}</p>
                    {yearCredits > 0 && !isMobile && (
                      <p className="text-xs text-green-400">+₹{formatCurrencyInIST(yearCredits)} credits</p>
                    )}
                  </div>
                </div>
              </Card>

              <Card className="glass-card p-3 sm:p-6 hover-lift hidden sm:block">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500">
                    <CreditCard className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-muted-foreground">Unassigned Credits</p>
                    <p className="text-lg sm:text-2xl font-bold truncate text-green-400">₹{formatCurrencyInIST(totalUnassignedCredits)}</p>
                    {totalUnassignedCredits > 0 && (
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-amber-400">Not assigned to budget</p>
                        <Button
                          onClick={() => setShowReassignCredits(true)}
                          size="sm"
                          className="glass-button bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border-amber-500/30 text-xs px-2 py-1 h-6"
                        >
                          Assign
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* Budget Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 slide-up">
              <Card className="glass-card p-3 sm:p-6 hover-lift">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500">
                    <Target className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-muted-foreground">Monthly Budget</p>
                    {monthlyBudgetLoading ? (
                      <div className="animate-pulse bg-white/20 h-6 w-20 rounded"></div>
                    ) : (
                      <p className="text-lg sm:text-2xl font-bold truncate text-green-400">₹{formatCurrencyInIST(monthlyBudget)}</p>
                    )}
                  </div>
                </div>
              </Card>
              
              <Card className="glass-card p-3 sm:p-6 hover-lift">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500">
                    <Wallet className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-muted-foreground">Remaining Budget</p>
                                         {remainingBudgetLoading ? (
                       <div className="animate-pulse bg-white/20 h-6 w-20 rounded"></div>
                     ) : (
                       <p className={`text-lg sm:text-2xl font-bold truncate ${
                         remainingBudget >= 0 ? 'text-green-400' : 'text-red-400'
                       }`}>
                         ₹{formatCurrencyInIST(remainingBudget)}
                       </p>
                     )}
                     {/* Show loading indicator */}
                     {remainingBudgetLoading && (
                       <p className="text-xs text-blue-400 mt-1">
                         🔄 Updating...
                       </p>
                     )}
                     {/* Show overspending indicator */}
                     {!remainingBudgetLoading && remainingBudget < 0 && (
                       <p className="text-xs text-red-400 mt-1">
                         ⚠️ Overspent by ₹{formatCurrencyInIST(Math.abs(remainingBudget))}
                       </p>
                     )}
                   </div>
                 </div>
               </Card>

               <Card className="glass-card p-3 sm:p-6 hover-lift hidden sm:block">
                 <div className="flex items-center gap-2 sm:gap-4">
                   <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500">
                     <PieChart className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                   </div>
                   <div className="min-w-0 flex-1">
                     <p className="text-xs sm:text-sm text-muted-foreground">Total Accumulated</p>
                     <p className={`text-lg sm:text-2xl font-bold truncate ${
                       totalAccumulatedBalance >= 0 ? 'text-purple-400' : 'text-red-400'
                     }`}>
                       ₹{formatCurrencyInIST(totalAccumulatedBalance)}
                     </p>
                   </div>
                 </div>
               </Card>

               <Card className="glass-card p-3 sm:p-6 hover-lift">
                 <div className="flex items-center gap-2 sm:gap-4">
                   <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500">
                     <PiggyBank className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                   </div>
                   <div className="min-w-0 flex-1">
                     <p className="text-xs sm:text-sm text-muted-foreground">Bank Balance</p>
                     {bankBalanceLoading ? (
                       <div className="animate-pulse bg-white/20 h-6 w-20 rounded"></div>
                     ) : (
                       <p className={`text-lg sm:text-2xl font-bold truncate ${
                         bankBalance >= 0 ? 'text-orange-400' : 'text-red-400'
                       }`}>
                         ₹{formatCurrencyInIST(bankBalance)}
                       </p>
                     )}
                   </div>
                 </div>
               </Card>
            </div>

            {/* Mobile-only Total Accumulated Card */}
            <div className="sm:hidden mb-4">
              <Card className="glass-card p-4 hover-lift">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500">
                    <PieChart className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-muted-foreground">Total Accumulated</p>
                    <p className={`text-xl font-bold truncate ${
                      totalAccumulatedBalance >= 0 ? 'text-purple-400' : 'text-red-400'
                    }`}>
                      ₹{formatCurrencyInIST(totalAccumulatedBalance)}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

                         {/* Quick Actions */}
             <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center scale-in">
               <Button 
                 onClick={onAddExpense}
                 className={addExpenseButtonClass}
               >
                 <Plus className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
                 Add New Expense
               </Button>
               <Button 
                 onClick={onOpenCreditForm}
                 className={addCreditButtonClass}
               >
                 <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
                 Add New Credit
               </Button>
             </div>

            {/* Mobile-only Cards - Unassigned Credits and Total Accumulated */}
            <div className="sm:hidden grid grid-cols-1 gap-3">
              {/* Unassigned Credits Card */}
              <Card className="glass-card p-4 hover-lift">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500">
                    <CreditCard className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-muted-foreground">Unassigned Credits</p>
                    <p className="text-xl font-bold truncate text-green-400">₹{formatCurrencyInIST(totalUnassignedCredits)}</p>
                    {totalUnassignedCredits > 0 && (
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-amber-400">Not assigned to budget</p>
                        <Button
                          onClick={() => setShowReassignCredits(true)}
                          size="sm"
                          className="glass-button bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border-amber-500/30 text-xs px-2 py-1 h-6"
                        >
                          Assign
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

            </div>

            {/* Mobile-only Credit Summary Cards */}
            {isMobile && (
              <div className="grid grid-cols-1 gap-3 sm:hidden">
                {/* Today's Total Credit Card */}
                <Card className="glass-card p-4 hover-lift">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500">
                      <Calendar className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-muted-foreground">Today's Total Credit</p>
                      <p className="text-xl font-bold truncate text-green-400">₹{formatCurrencyInIST(todayCredits)}</p>
                    </div>
                  </div>
                </Card>

                {/* Month's Total Credit Card */}
                <Card className="glass-card p-4 hover-lift">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500">
                      <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-muted-foreground">Month's Total Credit</p>
                      <p className="text-xl font-bold truncate text-green-400">₹{formatCurrencyInIST(monthCredits)}</p>
                    </div>
                  </div>
                </Card>

                {/* Year's Total Credit Card */}
                <Card className="glass-card p-4 hover-lift">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500">
                      <DollarSign className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-muted-foreground">Year's Total Credit</p>
                      <p className="text-xl font-bold truncate text-green-400">₹{formatCurrencyInIST(yearCredits)}</p>
                    </div>
                  </div>
                </Card>

              </div>
            )}

            {/* Credit Card Due */}
            {groupedCreditCardExpenses.length > 0 && (
              <Card className="glass-card p-3 sm:p-6 fade-in relative overflow-hidden w-full max-w-full hover:shadow-lg hover:shadow-red-400/8 transition-all duration-300 hover:-translate-y-0.5">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-red-400 to-red-500 rounded-full blur-3xl"></div>
                  <div className="absolute bottom-0 left-0 w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-tr from-orange-400 to-red-400 rounded-full blur-2xl"></div>
                </div>
                
                <div className="relative z-10">
                  {/* Enhanced Header */}
                  <div className="mb-4 sm:mb-6 lg:mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 lg:gap-6 mb-3 sm:mb-4 lg:mb-5">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-red-500 to-red-600 shadow-lg shadow-red-500/25">
                          <PieChart className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-heading font-bold text-foreground flex items-center gap-2">
                            Credit Card Due
                          </h3>
                          <p className="text-xs credit-text-soft">
                            Outstanding debt across {groupedCreditCardExpenses.length} categor{groupedCreditCardExpenses.length !== 1 ? 'ies' : 'y'}
                          </p>
                        </div>
                        {/* Expand/Collapse Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsCreditCardExpanded(!isCreditCardExpanded)}
                          className="p-2 hover:bg-white/10 transition-all duration-200 hover:scale-110"
                        >
                          <ChevronDown className={`h-4 w-4 text-foreground transition-transform duration-300 ${
                            isCreditCardExpanded ? 'rotate-180' : 'rotate-0'
                          }`} />
                        </Button>
                      </div>
                      
                      {/* Enhanced View Button */}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowCreditCardModal(true)}
                        className="glass-button border-red-500/50 hover:bg-red-400/15 hover:border-red-300/50 text-xs px-3 sm:px-4 py-2 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-400/15 w-full sm:w-auto"
                      >
                        <CreditCard className="h-3 w-3 mr-2" />
                        <span className="hidden sm:inline">View Entries</span>
                        <span className="sm:hidden">View All</span>
                      </Button>
                    </div>
                    
                    {/* Enhanced Total Credit Card Bill */}
                    <div className="relative p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-gradient-to-r from-red-400/12 to-red-500/12 border border-red-400/25 backdrop-blur-sm">
                        <div className="absolute inset-0 bg-gradient-to-r from-red-400/3 to-red-500/3 rounded-xl sm:rounded-2xl"></div>
                      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-red-500 to-red-600 shadow-lg">
                            <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                          </div>
                          <div>
                            <h4 className="text-base sm:text-lg lg:text-base xl:text-lg font-semibold text-foreground">Total Credit Card Bill</h4>
                            <p className="text-xs credit-text-soft">
                              {creditCardExpenses.length} transaction{creditCardExpenses.length !== 1 ? 's' : ''} pending
                            </p>
                          </div>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-lg sm:text-xl md:text-2xl font-bold credit-text-strong mb-1">
                            ₹{formatCurrencyInIST(creditCardExpenses.reduce((sum, expense) => sum + expense.amount, 0))}
                          </p>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full credit-dot-accent animate-pulse"></div>
                            <p className="text-xs credit-text-soft">Payment Due</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Individual Credit Card Entries - Only show when expanded */}
                <div className={`transition-all duration-300 ease-in-out ${
                  isCreditCardExpanded 
                    ? 'max-h-none lg:max-h-none md:max-h-[1000px] sm:max-h-[800px] opacity-100 overflow-y-auto lg:overflow-visible md:overflow-y-auto sm:overflow-y-auto' 
                    : 'max-h-0 opacity-0 overflow-hidden'
                }`}>
                  <div className="grid gap-3 sm:gap-4 lg:gap-4 xl:gap-5">
                    {groupedCreditCardExpenses.map((group, index) => {
                    const categorySummary = getCategorySummary(group.category);
                    const accumulatedBalance = getCategoryAccumulatedBalance(group.category);
                    const adjustedBalance = accumulatedBalance - group.totalAmount;
                    
                    return (
                      <div 
                        key={group.category} 
                        className="relative overflow-hidden rounded-xl sm:rounded-2xl lg:rounded-3xl bg-gradient-to-br from-white/8 to-white/12 border border-white/25 hover:border-red-200/25 hover:bg-white/6 transition-all duration-300 hover:shadow-lg hover:shadow-red-300/12 hover:-translate-y-1 group w-full"
                        style={{
                          animationDelay: `${index * 100}ms`
                        }}
                      >
                        {/* Animated Background */}
                        <div className="absolute inset-0 bg-gradient-to-r from-red-400/3 to-orange-400/3 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        
                        {/* Header */}
                        <div className="relative p-3 sm:p-4 lg:p-4 xl:p-5 pb-2 sm:pb-3 lg:pb-3 xl:pb-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 lg:gap-4 mb-2 sm:mb-3 lg:mb-3">
                            <div className="flex items-center gap-3 sm:gap-4">
                              <div className="p-2 sm:p-2.5 lg:p-2 xl:p-2.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-red-500 to-red-600 shadow-lg shadow-red-500/25 group-hover:shadow-red-300/30 group-hover:scale-105 transition-all duration-300 flex items-center justify-center">
                                <span className="text-lg sm:text-xl lg:text-xl xl:text-2xl">{getCategoryIcon(group.category)}</span>
                              </div>
                              <div>
                                <h5 className="font-bold text-foreground text-sm sm:text-base lg:text-sm xl:text-base mb-0.5 sm:mb-1">{group.category}</h5>
                                <p className="text-xs credit-text-soft">
                                  {group.expenses.length} transaction{group.expenses.length !== 1 ? 's' : ''} • Credit Card Debt
                                </p>
                              </div>
                            </div>
                            <div className="text-left sm:text-right">
                              <p className="text-base sm:text-lg font-bold credit-text-strong mb-1">
                                ₹{formatCurrencyInIST(group.totalAmount)}
                              </p>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full credit-dot-accent animate-pulse"></div>
                                <p className="text-xs credit-text-soft">Outstanding</p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Enhanced Financial Metrics Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3 lg:gap-3 xl:gap-4">
                            {/* Remaining Balance */}
                            {categorySummary && (
                              <div className="p-2 sm:p-3 lg:p-2 xl:p-3 rounded-lg sm:rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 hover:border-green-400/35 hover:bg-green-500/12 hover:scale-[1.02] transition-all duration-300">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium text-green-300/80">Remaining Balance</span>
                                  <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${
                                    categorySummary.remaining_balance >= 0 ? 'bg-green-400 shadow-lg shadow-green-400/50' : 'credit-dot-accent'
                                  }`}></div>
                                </div>
                                <p className={`text-sm sm:text-base lg:text-sm xl:text-base font-bold ${
                                  categorySummary.remaining_balance >= 0 ? 'text-green-400' : 'credit-text-strong'
                                }`}>
                                  ₹{formatCurrencyInIST(categorySummary.remaining_balance || 0)}
                                </p>
                              </div>
                            )}
                            
                            {/* Accumulated Balance */}
                            <div className="p-2 sm:p-3 lg:p-2 xl:p-3 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 hover:border-blue-400/35 hover:bg-blue-500/12 hover:scale-[1.02] transition-all duration-300">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-blue-300/80">Accumulated Balance</span>
                                <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${
                                  accumulatedBalance >= 0 ? 'bg-blue-400 shadow-lg shadow-blue-400/50' : 'credit-dot-accent'
                                }`}></div>
                              </div>
                              <p className={`text-sm sm:text-base lg:text-sm xl:text-base font-bold ${
                                accumulatedBalance >= 0 ? 'text-blue-400' : 'credit-text-strong'
                              }`}>
                                ₹{formatCurrencyInIST(accumulatedBalance)}
                              </p>
                            </div>
                            
                            {/* Adjusted Balance */}
                            <div className="p-2 sm:p-3 lg:p-2 xl:p-3 rounded-lg sm:rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 hover:border-purple-400/35 hover:bg-purple-500/12 hover:scale-[1.02] transition-all duration-300">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-purple-300/80">After Credit Card</span>
                                <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${
                                  adjustedBalance >= 0 ? 'bg-purple-400 shadow-lg shadow-purple-400/50' : 'bg-orange-400 shadow-lg shadow-orange-400/50'
                                }`}></div>
                              </div>
                              <p className={`text-sm sm:text-base lg:text-sm xl:text-base font-bold ${
                                adjustedBalance >= 0 ? 'text-purple-400' : 'text-orange-400'
                              }`}>
                                ₹{formatCurrencyInIST(adjustedBalance)}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Enhanced Progress Bar */}
                        <div className="px-3 sm:px-4 lg:px-4 xl:px-5 pb-3 sm:pb-4 lg:pb-4 xl:pb-5">
                          <div className="flex items-center justify-between mb-1 sm:mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full credit-dot-accent animate-pulse"></div>
                              <span className="text-xs font-medium credit-text-soft">Credit Card Impact</span>
                            </div>
                            <span className="text-xs font-bold credit-text-strong">
                              {((group.totalAmount / Math.max(accumulatedBalance, group.totalAmount)) * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="relative w-full bg-white/10 rounded-full h-2 sm:h-2.5 lg:h-2 overflow-hidden group-hover:bg-white/12 transition-all duration-300">
                            <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-red-600/20 rounded-full"></div>
                            <div 
                              className="relative bg-gradient-to-r from-red-500 to-red-600 h-2 sm:h-2.5 lg:h-2 rounded-full transition-all duration-700 ease-out shadow-lg shadow-red-400/20 group-hover:shadow-red-400/25 group-hover:from-red-450 group-hover:to-red-550"
                              style={{ 
                                width: `${Math.min((group.totalAmount / Math.max(accumulatedBalance, group.totalAmount)) * 100, 100)}%` 
                              }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                </div>
              </Card>
            )}


            {/* Recent Expenses */}
            <Card className="glass-card p-4 sm:p-6 fade-in">
              <div className="mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-heading font-semibold mb-1 sm:mb-2">Recent Expenses</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Last 30 days of expense history</p>
              </div>
              

              
              {recentExpenses.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="p-3 sm:p-4 rounded-full bg-muted/20 w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm sm:text-base">No expenses in the last 30 days. Add your first expense!</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4 max-h-96 overflow-y-auto pr-2">
                  {recentExpenses.map((expense, index) => (
                    <div 
                      key={expense.id}
                      className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-white/5 border border-white/10 hover-lift"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                        <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-primary flex-shrink-0 flex items-center justify-center">
                          <span className="text-lg sm:text-xl">{getCategoryIcon(expense.category)}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm sm:text-base truncate">{expense.description}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">{expense.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                        <div className="text-right">
                          <p className="font-bold text-base sm:text-lg">₹{formatCurrencyInIST(expense.amount)}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">{expense.date}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingExpense(expense)}
                          className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-blue-500/20 hover:text-blue-400 transition-colors"
                          title="Edit expense"
                        >
                          <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteExpenseId(expense.id)}
                          className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                          title="Delete expense"
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Recent Credits */}
            <Card className="glass-card p-4 sm:p-6 fade-in">
              <div className="mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-heading font-semibold mb-1 sm:mb-2">Recent Credits</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Last 30 days of credit history</p>
              </div>
              
              {recentCredits.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="p-3 sm:p-4 rounded-full bg-muted/20 w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                    <CreditCard className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm sm:text-base">No credits in the last 30 days. Add your first credit!</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4 max-h-96 overflow-y-auto pr-2">
                  {recentCredits.map((credit, index) => (
                    <div 
                      key={credit.id}
                      className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-white/5 border border-white/10 hover-lift"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                        <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 flex-shrink-0 flex items-center justify-center">
                          <span className="text-lg sm:text-xl">
                            {credit.category ? getCategoryIcon(credit.category) : '💰'}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm sm:text-base truncate">
                            {credit.description || 'Credit'}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {credit.category || 'Unassigned'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                        <div className="text-right">
                          <p className="font-bold text-base sm:text-lg text-green-400">+₹{formatCurrencyInIST(credit.amount)}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">{credit.date}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingCredit(credit)}
                          className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-blue-500/20 hover:text-blue-400 transition-colors"
                          title="Edit credit"
                        >
                          <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                        {!credit.category && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSplittingCredit(credit)}
                            className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-cyan-500/20 hover:text-cyan-400 transition-colors"
                            title="Split credit"
                          >
                            <Split className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteCreditId(credit.id)}
                          className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                          title="Delete credit"
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        ) : (
          /* Welcome Screen for Non-authenticated Users */
          <div className="text-center space-y-6 sm:space-y-8 py-8 sm:py-12">
            <div className="max-w-2xl mx-auto fade-in px-4">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold mb-3 sm:mb-4">
                Track Your Daily Expenses with Style
              </h2>
              <p className="text-lg sm:text-xl text-muted-foreground mb-6 sm:mb-8">
                Beautiful, intuitive expense tracking with powerful analytics and insights.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                <Button className="glass-button bg-gradient-primary hover:scale-105 px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg">
                  Get Started
                </Button>
                <Button variant="outline" className="glass-button px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg">
                  Learn More
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteExpenseId}
        onClose={() => setDeleteExpenseId(null)}
        onConfirm={() => {
          if (deleteExpenseId) {
            onDeleteExpense(deleteExpenseId);
            setDeleteExpenseId(null);
            // Trigger budget refresh callback
            if (onExpenseDeleted?.current) {
              onExpenseDeleted.current();
            }
          }
        }}
        title="Delete Expense"
        message="Are you sure you want to delete this expense? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Budget Manager */}
      <BudgetManager
        isOpen={showBudgetManager}
        onClose={() => setShowBudgetManager(false)}
        onChanged={() => {
          // Refresh both monthly and remaining budget when budgets are changed
          refreshBudgetData();
        }}
      />

      {/* Categories Manager */}
      <CategoriesManager
        isOpen={showCategoriesManager}
        onClose={() => setShowCategoriesManager(false)}
        onChanged={() => {
          // Categories changed, no specific action needed for dashboard
        }}
      />

      {/* Edit Expense Form */}
      {editingExpense && (
        <EditExpenseForm
          expense={editingExpense}
          onUpdateExpense={(expenseId, expense) => {
            onUpdateExpense(expenseId, expense);
            // Trigger budget refresh callback
            if (onExpenseUpdated?.current) {
              onExpenseUpdated.current();
            }
          }}
          onClose={() => setEditingExpense(null)}
        />
      )}

      {/* Delete Credit Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteCreditId}
        onClose={() => setDeleteCreditId(null)}
        onConfirm={() => {
          if (deleteCreditId) {
            onDeleteCredit(deleteCreditId);
            setDeleteCreditId(null);
            // Budget will be refreshed automatically by the database trigger
          }
        }}
        title="Delete Credit"
        message="Are you sure you want to delete this credit? This action cannot be undone and will update the budget accordingly."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Edit Credit Form */}
      {editingCredit && (
        <EditCreditForm
          credit={editingCredit}
          onUpdateCredit={(creditId, credit) => {
            onUpdateCredit(creditId, credit);
            // Budget will be refreshed automatically by the database trigger
          }}
          onClose={() => setEditingCredit(null)}
        />
      )}

      {/* Reassign Credits Modal */}
      {showReassignCredits && (
        <ReassignCreditsModal
          onClose={() => {
            setShowReassignCredits(false);
            // Force refresh when modal is closed to ensure dashboard is up to date
            refreshBudgetData(true);
          }}
          onBudgetRefresh={refreshBudgetData}
          onAddCredit={onAddCredit}
        />
      )}

      {/* Split Credit Modal */}
      {splittingCredit && (
        <SplitCreditModal
          credit={{
            year: parseInt(getMonthYearInIST(splittingCredit.date).year),
            month: parseInt(getMonthYearInIST(splittingCredit.date).month),
            amount: splittingCredit.amount
          }}
          categories={categories}
          onClose={() => setSplittingCredit(null)}
          onSplit={handleSplitCredit}
          loading={splitLoading}
          generateMonthOptions={generateMonthOptions}
          generateYearOptions={generateYearOptions}
        />
      )}

      {/* Recurring Expenses Modal */}
      {showRecurringExpenses && (
        <RecurringExpensesModal
          isOpen={showRecurringExpenses}
          onClose={() => setShowRecurringExpenses(false)}
        />
      )}

      {/* Credit Card Modal */}
      {showCreditCardModal && (
        <CreditCardModal
          isOpen={showCreditCardModal}
          onClose={() => setShowCreditCardModal(false)}
          creditCardExpenses={creditCardExpenses}
          categories={categories}
          onDeleteCreditCardExpense={onDeleteCreditCardExpense}
          onUpdateCreditCardExpense={onUpdateCreditCardExpense}
          onPayCreditCardDue={onPayCreditCardDue}
          onBulkPayCreditCardDues={onBulkPayCreditCardDues}
          onAddCreditCardExpense={onAddCreditCardExpense}
        />
      )}
    </div>
  );
};