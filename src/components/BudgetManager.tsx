import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus, Trash2, AlertTriangle, TrendingUp, DollarSign, Edit, Lock, ChevronUp, ChevronDown, Table, Save, Calendar, Upload, FileSpreadsheet } from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';
import { useBudgets, BudgetWithCarryover, Budget } from '@/hooks/useBudgets';
import { useCategorySummaries } from '@/hooks/useCategorySummaries';
import type { CategorySummary } from '@/hooks/useCategorySummaries';
import { useMonthlyRemainingBalances } from '@/hooks/useMonthlyRemainingBalances';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { callSupabaseRpc } from '@/lib/supabaseRpc';
import { getCurrentDateInIST, getMonthYearInIST, formatDateInIST, formatCurrencyInIST } from '@/lib/dateUtils';
import { getIconByCategoryName } from '@/data/categoryIcons';
type XlsxModule = typeof import('xlsx');

// Lazily load XLSX so heavy spreadsheet logic stays out of the initial bundle
let cachedXLSX: XlsxModule | null = null;
const loadXlsx = async (): Promise<XlsxModule> => {
  if (!cachedXLSX) {
    cachedXLSX = await import('xlsx');
  }
  return cachedXLSX;
};

interface BudgetManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onChanged?: () => void;
}

interface BudgetItemWithBalanceProps {
  budget: Budget;
  monthYear: string;
  remainingBalance: number;
  accumulatedBalance: number;
  onGetRemainingBalance: (categoryName: string, monthYear: string) => Promise<number>;
  showDetails?: boolean;
}

const BudgetItemWithBalance = ({ budget, monthYear, remainingBalance, accumulatedBalance, onGetRemainingBalance, showDetails = false }: BudgetItemWithBalanceProps) => {
  const [isExpanded, setIsExpanded] = useState(showDetails);
  const [categoryRemainingBalance, setCategoryRemainingBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  // Helper function to get category icon
  const getCategoryIcon = (categoryName: string): string => {
    return getIconByCategoryName(categoryName);
  };

  // Load remaining balance when component mounts or when expanded
  useEffect(() => {
    if ((isExpanded || showDetails) && categoryRemainingBalance === null) {
      setLoadingBalance(true);
      onGetRemainingBalance(budget.category_name, monthYear)
        .then(balance => {
          setCategoryRemainingBalance(balance);
        })
        .catch(error => {
          console.error('Error loading remaining balance:', error);
          setCategoryRemainingBalance(0);
        })
        .finally(() => {
          setLoadingBalance(false);
        });
    }
  }, [isExpanded, showDetails, categoryRemainingBalance, budget.category_name, monthYear, onGetRemainingBalance]);

  return (
    <div className="p-2 rounded bg-white/5 border border-white/10">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getCategoryIcon(budget.category_name)}</span>
            <span className="text-sm font-medium text-white">
              {budget.category_name}
            </span>
            {!showDetails && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-5 w-5 p-0 hover:bg-white/10 text-white/60"
              >
                {isExpanded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
          <div className="text-sm font-bold text-green-400 mt-1">
            ₹{formatCurrencyInIST(budget.amount)}
          </div>
        </div>
      </div>
      
      {(isExpanded || showDetails) && (
        <div className="mt-2 pt-2 border-t border-white/10">
          {showDetails ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center">
                <div className="text-sm text-white/70 mb-0.5">Remaining</div>
                {loadingBalance ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b border-white mx-auto"></div>
                ) : (
                  <div className={`text-sm font-medium ${
                    (categoryRemainingBalance ?? remainingBalance) >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    ₹{formatCurrencyInIST(categoryRemainingBalance ?? remainingBalance)}
                  </div>
                )}
              </div>
              <div className="text-center">
                <div className="text-sm text-white/70 mb-0.5">Accumulated</div>
                <div className={`text-sm font-medium ${
                  accumulatedBalance >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  ₹{formatCurrencyInIST(accumulatedBalance)}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-1">
              <p className="text-xs text-white/60">
                Balance details available for current month only
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const BudgetManager = ({ isOpen, onClose, onChanged }: BudgetManagerProps) => {
  const { user } = useAuth();
  const { categories, refetch: refetchCategories } = useCategories(user?.id);
  const { budgets, setBudget, deleteBudget, loading, getBudgetWithCarryover, getTotalBudgetForMonth, fetchBudgets } = useBudgets(user?.id);
  const { toast } = useToast();

  // Helper function to get category icon
  const getCategoryIcon = (categoryName: string): string => {
    const category = categories.find(cat => cat.name === categoryName);
    return category?.icon || getIconByCategoryName(categoryName);
  };
  
  // Get current year for monthly remaining balances
  const currentYear = new Date().getFullYear();
  const { data: monthlyBalances, getAccumulatedTotalForCategory } = useMonthlyRemainingBalances(user?.id, currentYear);
  
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [currentBudget, setCurrentBudget] = useState<BudgetWithCarryover | null>(null);
  const [totalMonthBudget, setTotalMonthBudget] = useState<{
    totalBudget: number;
    totalSpent: number;
    totalRemaining: number;
  } | null>(null);
  const [isLoadingBudget, setIsLoadingBudget] = useState(false);
  
  // Cache for total budget calculations to avoid repeated API calls
  const [budgetCache, setBudgetCache] = useState<Map<string, {
    totalBudget: number;
    totalSpent: number;
    totalRemaining: number;
    timestamp: number;
  }>>(new Map());
  
  // Cache expiry time (5 minutes)
  const CACHE_EXPIRY = 5 * 60 * 1000;

  // Helper function to get remaining balance for a category from category_summaries
  const getCategoryRemainingBalance = async (categoryName: string, monthYear: string): Promise<number> => {
    if (!user?.id) return 0;
    
    try {
      const { data: summaries, error } = await callSupabaseRpc<CategorySummary[]>(
        'get_category_summaries',
        {
          target_user_id: user.id,
          target_month_year: monthYear
        }
      );

      if (error) {
        console.warn('Error fetching category summaries:', error);
        return 0;
      }

      const categorySummary = (summaries ?? []).find(summary => 
        summary.category_name === categoryName
      );

      return categorySummary?.remaining_balance || 0;
    } catch (error) {
      console.error('Error getting category remaining balance:', error);
      return 0;
    }
  };

  // Helper function to get accumulated balance for a category from monthly_remaining_balance
  const getCategoryAccumulatedBalance = (categoryName: string, monthYear: string): number => {
    const categoryData = monthlyBalances?.find(balance => balance.category_name === categoryName);
    if (!categoryData) return 0;
    
    // Use the same calculation as Monthly Remaining Balances Total column
    // This includes salary months and ensures consistency across all components
    return getAccumulatedTotalForCategory(categoryData);
  };
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [mobileActiveTab, setMobileActiveTab] = useState<'budget' | 'overview'>('budget');
  
  // Bulk budget setting state
  const [bulkBudgetMonth, setBulkBudgetMonth] = useState('');
  const [bulkBudgetYear, setBulkBudgetYear] = useState('');
  const [showBulkBudgetModal, setShowBulkBudgetModal] = useState(false);
  const [bulkBudgetData, setBulkBudgetData] = useState<Record<string, string>>({});
  const [initialBulkBudgetData, setInitialBulkBudgetData] = useState<Record<string, string>>({});
  const [bulkBudgetLoading, setBulkBudgetLoading] = useState(false);
  
  // New bulk budget range state
  const [bulkFromYear, setBulkFromYear] = useState('');
  const [bulkFromMonth, setBulkFromMonth] = useState('');
  const [bulkToYear, setBulkToYear] = useState('');
  const [bulkToMonth, setBulkToMonth] = useState('');
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkAmount, setBulkAmount] = useState('');
  const [bulkBudgetProcessing, setBulkBudgetProcessing] = useState(false);
  
  // Excel import state
  const [showImportSection, setShowImportSection] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importedBudgets, setImportedBudgets] = useState<Array<{
    categoryName: string;
    budget: number;
    isValid: boolean;
    error?: string;
  }>>([]);
  
  // Bulk modal total budget state
  const [bulkModalTotalBudget, setBulkModalTotalBudget] = useState<{
    totalBudget: number;
    totalSpent: number;
    totalRemaining: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Budget transfer state
  const [transferMonth, setTransferMonth] = useState('');
  const [transferYear, setTransferYear] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [fromCategory, setFromCategory] = useState('');
  const [toCategory, setToCategory] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);

  // Check if a budget exists for the selected category and month
  const monthYear = selectedMonth && selectedYear ? `${selectedYear}-${selectedMonth}` : '';
  const existingBudget = !monthYear ? null : budgets.find(b => 
    b.category_id === selectedCategory && b.month_year === monthYear
  );

  // Helper function to check if a month is in the future
  const isFutureMonth = (monthYear: string): boolean => {
    if (!monthYear) return false;
    const currentDate = new Date();
    const currentMonthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    return monthYear > currentMonthYear;
  };

  // Generate month options (past 12 months + current month + next 6 months + special options)
  const generateMonthOptions = () => {
    const options = [];
    const currentDate = new Date();
    
    // Add special options first
    options.push({ value: 'ALL', label: 'ALL - All Months' });
    
    // Add past 12 months
    for (let i = 12; i >= 1; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const monthYear = `${year}-${month}`;
      const displayName = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      });
      options.push({ value: monthYear, label: displayName });
    }
    
    // Add current month
    const currentYear = currentDate.getFullYear();
    const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
    const currentMonthYear = `${currentYear}-${currentMonth}`;
    const currentDisplayName = currentDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
    options.push({ value: currentMonthYear, label: currentDisplayName });
    
    // Add next 6 months
    for (let i = 1; i <= 6; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const monthYear = `${year}-${month}`;
      const displayName = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      });
      options.push({ value: monthYear, label: displayName });
    }
    
    return options;
  };

  const monthOptions = generateMonthOptions();

  // Generate separate month options (1-12)
  const generateSeparateMonthOptions = () => {
    const months = [
      { value: '01', label: 'January' },
      { value: '02', label: 'February' },
      { value: '03', label: 'March' },
      { value: '04', label: 'April' },
      { value: '05', label: 'May' },
      { value: '06', label: 'June' },
      { value: '07', label: 'July' },
      { value: '08', label: 'August' },
      { value: '09', label: 'September' },
      { value: '10', label: 'October' },
      { value: '11', label: 'November' },
      { value: '12', label: 'December' }
    ];
    return months;
  };

  // Generate year options (current year ± 5 years)
  const generateYearOptions = () => {
    const years = [];
    const currentYear = new Date().getFullYear();
    
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      years.push({ value: i.toString(), label: i.toString() });
    }
    
    return years;
  };

  const separateMonthOptions = generateSeparateMonthOptions();
  const yearOptions = generateYearOptions();

  // Generate month options for bulk budget (1-12)
  const generateBulkMonthOptions = () => {
    const months = [
      { value: '01', label: 'January' },
      { value: '02', label: 'February' },
      { value: '03', label: 'March' },
      { value: '04', label: 'April' },
      { value: '05', label: 'May' },
      { value: '06', label: 'June' },
      { value: '07', label: 'July' },
      { value: '08', label: 'August' },
      { value: '09', label: 'September' },
      { value: '10', label: 'October' },
      { value: '11', label: 'November' },
      { value: '12', label: 'December' }
    ];
    return months;
  };

  // Generate year options for bulk budget (current year ± 5 years)
  const generateBulkYearOptions = () => {
    const years = [];
    const currentYear = new Date().getFullYear();
    
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      years.push({ value: i.toString(), label: i.toString() });
    }
    
    return years;
  };

  const bulkMonthOptions = generateBulkMonthOptions();
  const bulkYearOptions = generateBulkYearOptions();

  // Function to invalidate cache when budgets are updated
  const invalidateBudgetCache = (monthYear?: string) => {
    if (monthYear) {
      // Invalidate specific month cache
      const cacheKey = `${user?.id}-${monthYear}`;
      setBudgetCache(prev => {
        const newCache = new Map(prev);
        newCache.delete(cacheKey);
        return newCache;
      });
    } else {
      // Invalidate all cache
      setBudgetCache(new Map());
    }
  };

  // Budget transfer function
  const handleBudgetTransfer = async () => {
    if (!transferMonth || !transferYear || !transferAmount || !fromCategory || !toCategory) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all fields for budget transfer.',
        variant: 'destructive',
      });
      return;
    }

    if (fromCategory === toCategory) {
      toast({
        title: 'Invalid Selection',
        description: 'From and To categories cannot be the same.',
        variant: 'destructive',
      });
      return;
    }

    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid transfer amount.',
        variant: 'destructive',
      });
      return;
    }

    setTransferLoading(true);

    try {
      const monthYear = `${transferYear}-${transferMonth}`;
      
      // Get current budgets for both categories
      const fromBudget = await getBudgetWithCarryover(fromCategory, monthYear);
      const toBudget = await getBudgetWithCarryover(toCategory, monthYear);

      if (!fromBudget || fromBudget.amount < amount) {
        toast({
          title: 'Insufficient Budget',
          description: `Insufficient budget in ${fromBudget?.category_name || 'source category'}. Available: ₹${fromBudget?.amount || 0}`,
          variant: 'destructive',
        });
        setTransferLoading(false);
        return;
      }

      // Calculate new amounts
      const newFromAmount = fromBudget.amount - amount;
      const newToAmount = (toBudget?.amount || 0) + amount;

      // Update both budgets
      const fromResult = await setBudget(fromCategory, monthYear, newFromAmount, fromBudget.id);
      const toResult = await setBudget(toCategory, monthYear, newToAmount, toBudget?.id);

      if (fromResult.error || toResult.error) {
        throw new Error('Failed to update budgets');
      }

      // Clear form
      setTransferAmount('');
      setFromCategory('');
      setToCategory('');

      // Invalidate cache for the affected month
      invalidateBudgetCache(monthYear);

      toast({
        title: 'Budget Transfer Successful!',
        description: `₹${amount.toLocaleString()} transferred from ${fromBudget.category_name} to ${toResult.data?.category_name || 'target category'} for ${transferMonth}/${transferYear}`,
      });

    } catch (error) {
      console.error('Error transferring budget:', error);
      toast({
        title: 'Transfer Failed',
        description: 'Failed to transfer budget. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setTransferLoading(false);
    }
  };

  // Refresh categories when BudgetManager opens
  useEffect(() => {
    if (isOpen && user?.id) {
      refetchCategories();
      const { month: currentMonth, year: currentYear } = getMonthYearInIST();

      if (!bulkBudgetMonth) {
        setBulkBudgetMonth(currentMonth);
      }
      if (!bulkBudgetYear) {
        setBulkBudgetYear(currentYear);
      }
      if (!bulkFromYear) {
        setBulkFromYear(currentYear);
      }
      if (!bulkFromMonth) {
        setBulkFromMonth(currentMonth);
      }
      if (!bulkToYear) {
        setBulkToYear(currentYear);
      }
      if (!bulkToMonth) {
        setBulkToMonth(currentMonth);
      }
      if (!selectedMonth || !selectedYear) {
        setSelectedMonth(currentMonth);
        setSelectedYear(currentYear);
      }
      if (!transferMonth || !transferYear) {
        setTransferMonth(currentMonth);
        setTransferYear(currentYear);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user?.id, refetchCategories]);

  // Load bulk budget data when modal is opened
  useEffect(() => {
    if (showBulkBudgetModal && bulkBudgetMonth && bulkBudgetYear && categories.length > 0) {
      loadBulkBudgetData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showBulkBudgetModal, bulkBudgetMonth, bulkBudgetYear, categories.length]);

  // Function to set bulk budgets for a date range
  const setBulkBudgets = async () => {
    if (!user?.id || !bulkFromYear || !bulkFromMonth || !bulkToYear || !bulkToMonth || !bulkCategory || !bulkAmount) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields for bulk budget setting.',
        variant: 'destructive',
      });
      return;
    }

    const amount = parseFloat(bulkAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid budget amount.',
        variant: 'destructive',
      });
      return;
    }

    // Validate date range
    const fromDate = new Date(parseInt(bulkFromYear), parseInt(bulkFromMonth) - 1, 1);
    const toDate = new Date(parseInt(bulkToYear), parseInt(bulkToMonth) - 1, 1);
    
    if (fromDate > toDate) {
      toast({
        title: 'Error',
        description: 'From date must be before or equal to To date.',
        variant: 'destructive',
      });
      return;
    }

    setBulkBudgetProcessing(true);

    try {
      // Find the category
      const category = categories.find(c => c.id === bulkCategory);
      if (!category) {
        toast({
          title: 'Error',
          description: 'Selected category not found.',
          variant: 'destructive',
        });
        return;
      }

      // Generate all months in the range
      const monthsToProcess = [];
      const currentDate = new Date(fromDate);
      
      while (currentDate <= toDate) {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const monthYear = `${year}-${month}`;
        monthsToProcess.push(monthYear);
        
        // Move to next month
        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      // Set budget for each month
      let successCount = 0;
      let errorCount = 0;
      let updatedCount = 0;
      let createdCount = 0;

      for (const monthYear of monthsToProcess) {
        try {
          // Check if budget already exists
          const existingBudget = budgets.find(b => 
            b.category_id === bulkCategory && b.month_year === monthYear
          );
          
          const result = await setBudget(bulkCategory, monthYear, amount, existingBudget?.id);
          if (result.error) {
            console.error(`Error setting budget for ${monthYear}:`, result.error);
            errorCount++;
          } else {
            successCount++;
            if (existingBudget) {
              updatedCount++;
            } else {
              createdCount++;
            }
          }
        } catch (error) {
          console.error(`Error setting budget for ${monthYear}:`, error);
          errorCount++;
        }
      }

      // Show success message
      if (successCount > 0) {
        let description = `Successfully set budget of ₹${amount.toLocaleString()} for ${category.name} across ${successCount} month(s).`;
        
        if (createdCount > 0 && updatedCount > 0) {
          description += ` Created ${createdCount} new budget(s) and updated ${updatedCount} existing budget(s).`;
        } else if (createdCount > 0) {
          description += ` Created ${createdCount} new budget(s).`;
        } else if (updatedCount > 0) {
          description += ` Updated ${updatedCount} existing budget(s).`;
        }
        
        if (errorCount > 0) {
          description += ` ${errorCount} month(s) failed.`;
        }
        
        toast({
          title: 'Bulk Budget Set!',
          description: description,
        });
      }

      if (errorCount > 0 && successCount === 0) {
        toast({
          title: 'Error',
          description: 'Failed to set any budgets. Please try again.',
          variant: 'destructive',
        });
      }

  // Reset form
  const { month: currentMonth, year: currentYear } = getMonthYearInIST();
  setBulkFromYear(currentYear);
  setBulkFromMonth(currentMonth);
  setBulkToYear(currentYear);
  setBulkToMonth(currentMonth);
      setBulkCategory('');
      setBulkAmount('');

      // Refresh the budgets list to show updated data
      await fetchBudgets();
      
      // Trigger refresh for parent component
      if (onChanged) {
        onChanged();
      }

    } catch (error) {
      console.error('Error setting bulk budgets:', error);
      toast({
        title: 'Error',
        description: 'Failed to set bulk budgets. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setBulkBudgetProcessing(false);
    }
  };

  // Function to reload current budget data
  const reloadCurrentBudget = async () => {
    if (!selectedMonth || !selectedYear || !user?.id) {
      setCurrentBudget(null);
      setTotalMonthBudget(null);
      return;
    }

    setIsLoadingBudget(true);

    try {
      if (selectedMonth === 'ALL') {
        // When special month options are selected, show appropriate message
        setCurrentBudget(null);
        setTotalMonthBudget(null);
        console.log(`${selectedMonth} selected - no specific budget to load`);
      } else if (selectedCategory === 'ALL') {
        // When ALL categories is selected, get total budget for the month
        const monthYear = `${selectedYear}-${selectedMonth}`;
        const totalBudgetData = await getTotalBudgetForMonth(monthYear);
        setCurrentBudget(null);
        setTotalMonthBudget(totalBudgetData);
      } else if (selectedCategory) {
        // Get specific category budget
        const monthYear = `${selectedYear}-${selectedMonth}`;
        const budgetData = await getBudgetWithCarryover(selectedCategory, monthYear);
        setCurrentBudget(budgetData);
        setTotalMonthBudget(null);
      } else {
        setCurrentBudget(null);
        setTotalMonthBudget(null);
      }
    } catch (error) {
      console.error('Error loading current budget:', error);
      setCurrentBudget(null);
      setTotalMonthBudget(null);
    } finally {
      setIsLoadingBudget(false);
    }
  };

  // Optimized function to load total budget with caching
  const loadTotalBudgetWithCache = async (monthYear: string): Promise<{
    totalBudget: number;
    totalSpent: number;
    totalRemaining: number;
  } | null> => {
    const cacheKey = `${user?.id}-${monthYear}`;
    const now = Date.now();
    
    // Check cache first
    const cached = budgetCache.get(cacheKey);
    if (cached && (now - cached.timestamp) < CACHE_EXPIRY) {
      console.log('Using cached total budget data for:', monthYear);
      return {
        totalBudget: cached.totalBudget,
        totalSpent: cached.totalSpent,
        totalRemaining: cached.totalRemaining
      };
    }

    // Fetch fresh data
    console.log('Fetching fresh total budget data for:', monthYear);
    const totalBudget = await getTotalBudgetForMonth(monthYear);
    
    if (totalBudget) {
      // Update cache
      setBudgetCache(prev => new Map(prev).set(cacheKey, {
        ...totalBudget,
        timestamp: now
      }));
    }
    
    return totalBudget;
  };

  // Load current budget when category, month, or year changes
  useEffect(() => {
    let isMounted = true;

    const loadCurrentBudget = async () => {
      if (!selectedMonth || !selectedYear || !user?.id) {
        if (isMounted) {
          setCurrentBudget(null);
          setTotalMonthBudget(null);
        }
        return;
      }

      if (isMounted) {
        setIsLoadingBudget(true);
      }

      try {
        if (selectedMonth === 'ALL') {
          // When special month options are selected, show appropriate message
          if (isMounted) {
            setCurrentBudget(null);
            setTotalMonthBudget(null);
            console.log(`${selectedMonth} selected - no specific budget to load`);
          }
        } else if (selectedCategory && selectedCategory !== 'ALL') {
          // Load specific category budget
          const monthYear = `${selectedYear}-${selectedMonth}`;
          console.log('Loading category budget for:', { selectedCategory, monthYear, userId: user.id });
          const budget = await getBudgetWithCarryover(selectedCategory, monthYear);
          console.log('Category budget loaded:', budget);
          
          if (isMounted) {
            setCurrentBudget(budget);
            setTotalMonthBudget(null);
            console.log('Current budget state set to:', budget);
          }
        } else if (selectedCategory === 'ALL') {
          // Load total month budget when ALL is selected (with caching)
          const monthYear = `${selectedYear}-${selectedMonth}`;
          console.log('Loading total month budget for ALL categories:', { monthYear, userId: user.id });
          const totalBudget = await loadTotalBudgetWithCache(monthYear);
          console.log('Total month budget loaded:', totalBudget);
          
          if (isMounted) {
            setTotalMonthBudget(totalBudget);
            setCurrentBudget(null);
            console.log('Total month budget state set to:', totalBudget);
          }
        } else {
          // Load total month budget when no category is selected (with caching)
          const monthYear = `${selectedYear}-${selectedMonth}`;
          console.log('Loading total month budget for:', { monthYear, userId: user.id });
          const totalBudget = await loadTotalBudgetWithCache(monthYear);
          console.log('Total month budget loaded:', totalBudget);
          
          if (isMounted) {
            setTotalMonthBudget(totalBudget);
            setCurrentBudget(null);
            console.log('Total month budget state set to:', totalBudget);
          }
        }
      } catch (error) {
        console.error('Error loading budget:', error);
        if (isMounted) {
          setCurrentBudget(null);
          setTotalMonthBudget(null);
        }
      } finally {
        if (isMounted) {
          setIsLoadingBudget(false);
        }
      }
    };

    loadCurrentBudget();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedMonth, selectedYear, user?.id]);

  const handleSetBudget = async () => {
    if (!selectedCategory || !selectedMonth || !selectedYear || !budgetAmount.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please select a category, month, year, and enter a budget amount.',
        variant: 'destructive',
      });
      return;
    }

    const amount = parseFloat(budgetAmount);
    if (isNaN(amount) || amount < 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid budget amount.',
        variant: 'destructive',
      });
      return;
    }

    console.log('handleSetBudget called with:', {
      selectedCategory,
      selectedMonth,
      amount,
      editingBudget: editingBudget?.id
    });

    // Combine month and year into the expected format
    const monthYear = `${selectedYear}-${selectedMonth}`;
    

    // Handle single month budget setting
    // If editing and category/month changed, we need to delete the old budget first
    if (editingBudget && (editingBudget.category_id !== selectedCategory || editingBudget.month_year !== monthYear)) {
      console.log('Category or month changed, deleting old budget first');
      const deleteResult = await deleteBudget(editingBudget.id);
      if (deleteResult.error) {
        console.error('Failed to delete old budget:', deleteResult.error);
        toast({
          title: 'Error',
          description: 'Failed to update budget. Please try again.',
          variant: 'destructive',
        });
        return;
      }
    }

    const result = await setBudget(selectedCategory, monthYear, amount, editingBudget?.id || existingBudget?.id);
    console.log('setBudget result:', result);
    
    if (!result.error) {
      setBudgetAmount('');
      setEditingBudget(null); // Clear editing state
      onChanged?.();
      
      // Invalidate cache for the affected month
      invalidateBudgetCache(monthYear);
      
      // Reload current budget data to reflect changes
      await reloadCurrentBudget();
    }
  };

  const handleEditBudget = (budget: Budget) => {
    setEditingBudget(budget);
    setSelectedCategory(budget.category_id);
    
    // Parse month_year (format: YYYY-MM) into separate month and year
    const [year, month] = budget.month_year.split('-');
    setSelectedYear(year);
    setSelectedMonth(month);
    
    setBudgetAmount(budget.amount.toString());
  };

  const handleDeleteBudget = async (budgetId: string) => {
    setBusyId(budgetId);
    const result = await deleteBudget(budgetId);
    setBusyId(null);
    if (!result.error) {
      // Invalidate cache for the affected month
      const monthYear = `${selectedYear}-${selectedMonth}`;
      invalidateBudgetCache(monthYear);
      onChanged?.();
      // Reload current budget data to reflect changes
      await reloadCurrentBudget();
    }
  };

  const toggleMonthExpansion = (monthYear: string) => {
    setExpandedMonths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(monthYear)) {
        newSet.delete(monthYear);
      } else {
        newSet.add(monthYear);
      }
      return newSet;
    });
  };

  // Bulk budget functions
  const handleBulkBudgetMonthChange = (month: string) => {
    setBulkBudgetMonth(month);
  };

  const handleBulkBudgetYearChange = (year: string) => {
    setBulkBudgetYear(year);
  };

  const loadBulkBudgetData = async () => {
    if (bulkBudgetMonth && bulkBudgetYear && categories.length > 0) {
      const monthYear = `${bulkBudgetYear}-${bulkBudgetMonth}`;
      console.log('Loading bulk budget data for:', monthYear);
      // Initialize budget data with existing budgets for the selected month/year
      const initialData: Record<string, string> = {};
      categories.forEach(category => {
        const existingBudget = budgets.find(b => 
          b.category_id === category.id && b.month_year === monthYear
        );
        initialData[category.id] = existingBudget ? existingBudget.amount.toString() : '';
      });
      setBulkBudgetData(initialData);
      setInitialBulkBudgetData({ ...initialData }); // Store initial values for comparison
      
      // Load total budget for the selected month
      try {
        const totalBudgetData = await getTotalBudgetForMonth(monthYear);
        setBulkModalTotalBudget(totalBudgetData);
      } catch (error) {
        console.error('Error loading total budget for bulk modal:', error);
        setBulkModalTotalBudget(null);
      }
    }
  };

  const handleBulkBudgetChange = (categoryId: string, value: string) => {
    setBulkBudgetData(prev => ({
      ...prev,
      [categoryId]: value
    }));
  };

  const handleBulkBudgetSubmit = async () => {
    if (!bulkBudgetMonth || !bulkBudgetYear || !user?.id) return;

    const monthYear = `${bulkBudgetYear}-${bulkBudgetMonth}`;
    setBulkBudgetLoading(true);
    let successCount = 0;
    let errorCount = 0;
    let deleteCount = 0;
    let skippedCount = 0;

    try {
      // Only process categories that have actually changed
      const changedCategories = Object.keys(bulkBudgetData).filter(categoryId => {
        const currentValue = bulkBudgetData[categoryId];
        const initialValue = initialBulkBudgetData[categoryId];
        return currentValue !== initialValue;
      });

      console.log(`Processing ${changedCategories.length} changed categories out of ${Object.keys(bulkBudgetData).length} total categories`);

      for (const categoryId of changedCategories) {
        try {
          const amountStr = bulkBudgetData[categoryId];
          
          // Check if budget already exists
          const existingBudget = budgets.find(b => 
            b.category_id === categoryId && b.month_year === monthYear
          );

          // If field is empty and budget exists, delete the budget
          if (!amountStr.trim() && existingBudget) {
            const deleteResult = await deleteBudget(existingBudget.id);
            if (!deleteResult.error) {
              deleteCount++;
              // Invalidate cache for the affected month
              invalidateBudgetCache(monthYear);
            } else {
              errorCount++;
            }
            continue;
          }

          // If field is empty and no budget exists, skip
          if (!amountStr.trim()) {
            skippedCount++;
            continue;
          }

          // Validate amount
          const amount = parseFloat(amountStr);
          if (isNaN(amount) || amount < 0) {
            errorCount++;
            continue;
          }

          // Set or update budget
          const result = await setBudget(
            categoryId, 
            monthYear, 
            amount, 
            existingBudget?.id
          );

          if (!result.error) {
            successCount++;
            // Invalidate cache for the affected month
            invalidateBudgetCache(monthYear);
          } else {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
          console.error(`Error processing budget for category ${categoryId}:`, error);
        }
      }

      // Show success message if any operations succeeded
      if (successCount > 0 || deleteCount > 0) {
        let message = '';
        if (successCount > 0 && deleteCount > 0) {
          message = `Successfully updated ${successCount} budget${successCount !== 1 ? 's' : ''} and deleted ${deleteCount} budget${deleteCount !== 1 ? 's' : ''} for ${formatDateInIST(monthYear + '-01', { year: 'numeric', month: 'long' })}`;
        } else if (successCount > 0) {
          message = `Successfully updated ${successCount} budget${successCount !== 1 ? 's' : ''} for ${formatDateInIST(monthYear + '-01', { year: 'numeric', month: 'long' })}`;
        } else if (deleteCount > 0) {
          message = `Successfully deleted ${deleteCount} budget${deleteCount !== 1 ? 's' : ''} for ${formatDateInIST(monthYear + '-01', { year: 'numeric', month: 'long' })}`;
        }
        
        if (errorCount > 0) {
          message += ` (${errorCount} failed)`;
        }

        if (skippedCount > 0) {
          message += ` (${skippedCount} unchanged)`;
        }

        toast({
          title: 'Bulk Budget Update Successful',
          description: message,
        });
        // Refresh the total budget display
        await loadBulkBudgetData();
        
        setShowBulkBudgetModal(false);
        setBulkBudgetMonth('');
        setBulkBudgetYear('');
        setBulkBudgetData({});
        setInitialBulkBudgetData({});
        setShowImportSection(false);
      } else if (changedCategories.length === 0) {
        // No changes were made
        toast({
          title: 'No Changes Detected',
          description: 'No budget values were modified. All values remain unchanged.',
        });
      } else {
        // All operations failed
        toast({
          title: 'Update Failed',
          description: `Failed to update ${errorCount} budget${errorCount !== 1 ? 's' : ''}. Please try again.`,
          variant: 'destructive',
        });
      }
      
      setImportedBudgets([]);
      onChanged?.();
    } catch (error) {
      console.error('Error in bulk budget update:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while updating budgets.',
        variant: 'destructive',
      });
    } finally {
      setBulkBudgetLoading(false);
    }
  };

  const openBulkBudgetModal = () => {
    if (!bulkBudgetMonth || !bulkBudgetYear) {
      toast({
        title: 'Select Month and Year First',
        description: 'Please select both month and year before opening the budget form.',
        variant: 'destructive',
      });
      return;
    }
    // Load budget data before opening modal
    loadBulkBudgetData();
    setShowBulkBudgetModal(true);
  };

  // Excel import functions
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportLoading(true);

    try {
      const XLSX = await loadXlsx();
      const data = new Uint8Array(await file.arrayBuffer());
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Validate and process the data
      const processedBudgets = processExcelData(jsonData);
      setImportedBudgets(processedBudgets);

      // Apply imported budgets to the form
      applyImportedBudgets(processedBudgets);

      toast({
        title: 'Excel Import Successful',
        description: `Successfully imported ${processedBudgets.filter(b => b.isValid).length} valid budget entries.`,
      });
    } catch (error) {
      console.error('Error reading Excel file:', error);
      toast({
        title: 'Import Error',
        description: 'Failed to read the Excel file. Please check the format.',
        variant: 'destructive',
      });
    } finally {
      setImportLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const processExcelData = (data: unknown[]): Array<{
    categoryName: string;
    budget: number;
    isValid: boolean;
    error?: string;
  }> => {
    const processed: Array<{
      categoryName: string;
      budget: number;
      isValid: boolean;
      error?: string;
    }> = [];

    // Skip header row if it exists
    const startRow = Array.isArray(data[0]) && data[0][0]?.toString().toLowerCase().includes('category') ? 1 : 0;

    for (let i = startRow; i < data.length; i++) {
      const row = data[i];
      if (!Array.isArray(row) || row.length < 2) continue;

      const categoryName = row[0]?.toString().trim();
      const budgetValue = row[1];

      if (!categoryName) {
        processed.push({
          categoryName: '',
          budget: 0,
          isValid: false,
          error: 'Category name is required'
        });
        continue;
      }

      // Check if category exists
      const category = categories.find(cat => 
        cat.name.toLowerCase() === categoryName.toLowerCase()
      );

      if (!category) {
        processed.push({
          categoryName,
          budget: 0,
          isValid: false,
          error: 'Category not found'
        });
        continue;
      }

      // Validate budget amount
      const budget = parseFloat(budgetValue);
      if (isNaN(budget) || budget < 0) {
        processed.push({
          categoryName,
          budget: 0,
          isValid: false,
          error: 'Invalid budget amount'
        });
        continue;
      }

      processed.push({
        categoryName,
        budget,
        isValid: true
      });
    }

    return processed;
  };

  const applyImportedBudgets = (importedBudgets: Array<{
    categoryName: string;
    budget: number;
    isValid: boolean;
    error?: string;
  }>) => {
    const updatedData = { ...bulkBudgetData };
    
    importedBudgets.forEach(item => {
      if (item.isValid) {
        const category = categories.find(cat => 
          cat.name.toLowerCase() === item.categoryName.toLowerCase()
        );
        if (category) {
          updatedData[category.id] = item.budget.toString();
        }
      }
    });
    
    setBulkBudgetData(updatedData);
    // Don't update initialBulkBudgetData - keep the original values so changes are detected
    // This allows the save function to properly detect imported values as changes
  };

  const downloadSampleTemplate = async () => {
    // Create sample data with current categories
    const sampleData = [
      ['Category Name', 'Budget'],
      ...categories.slice(0, 5).map(category => [
        category.name,
        1000 // Sample budget amount
      ])
    ];

    // Create workbook and worksheet
    try {
      const XLSX = await loadXlsx();
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(sampleData);
    
      // Set column widths
      ws['!cols'] = [
        { wch: 20 }, // Category Name column
        { wch: 15 }  // Budget column
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Budget Template');

      // Download the file
      XLSX.writeFile(wb, 'budget_template.xlsx');

      toast({
        title: 'Template Downloaded',
        description: 'Sample Excel template has been downloaded to your device.',
      });
    } catch (error) {
      console.error('Error generating template:', error);
      toast({
        title: 'Download Error',
        description: 'Failed to generate the Excel template. Please try again.',
        variant: 'destructive',
      });
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-1 sm:p-4 z-50">
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 w-full max-w-[98vw] sm:max-w-[95vw] max-h-[98vh] sm:max-h-[95vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-white">Budget Management</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Desktop: Side by side, Mobile: Single column */}
        <div className="hidden lg:flex h-[calc(95vh-120px)]">
          {/* Left Column - Budget Setting Form */}
          <div className="w-1/2 p-4 sm:p-6 space-y-6 overflow-y-auto border-r border-white/10">
          {/* Set New Budget */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">
                {selectedCategory === 'ALL'
                  ? 'View Total Budget'
                  : editingBudget || existingBudget 
                    ? 'Update Budget' 
                    : 'Set Monthly Budget'
                }
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-white text-sm">Category</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">
                        ALL - Total Budget
                      </SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{getCategoryIcon(category.name)}</span>
                            <span>{category.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-white text-sm">Month</Label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {separateMonthOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-white text-sm">Year</Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-white text-sm">Budget Amount</Label>
                  <Input
                    type="number"
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(e.target.value)}
                    placeholder={selectedCategory === 'ALL' ? 'Not available for Total Budget' : '0.00'}
                    className={`bg-white/10 border-white/20 text-white ${selectedCategory === 'ALL' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={selectedCategory === 'ALL'}
                  />
                </div>
              </div>

              <Button 
                onClick={handleSetBudget}
                disabled={loading || !selectedCategory || !selectedMonth || !selectedYear || !budgetAmount.trim() || selectedCategory === 'ALL'}
                className="w-full bg-gradient-primary hover:bg-gradient-primary/90 text-white"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Setting...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    {selectedCategory === 'ALL'
                      ? 'View Total Budget Only'
                      : editingBudget || existingBudget 
                        ? 'Update Budget' 
                        : 'Set Monthly Budget'
                    }
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Current Budget Display */}
          {selectedMonth && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-white">
                  {selectedMonth === 'ALL'
                    ? selectedCategory === 'ALL'
                      ? 'Total Budget - All Categories'
                      : `Budget Details - ${categories.find(c => c.id === selectedCategory)?.name || 'Category'} (All Months)`
                    : selectedCategory === 'ALL'
                      ? `Total Budget - ${formatDateInIST(monthYear + '-01', { year: 'numeric', month: 'long' })}`
                      : selectedCategory 
                        ? `Budget Details - ${categories.find(c => c.id === selectedCategory)?.name || 'Category'}`
                        : `Total Budget - ${formatDateInIST(monthYear + '-01', { year: 'numeric', month: 'long' })}`
                  }
                </CardTitle>

              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingBudget ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading budget details...</p>
                  </div>
                ) : currentBudget ? (
                  // Show specific category budget
                  <>
                    {isFutureMonth(monthYear) && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/20 border border-blue-500/30 mb-4">
                        <Calendar className="h-4 w-4 text-blue-400" />
                        <span className="text-blue-400 text-sm">
                          Future month selected - showing budget only (no expenses yet)
                        </span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="text-center p-3 rounded-lg bg-white/5">
                        <p className="text-xs text-muted-foreground">Base Budget</p>
                        <p className="text-lg font-bold text-white">₹{formatCurrencyInIST(currentBudget.amount || 0)}</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-white/5">
                        <p className="text-xs text-muted-foreground">Carryover</p>
                        <p className="text-lg font-bold text-green-400">₹{formatCurrencyInIST(currentBudget.carryover_amount || 0)}</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-white/5">
                        <p className="text-xs text-muted-foreground">Total Budget</p>
                        <p className="text-lg font-bold text-blue-400">₹{formatCurrencyInIST(currentBudget.total_budget || 0)}</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-white/5">
                        <p className="text-xs text-muted-foreground">Remaining</p>
                        <p className={`text-lg font-bold ${(currentBudget.remaining_amount || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          ₹{formatCurrencyInIST(currentBudget.remaining_amount || 0)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Spent this month:</span>
                        <span className="text-white">₹{formatCurrencyInIST(currentBudget.spent_amount || 0)}</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all ${
                            (currentBudget.spent_amount || 0) > (currentBudget.total_budget || 1) 
                              ? 'bg-red-500' 
                              : 'bg-gradient-primary'
                          }`}
                          style={{ 
                            width: `${Math.min(((currentBudget.spent_amount || 0) / (currentBudget.total_budget || 1)) * 100, 100)}%` 
                          }}
                        />
                      </div>
                    </div>

                    {(currentBudget.spent_amount || 0) > (currentBudget.total_budget || 0) && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/20 border border-red-500/30">
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                        <span className="text-red-400 text-sm">
                          Budget exceeded by ₹{formatCurrencyInIST((currentBudget.spent_amount || 0) - (currentBudget.total_budget || 0))}
                        </span>
                      </div>
                    )}
                  </>
                ) : totalMonthBudget ? (
                  // Show total month budget
                  <>
                    {isFutureMonth(monthYear) && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/20 border border-blue-500/30 mb-4">
                        <Calendar className="h-4 w-4 text-blue-400" />
                        <span className="text-blue-400 text-sm">
                          Future month selected - showing budget only (no expenses yet)
                        </span>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="text-center p-3 rounded-lg bg-white/5">
                        <p className="text-xs text-muted-foreground">Total Budget</p>
                        <p className="text-lg font-bold text-blue-400">₹{formatCurrencyInIST(totalMonthBudget.totalBudget || 0)}</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-white/5">
                        <p className="text-xs text-muted-foreground">Total Spent</p>
                        <p className="text-lg font-bold text-white">₹{formatCurrencyInIST(totalMonthBudget.totalSpent || 0)}</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-white/5">
                        <p className="text-xs text-muted-foreground">Total Remaining</p>
                        <p className={`text-lg font-bold ${(totalMonthBudget.totalRemaining || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          ₹{formatCurrencyInIST(totalMonthBudget.totalRemaining || 0)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Budget usage:</span>
                        <span className="text-white">{Math.round(((totalMonthBudget.totalSpent || 0) / (totalMonthBudget.totalBudget || 1)) * 100)}%</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all ${
                            (totalMonthBudget.totalSpent || 0) > (totalMonthBudget.totalBudget || 1) 
                              ? 'bg-red-500' 
                              : 'bg-gradient-primary'
                          }`}
                          style={{ 
                            width: `${Math.min(((totalMonthBudget.totalSpent || 0) / (totalMonthBudget.totalBudget || 1)) * 100, 100)}%` 
                          }}
                        />
                      </div>
                    </div>

                    {(totalMonthBudget.totalSpent || 0) > (totalMonthBudget.totalBudget || 0) && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/20 border border-red-500/30">
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                        <span className="text-red-400 text-sm">
                          Total budget exceeded by ₹{formatCurrencyInIST((totalMonthBudget.totalSpent || 0) - (totalMonthBudget.totalBudget || 0))}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  // Show no budget message
                  <div className="text-center py-8">
                    <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {selectedMonth === 'ALL'
                        ? selectedCategory === 'ALL'
                          ? 'No total budgets set across all categories'
                          : `No budgets set for ${categories.find(c => c.id === selectedCategory)?.name || 'this category'} across all months`
                        : selectedCategory === 'ALL'
                          ? `No budgets set for ${new Date(selectedMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}`
                          : selectedCategory 
                            ? `No budget set for ${categories.find(c => c.id === selectedCategory)?.name || 'this category'} in ${new Date(selectedMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}`
                            : `No budgets set for ${new Date(selectedMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}`
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Bulk Budget Setting Section */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Table className="h-5 w-5" />
                Set Budgets for All Categories
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-white text-sm">Select Month</Label>
                  <Select value={bulkBudgetMonth} onValueChange={handleBulkBudgetMonthChange}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {bulkMonthOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-white text-sm">Select Year</Label>
                  <Select value={bulkBudgetYear} onValueChange={handleBulkBudgetYearChange}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {bulkYearOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-white text-sm">Action</Label>
                  <Button 
                    onClick={openBulkBudgetModal}
                    disabled={!bulkBudgetMonth || !bulkBudgetYear}
                    className="w-full bg-gradient-primary hover:bg-gradient-primary/90 text-white"
                  >
                    <div className="flex items-center gap-2">
                      <Table className="h-4 w-4" />
                      Open Budget Form
                    </div>
                  </Button>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p>Select a month and year, then click "Open Budget Form" to set, update, or delete budgets for all categories in a tabular format.</p>
              </div>
            </CardContent>
          </Card>


          {/* Budget Transfer Section */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Budget Transfer
              </CardTitle>
              <p className="text-white/70 text-sm">
                Transfer budget amount from one category to another for a specific month
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white text-sm">Month</Label>
                  <Select value={transferMonth} onValueChange={setTransferMonth}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {separateMonthOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-white text-sm">Year</Label>
                  <Select value={transferYear} onValueChange={setTransferYear}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-white text-sm">Transfer Amount</Label>
                <Input
                  type="number"
                  placeholder="Enter amount to transfer"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white text-sm">From Category</Label>
                  <Select value={fromCategory} onValueChange={setFromCategory}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Select source category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{getCategoryIcon(category.name)}</span>
                            <span>{category.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-white text-sm">To Category</Label>
                  <Select value={toCategory} onValueChange={setToCategory}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Select target category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{getCategoryIcon(category.name)}</span>
                            <span>{category.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleBudgetTransfer}
                disabled={transferLoading || !transferMonth || !transferYear || !transferAmount || !fromCategory || !toCategory}
                className="w-full bg-gradient-primary hover:bg-gradient-primary/90 text-white"
              >
                {transferLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Transferring...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Transfer Budget
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Bulk Budget Setting */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Bulk Budget Setting
              </CardTitle>
              <p className="text-white/70 text-sm">
                Set the same budget amount for a category across multiple months
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* From Date */}
                <div className="space-y-2">
                  <Label className="text-white font-medium">From Date</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={bulkFromYear} onValueChange={setBulkFromYear}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {yearOptions.map((year) => (
                          <SelectItem key={year.value} value={year.value}>
                            {year.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={bulkFromMonth} onValueChange={setBulkFromMonth}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {separateMonthOptions.map((month) => (
                          <SelectItem key={month.value} value={month.value}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* To Date */}
                <div className="space-y-2">
                  <Label className="text-white font-medium">To Date</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={bulkToYear} onValueChange={setBulkToYear}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {yearOptions.map((year) => (
                          <SelectItem key={year.value} value={year.value}>
                            {year.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={bulkToMonth} onValueChange={setBulkToMonth}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {separateMonthOptions.map((month) => (
                          <SelectItem key={month.value} value={month.value}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Category */}
                <div className="space-y-2">
                  <Label className="text-white font-medium">Category</Label>
                  <Select value={bulkCategory} onValueChange={setBulkCategory}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{getCategoryIcon(category.name)}</span>
                            <span>{category.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Budget Amount */}
                <div className="space-y-2">
                  <Label className="text-white font-medium">Budget Amount</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60" />
                    <Input
                      type="number"
                      value={bulkAmount}
                      onChange={(e) => setBulkAmount(e.target.value)}
                      placeholder="Enter budget amount"
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-end">
                <Button
                  onClick={setBulkBudgets}
                  disabled={bulkBudgetProcessing || !bulkFromYear || !bulkFromMonth || !bulkToYear || !bulkToMonth || !bulkCategory || !bulkAmount}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0"
                >
                  {bulkBudgetProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                      Setting Budgets...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Set Bulk Budget
                    </>
                  )}
                </Button>
              </div>

              {/* Example Text */}
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <p className="text-white/70 text-sm">
                  <strong>Example:</strong> If you select From: February 2025, To: December 2025, Category: Food, Amount: 1000, 
                  then the Food category budget will be set to ₹1,000 for all months from February 2025 to December 2025.
                </p>
              </div>
            </CardContent>
          </Card>

        </div>

          {/* Right Column - All Monthly Budgets Overview (Desktop Only) */}
          <div className="w-1/2 p-4 sm:p-6 space-y-6 overflow-y-auto">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Current & Future Monthly Budgets
                </CardTitle>
                <div className="text-xs text-white/70 mt-2">
                  <p>• <span className="text-green-400">Budget</span>: Monthly budget amount</p>
                  <p>• Balance details (remaining & accumulated) shown automatically for current month only</p>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading monthly budgets...</p>
                  </div>
                ) : budgets.length === 0 ? (
                  <div className="text-center py-8">
                    <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No budgets set yet. Create your first budget above.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Generate month options for display */}
                    {(() => {
                      const monthDisplayOptions = [];
                      const currentDate = new Date();
                      
                      // Add current month
                      const currentYear = currentDate.getFullYear();
                      const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
                      const currentMonthYear = `${currentYear}-${currentMonth}`;
                      const currentDisplayName = currentDate.toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short' 
                      });
                      monthDisplayOptions.push({ value: currentMonthYear, label: currentDisplayName });
                      
                      // Add next 12 months (future months)
                      for (let i = 1; i <= 12; i++) {
                        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const monthYear = `${year}-${month}`;
                        const displayName = date.toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short' 
                        });
                        monthDisplayOptions.push({ value: monthYear, label: displayName });
                      }
                      
                      return monthDisplayOptions.map(monthOption => {
                        const monthBudgets = budgets.filter(b => b.month_year === monthOption.value);
                        const totalBudget = monthBudgets.reduce((sum, b) => sum + b.amount, 0);
                        const hasBudget = monthBudgets.length > 0;
                        
                        
                        return (
                          <div 
                            key={monthOption.value}
                            className={`p-3 rounded-lg border transition-all ${
                              hasBudget 
                                ? 'bg-white/10 border-white/20' 
                                : 'bg-white/5 border-white/10'
                            } ${
                              monthOption.value === selectedMonth 
                                ? 'ring-2 ring-blue-500/50 bg-blue-500/10' 
                                : ''
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <h3 className={`text-sm font-semibold ${
                                  hasBudget ? 'text-white' : 'text-muted-foreground'
                                }`}>
                                  {monthOption.label}
                                </h3>
                                {hasBudget && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleMonthExpansion(monthOption.value)}
                                    className="h-5 w-5 p-0 hover:bg-white/10 text-white/80"
                                  >
                                    {expandedMonths.has(monthOption.value) ? (
                                      <ChevronUp className="h-3 w-3" />
                                    ) : (
                                      <ChevronDown className="h-3 w-3" />
                                    )}
                                  </Button>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {hasBudget && (
                                  <span className="text-sm text-white/80">
                                    {monthBudgets.length} category{monthBudgets.length !== 1 ? 'ies' : 'y'}
                                  </span>
                                )}
                                <span className={`font-bold ${
                                  hasBudget ? 'text-green-400' : 'text-muted-foreground'
                                }`}>
                                  ₹{formatCurrencyInIST(totalBudget)}
                                </span>
                              </div>
                            </div>
                            
                            {hasBudget && expandedMonths.has(monthOption.value) && (
                              <div className="space-y-1 mt-2 pt-2 border-t border-white/10">
                                {monthBudgets.map(budget => {
                                  const accumulatedBalance = getCategoryAccumulatedBalance(budget.category_name, monthOption.value);
                                  const isCurrentMonth = monthOption.value === currentMonthYear;
                                  
                                  return (
                                    <BudgetItemWithBalance
                                      key={budget.id}
                                      budget={budget}
                                      monthYear={monthOption.value}
                                      remainingBalance={0} // Will be fetched when expanded
                                      accumulatedBalance={accumulatedBalance}
                                      onGetRemainingBalance={getCategoryRemainingBalance}
                                      showDetails={isCurrentMonth}
                                    />
                                  );
                                })}
                              </div>
                            )}
                            
                            {hasBudget && !expandedMonths.has(monthOption.value) && (
                              <div className="text-center py-1">
                                <p className="text-xs text-muted-foreground">
                                  Click the arrow to see {monthBudgets.length} categor{monthBudgets.length !== 1 ? 'ies' : 'y'}
                                  {monthOption.value === currentMonthYear ? ' with balance details' : ''}
                                </p>
                              </div>
                            )}
                            
                            {!hasBudget && (
                              <div className="text-center py-1">
                                <p className="text-xs text-muted-foreground">No budgets set</p>
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Mobile Layout - Tab-based Navigation */}
        <div className="lg:hidden h-[calc(98vh-120px)] sm:h-[calc(95vh-120px)] flex flex-col">
          {/* Mobile Tab Navigation */}
          <div className="flex border-b border-white/10 bg-white/5">
            <button
              onClick={() => setMobileActiveTab('budget')}
              className={`flex-1 py-4 px-3 text-sm font-medium transition-colors touch-manipulation ${
                mobileActiveTab === 'budget'
                  ? 'text-white border-b-2 border-blue-500 bg-white/10'
                  : 'text-white/70 active:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span className="hidden xs:inline">Budget Management</span>
                <span className="xs:hidden">Budget</span>
              </div>
            </button>
            <button
              onClick={() => setMobileActiveTab('overview')}
              className={`flex-1 py-4 px-3 text-sm font-medium transition-colors touch-manipulation ${
                mobileActiveTab === 'overview'
                  ? 'text-white border-b-2 border-blue-500 bg-white/10'
                  : 'text-white/70 active:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden xs:inline">Monthly Overview</span>
                <span className="xs:hidden">Overview</span>
              </div>
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {mobileActiveTab === 'budget' ? (
              <div className="p-4 sm:p-6 space-y-6">
            {/* Set New Budget */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-white">
                  {selectedCategory === 'ALL'
                    ? 'View Total Budget'
                    : editingBudget || existingBudget 
                      ? 'Update Budget' 
                      : 'Set Monthly Budget'
                  }
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Category</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">
                          ALL - Total Budget
                        </SelectItem>
                        {categories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{getCategoryIcon(category.name)}</span>
                              <span>{category.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white text-sm">Month</Label>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent>
                        {separateMonthOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white text-sm">Year</Label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {yearOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white text-sm">Budget Amount</Label>
                    <Input
                      type="number"
                      value={budgetAmount}
                      onChange={(e) => setBudgetAmount(e.target.value)}
                      placeholder={selectedCategory === 'ALL' ? 'Not available for Total Budget' : '0.00'}
                      className={`bg-white/10 border-white/20 text-white ${selectedCategory === 'ALL' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={selectedCategory === 'ALL'}
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleSetBudget}
                  disabled={loading || !selectedCategory || !selectedMonth || !selectedYear || !budgetAmount.trim() || selectedCategory === 'ALL'}
                  className="w-full bg-gradient-primary hover:bg-gradient-primary/90 text-white"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Setting...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      {selectedCategory === 'ALL'
                        ? 'View Total Budget Only'
                        : editingBudget || existingBudget 
                          ? 'Update Budget' 
                          : 'Set Monthly Budget'
                      }
                    </div>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Current Budget Display */}
            {selectedMonth && (
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-white">
                    {selectedMonth === 'ALL'
                      ? selectedCategory === 'ALL'
                        ? 'Total Budget - All Categories'
                        : `Budget Details - ${categories.find(c => c.id === selectedCategory)?.name || 'Category'} (All Months)`
                      : selectedMonth === 'ALL'
                        ? selectedCategory === 'ALL'
                          ? 'Total Budget - Past 6 Months'
                          : `Budget Details - ${categories.find(c => c.id === selectedCategory)?.name || 'Category'} (Past 6 Months)`
                      : selectedMonth === 'ALL'
                        ? selectedCategory === 'ALL'
                          ? 'Total Budget - Past 12 Months'
                          : `Budget Details - ${categories.find(c => c.id === selectedCategory)?.name || 'Category'} (Past 12 Months)`
                      : selectedCategory === 'ALL'
                        ? `Total Budget - ${formatDateInIST(monthYear + '-01', { year: 'numeric', month: 'long' })}`
                      : selectedCategory 
                        ? `Budget Details - ${categories.find(c => c.id === selectedCategory)?.name || 'Category'}`
                        : `Total Budget - ${formatDateInIST(monthYear + '-01', { year: 'numeric', month: 'long' })}`
                    }
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoadingBudget ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Loading budget details...</p>
                    </div>
                  ) : currentBudget ? (
                    // Show specific category budget
                    <>
                      {isFutureMonth(monthYear) && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/20 border border-blue-500/30 mb-4">
                          <Calendar className="h-4 w-4 text-blue-400" />
                          <span className="text-blue-400 text-sm">
                            Future month selected - showing budget only (no expenses yet)
                          </span>
                        </div>
                      )}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="text-center p-3 rounded-lg bg-white/5">
                          <p className="text-xs text-muted-foreground">Base Budget</p>
                          <p className="text-lg font-bold text-white">₹{formatCurrencyInIST(currentBudget.amount || 0)}</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-white/5">
                          <p className="text-xs text-muted-foreground">Carryover</p>
                          <p className="text-lg font-bold text-green-400">₹{formatCurrencyInIST(currentBudget.carryover_amount || 0)}</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-white/5">
                          <p className="text-xs text-muted-foreground">Total Budget</p>
                          <p className="text-lg font-bold text-blue-400">₹{formatCurrencyInIST(currentBudget.total_budget || 0)}</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-white/5">
                          <p className="text-xs text-muted-foreground">Remaining</p>
                          <p className={`text-lg font-bold ${(currentBudget.remaining_amount || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            ₹{formatCurrencyInIST(currentBudget.remaining_amount || 0)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Spent this month:</span>
                          <span className="text-white">₹{formatCurrencyInIST(currentBudget.spent_amount || 0)}</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              (currentBudget.spent_amount || 0) > (currentBudget.total_budget || 1) 
                                ? 'bg-red-500' 
                                : 'bg-gradient-primary'
                            }`}
                            style={{ 
                              width: `${Math.min(((currentBudget.spent_amount || 0) / (currentBudget.total_budget || 1)) * 100, 100)}%` 
                            }}
                          />
                        </div>
                      </div>

                      {(currentBudget.spent_amount || 0) > (currentBudget.total_budget || 0) && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/20 border border-red-500/30">
                          <AlertTriangle className="h-4 w-4 text-red-400" />
                          <span className="text-red-400 text-sm">
                            Budget exceeded by ₹{formatCurrencyInIST((currentBudget.spent_amount || 0) - (currentBudget.total_budget || 0))}
                          </span>
                        </div>
                      )}
                    </>
                  ) : totalMonthBudget ? (
                    // Show total month budget
                    <>
                      {isFutureMonth(monthYear) && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/20 border border-blue-500/30 mb-4">
                          <Calendar className="h-4 w-4 text-blue-400" />
                          <span className="text-blue-400 text-sm">
                            Future month selected - showing budget only (no expenses yet)
                          </span>
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="text-center p-3 rounded-lg bg-white/5">
                          <p className="text-xs text-muted-foreground">Total Budget</p>
                          <p className="text-lg font-bold text-blue-400">₹{formatCurrencyInIST(totalMonthBudget.totalBudget || 0)}</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-white/5">
                          <p className="text-xs text-muted-foreground">Total Spent</p>
                          <p className="text-lg font-bold text-white">₹{formatCurrencyInIST(totalMonthBudget.totalSpent || 0)}</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-white/5">
                          <p className="text-xs text-muted-foreground">Total Remaining</p>
                          <p className={`text-lg font-bold ${(totalMonthBudget.totalRemaining || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            ₹{formatCurrencyInIST(totalMonthBudget.totalRemaining || 0)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Budget usage:</span>
                          <span className="text-white">{Math.round(((totalMonthBudget.totalSpent || 0) / (totalMonthBudget.totalBudget || 1)) * 100)}%</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              (totalMonthBudget.totalSpent || 0) > (totalMonthBudget.totalBudget || 1) 
                                ? 'bg-red-500' 
                                : 'bg-gradient-primary'
                            }`}
                            style={{ 
                              width: `${Math.min(((totalMonthBudget.totalSpent || 0) / (totalMonthBudget.totalBudget || 1)) * 100, 100)}%` 
                            }}
                          />
                        </div>
                      </div>

                      {(totalMonthBudget.totalSpent || 0) > (totalMonthBudget.totalBudget || 0) && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/20 border border-red-500/30">
                          <AlertTriangle className="h-4 w-4 text-red-400" />
                          <span className="text-red-400 text-sm">
                            Total budget exceeded by ₹{formatCurrencyInIST((totalMonthBudget.totalSpent || 0) - (totalMonthBudget.totalBudget || 0))}
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    // Show no budget message
                    <div className="text-center py-8">
                      <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        {selectedMonth === 'ALL'
                          ? selectedCategory === 'ALL'
                            ? 'No total budgets set across all categories'
                            : `No budgets set for ${categories.find(c => c.id === selectedCategory)?.name || 'this category'} across all months`
                          : selectedMonth === 'ALL'
                            ? selectedCategory === 'ALL'
                              ? 'No total budgets set for past 6 months'
                              : `No budgets set for ${categories.find(c => c.id === selectedCategory)?.name || 'this category'} in past 6 months`
                          : selectedMonth === 'ALL'
                            ? selectedCategory === 'ALL'
                              ? 'No total budgets set for past 12 months'
                              : `No budgets set for ${categories.find(c => c.id === selectedCategory)?.name || 'this category'} in past 12 months`
                          : selectedCategory === 'ALL'
                            ? `No budgets set for ${new Date(selectedMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}`
                          : selectedCategory 
                            ? `No budget set for ${categories.find(c => c.id === selectedCategory)?.name || 'this category'} in ${new Date(selectedMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}`
                            : `No budgets set for ${new Date(selectedMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}`
                        }
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Bulk Budget Setting Section - Mobile */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Table className="h-5 w-5" />
                  Set Budgets for All Categories
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Select Month</Label>
                    <Select value={bulkBudgetMonth} onValueChange={handleBulkBudgetMonthChange}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent>
                        {bulkMonthOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white text-sm">Select Year</Label>
                    <Select value={bulkBudgetYear} onValueChange={handleBulkBudgetYearChange}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {bulkYearOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white text-sm">Action</Label>
                    <Button 
                      onClick={openBulkBudgetModal}
                      disabled={!bulkBudgetMonth || !bulkBudgetYear}
                      className="w-full bg-gradient-primary hover:bg-gradient-primary/90 text-white"
                    >
                      <div className="flex items-center gap-2">
                        <Table className="h-4 w-4" />
                        Open Budget Form
                      </div>
                    </Button>
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  <p>Select a month and year, then click "Open Budget Form" to set, update, or delete budgets for all categories in a tabular format.</p>
                </div>
              </CardContent>
            </Card>

            {/* Budget Transfer Section - Mobile */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Budget Transfer
                </CardTitle>
                <p className="text-white/70 text-sm">
                  Transfer budget amount from one category to another for a specific month
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Month</Label>
                    <Select value={transferMonth} onValueChange={setTransferMonth}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent>
                        {separateMonthOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Year</Label>
                    <Select value={transferYear} onValueChange={setTransferYear}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {yearOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-white text-sm">Transfer Amount</Label>
                  <Input
                    type="number"
                    placeholder="Enter amount to transfer"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white text-sm">From Category</Label>
                    <Select value={fromCategory} onValueChange={setFromCategory}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Select source category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{getCategoryIcon(category.name)}</span>
                              <span>{category.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white text-sm">To Category</Label>
                    <Select value={toCategory} onValueChange={setToCategory}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Select target category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{getCategoryIcon(category.name)}</span>
                              <span>{category.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleBudgetTransfer}
                  disabled={transferLoading || !transferMonth || !transferYear || !transferAmount || !fromCategory || !toCategory}
                  className="w-full bg-gradient-primary hover:bg-gradient-primary/90 text-white"
                >
                  {transferLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Transferring...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Transfer Budget
                    </div>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Bulk Budget Setting - Mobile */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Bulk Budget Setting
                </CardTitle>
                <p className="text-white/70 text-sm">
                  Set the same budget amount for a category across multiple months
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {/* From Date */}
                  <div className="space-y-2">
                    <Label className="text-white font-medium">From Date</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={bulkFromYear} onValueChange={setBulkFromYear}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {yearOptions.map((year) => (
                            <SelectItem key={year.value} value={year.value}>
                              {year.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={bulkFromMonth} onValueChange={setBulkFromMonth}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                          {separateMonthOptions.map((month) => (
                            <SelectItem key={month.value} value={month.value}>
                              {month.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* To Date */}
                  <div className="space-y-2">
                    <Label className="text-white font-medium">To Date</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={bulkToYear} onValueChange={setBulkToYear}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {yearOptions.map((year) => (
                            <SelectItem key={year.value} value={year.value}>
                              {year.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={bulkToMonth} onValueChange={setBulkToMonth}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                          {separateMonthOptions.map((month) => (
                            <SelectItem key={month.value} value={month.value}>
                              {month.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <Label className="text-white font-medium">Category</Label>
                    <Select value={bulkCategory} onValueChange={setBulkCategory}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{getCategoryIcon(category.name)}</span>
                              <span>{category.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Budget Amount */}
                  <div className="space-y-2">
                    <Label className="text-white font-medium">Budget Amount</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60" />
                      <Input
                        type="number"
                        value={bulkAmount}
                        onChange={(e) => setBulkAmount(e.target.value)}
                        placeholder="Enter budget amount"
                        className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="flex justify-end">
                  <Button
                    onClick={setBulkBudgets}
                    disabled={bulkBudgetProcessing || !bulkFromYear || !bulkFromMonth || !bulkToYear || !bulkToMonth || !bulkCategory || !bulkAmount}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0"
                  >
                    {bulkBudgetProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                        Setting Budgets...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Set Bulk Budget
                      </>
                    )}
                  </Button>
                </div>

                {/* Example Text */}
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <p className="text-white/70 text-sm">
                    <strong>Example:</strong> If you select From: February 2025, To: December 2025, Category: Food, Amount: 1000, 
                    then the Food category budget will be set to ₹1,000 for all months from February 2025 to December 2025.
                  </p>
                </div>
              </CardContent>
            </Card>



              </div>
            ) : (
              /* Monthly Overview Tab Content */
              <div className="p-4 sm:p-6">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Current & Future Monthly Budgets
                    </CardTitle>
                    <div className="text-xs text-white/70 mt-2">
                      <p>• <span className="text-green-400">Budget</span>: Monthly budget amount</p>
                      <p>• Balance details (remaining & accumulated) shown automatically for current month only</p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Loading monthly budgets...</p>
                      </div>
                    ) : budgets.length === 0 ? (
                      <div className="text-center py-8">
                        <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No budgets set yet. Create your first budget above.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Generate month options for display */}
                        {(() => {
                          const monthDisplayOptions = [];
                          const currentDate = new Date();
                          
                          // Add current month
                          const currentYear = currentDate.getFullYear();
                          const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
                          const currentMonthYear = `${currentYear}-${currentMonth}`;
                          const currentDisplayName = currentDate.toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short' 
                          });
                          monthDisplayOptions.push({ value: currentMonthYear, label: currentDisplayName });
                          
                          // Add next 12 months (future months)
                          for (let i = 1; i <= 12; i++) {
                            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const monthYear = `${year}-${month}`;
                            const displayName = date.toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short' 
                            });
                            monthDisplayOptions.push({ value: monthYear, label: displayName });
                          }
                          
                          return monthDisplayOptions.map(monthOption => {
                            const monthBudgets = budgets.filter(b => b.month_year === monthOption.value);
                            const totalBudget = monthBudgets.reduce((sum, b) => sum + b.amount, 0);
                            const hasBudget = monthBudgets.length > 0;
                            
                            return (
                              <div 
                                key={monthOption.value}
                                className={`p-3 rounded-lg border transition-all ${
                                  hasBudget 
                                    ? 'bg-white/10 border-white/20' 
                                    : 'bg-white/5 border-white/10'
                                } ${
                                  monthOption.value === selectedMonth 
                                    ? 'ring-2 ring-blue-500/50 bg-blue-500/10' 
                                    : ''
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <h3 className={`text-sm font-semibold ${
                                      hasBudget ? 'text-white' : 'text-muted-foreground'
                                    }`}>
                                      {monthOption.label}
                                    </h3>
                                    {hasBudget && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => toggleMonthExpansion(monthOption.value)}
                                        className="h-5 w-5 p-0 hover:bg-white/10 text-white/80"
                                      >
                                        {expandedMonths.has(monthOption.value) ? (
                                          <ChevronUp className="h-3 w-3" />
                                        ) : (
                                          <ChevronDown className="h-3 w-3" />
                                        )}
                                      </Button>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {hasBudget && (
                                      <span className="text-sm text-white/80">
                                        {monthBudgets.length} category{monthBudgets.length !== 1 ? 'ies' : 'y'}
                                      </span>
                                    )}
                                    <span className={`font-bold ${
                                      hasBudget ? 'text-green-400' : 'text-muted-foreground'
                                    }`}>
                                      ₹{formatCurrencyInIST(totalBudget)}
                                    </span>
                                  </div>
                                </div>
                                
                                {hasBudget && expandedMonths.has(monthOption.value) && (
                                  <div className="space-y-1 mt-2 pt-2 border-t border-white/10">
                                    {monthBudgets.map(budget => {
                                      const accumulatedBalance = getCategoryAccumulatedBalance(budget.category_name, monthOption.value);
                                      const isCurrentMonth = monthOption.value === currentMonthYear;
                                      
                                      return (
                                        <BudgetItemWithBalance
                                          key={budget.id}
                                          budget={budget}
                                          monthYear={monthOption.value}
                                          remainingBalance={0} // Will be fetched when expanded
                                          accumulatedBalance={accumulatedBalance}
                                          onGetRemainingBalance={getCategoryRemainingBalance}
                                          showDetails={isCurrentMonth}
                                        />
                                      );
                                    })}
                                  </div>
                                )}
                                
                                {hasBudget && !expandedMonths.has(monthOption.value) && (
                                  <div className="text-center py-1">
                                    <p className="text-xs text-muted-foreground">
                                      Click the arrow to see {monthBudgets.length} categor{monthBudgets.length !== 1 ? 'ies' : 'y'}
                                      {monthOption.value === currentMonthYear ? ' with balance details' : ''}
                                    </p>
                                  </div>
                                )}
                                
                                {!hasBudget && (
                                  <div className="text-center py-1">
                                    <p className="text-xs text-muted-foreground">No budgets set</p>
                                  </div>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Bulk Budget Modal */}
      {showBulkBudgetModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-1 sm:p-4 z-[60]">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 w-full max-w-[98vw] sm:max-w-5xl max-h-[98vh] sm:max-h-[95vh] overflow-hidden">
            <div className="p-3 sm:p-6 border-b border-white/10">
              {/* Mobile: Stack vertically, Desktop: Side by side */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <h2 className="text-lg sm:text-2xl font-heading font-bold text-white">
                      Set Budgets for {bulkBudgetMonth && bulkBudgetYear ? new Date(`${bulkBudgetYear}-${bulkBudgetMonth}-01`).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : 'Selected Month'}
                    </h2>
                    {bulkModalTotalBudget && (
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1">
                        <div className="flex items-center gap-1">
                          <span className="text-sm sm:text-base text-muted-foreground">Total Budget:</span>
                          <span className="text-sm sm:text-base font-semibold text-blue-400">₹{formatCurrencyInIST(bulkModalTotalBudget.totalBudget)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-sm sm:text-base text-muted-foreground">Total Spent:</span>
                          <span className="text-sm sm:text-base font-semibold text-white">₹{formatCurrencyInIST(bulkModalTotalBudget.totalSpent)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-sm sm:text-base text-muted-foreground">Remaining:</span>
                          <span className={`text-sm sm:text-base font-semibold ${bulkModalTotalBudget.totalRemaining >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            ₹{formatCurrencyInIST(bulkModalTotalBudget.totalRemaining)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Import from Excel Section - Mobile: Full width, Desktop: Compact */}
                <div className="flex items-center justify-between sm:justify-end gap-2">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={importLoading}
                      size="sm"
                      className="bg-gradient-primary hover:bg-gradient-primary/90 text-white text-xs sm:text-sm"
                    >
                      {importLoading ? (
                        <div className="flex items-center gap-1">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                          <span className="hidden sm:inline text-xs">Importing...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Upload className="h-3 w-3" />
                          <span className="text-xs">Import</span>
                        </div>
                      )}
                    </Button>
                    <Button
                      onClick={downloadSampleTemplate}
                      variant="outline"
                      size="sm"
                      className="glass-button text-xs"
                    >
                      <div className="flex items-center gap-1">
                        <FileSpreadsheet className="h-3 w-3" />
                        <span className="hidden sm:inline text-xs">Template</span>
                      </div>
                    </Button>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowBulkBudgetModal(false);
                      setShowImportSection(false);
                      setImportedBudgets([]);
                      setBulkModalTotalBudget(null);
                    }}
                    className="h-8 w-8 p-0 hover:bg-white/10"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Import Results Section */}
            {importedBudgets.length > 0 && (
              <div className="px-3 sm:px-6 py-2 border-b border-white/10">
                <div className="bg-white/5 p-2 sm:p-3 rounded border border-white/10">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0 mb-2">
                    <h4 className="text-xs sm:text-sm font-medium text-white">Import Results:</h4>
                    <div className="text-xs text-muted-foreground">
                      {importedBudgets.filter(b => b.isValid).length} valid, {importedBudgets.filter(b => !b.isValid).length} invalid
                    </div>
                  </div>
                  <div className="space-y-1 max-h-20 sm:max-h-24 overflow-y-auto">
                    {importedBudgets.map((item, index) => (
                      <div key={index} className={`text-xs flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0 ${
                        item.isValid ? 'text-green-400' : 'text-red-400'
                      }`}>
                        <span className="truncate">{item.categoryName || 'Unknown'}</span>
                        <span className="text-right">
                          {item.isValid 
                            ? `₹${formatCurrencyInIST(item.budget)}` 
                            : item.error
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="p-3 sm:p-6 overflow-y-auto max-h-[calc(98vh-200px)] sm:max-h-[calc(95vh-120px)]">
              <div className="space-y-3 sm:space-y-4">

                <div className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                  <p>Set or update budgets for all categories. Leave fields empty to delete existing budgets or skip categories.</p>
                  <p className="mt-1 sm:mt-2 text-blue-400">
                    {Object.keys(bulkBudgetData).filter(categoryId => 
                      bulkBudgetData[categoryId] !== initialBulkBudgetData[categoryId]
                    ).length} of {Object.keys(bulkBudgetData).length} categories have been modified
                  </p>
                </div>

                {/* Mobile: Card layout, Desktop: Table layout */}
                <div className="block sm:hidden space-y-2">
                  {categories.map(category => (
                    <div key={category.id} className="bg-white/5 p-3 rounded-lg border border-white/10">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getCategoryIcon(category.name)}</span>
                          <span className="text-white font-medium text-sm">{category.name}</span>
                        </div>
                        <Input
                          type="number"
                          value={bulkBudgetData[category.id] || ''}
                          onChange={(e) => handleBulkBudgetChange(category.id, e.target.value)}
                          placeholder="0.00"
                          className={`bg-white/10 border-white/20 text-white ${
                            bulkBudgetData[category.id] !== initialBulkBudgetData[category.id] 
                              ? 'ring-2 ring-blue-500/50 bg-blue-500/10' 
                              : ''
                          }`}
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop: Table layout */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-white/20">
                        <th className="text-left p-3 text-white font-medium">Category</th>
                        <th className="text-left p-3 text-white font-medium">Budget Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map(category => (
                        <tr key={category.id} className="border-b border-white/10 hover:bg-white/5">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{getCategoryIcon(category.name)}</span>
                              <span className="text-white font-medium">{category.name}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <Input
                              type="number"
                              value={bulkBudgetData[category.id] || ''}
                              onChange={(e) => handleBulkBudgetChange(category.id, e.target.value)}
                              placeholder="0.00"
                              className={`bg-white/10 border-white/20 text-white w-32 ${
                                bulkBudgetData[category.id] !== initialBulkBudgetData[category.id] 
                                  ? 'ring-2 ring-blue-500/50 bg-blue-500/10' 
                                  : ''
                              }`}
                              min="0"
                              step="0.01"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="text-xs text-muted-foreground bg-white/5 p-2 sm:p-3 rounded-lg">
                  <p><strong>💡 Tips:</strong></p>
                  <ul className="mt-1 space-y-1">
                    <li>• Enter a budget amount to set or update a budget</li>
                    <li>• Clear the field completely to delete an existing budget</li>
                    <li>• Leave fields empty if you don't want to change that category</li>
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-white/10">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowBulkBudgetModal(false);
                      setShowImportSection(false);
                      setImportedBudgets([]);
                      setBulkModalTotalBudget(null);
                    }}
                    className="glass-button w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBulkBudgetSubmit}
                    disabled={bulkBudgetLoading}
                    className="bg-gradient-primary hover:bg-gradient-primary/90 text-white w-full sm:w-auto"
                  >
                    {bulkBudgetLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Updating...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Save className="h-4 w-4" />
                        Save All Budgets
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};