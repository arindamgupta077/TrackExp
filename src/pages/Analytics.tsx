import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, TrendingUp, Calendar, PieChart, BarChart3, DollarSign, TrendingDown, RefreshCw, FileText, ChevronDown, ChevronUp, Target, Wallet, Download, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useExpenses } from '@/hooks/useExpenses';
import { useCredits } from '@/hooks/useCredits';
import { useCategories } from '@/hooks/useCategories';
import { useBudgets } from '@/hooks/useBudgets';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMonthlyRemainingBalances } from '@/hooks/useMonthlyRemainingBalances';
import { useCategorySummaries } from '@/hooks/useCategorySummaries';
import { useSalaryMonthsTracking } from '@/hooks/useSalaryMonthsTracking';
import { getCurrentDateStringInIST, getMonthYearInIST, formatCurrencyInIST } from '@/lib/dateUtils';
import { supabase } from '@/integrations/supabase/client';
import type { PostgrestError } from '@supabase/supabase-js';
import { getIconByCategoryName } from '@/data/categoryIcons';
import heroImage from '@/assets/hero-bg.jpg';
import CreditIncomeAnalyticsSection from '@/components/CreditIncomeAnalyticsSection';
import MonthlyRemainingBalancesChart from '@/components/MonthlyRemainingBalancesChart';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  BarChart as ReBarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';

const Analytics = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { expenses, loading } = useExpenses(user?.id);
  const { credits } = useCredits(user?.id);
  const { categories } = useCategories(user?.id);
  const { getBudgetWithCarryover } = useBudgets(user?.id);

  // Helper function to get category icon
  const getCategoryIcon = (categoryName: string): string => {
    const category = categories.find(cat => cat.name === categoryName);
    return category?.icon || getIconByCategoryName(categoryName);
  };
  const isMobile = useIsMobile();
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'monthly' | 'yearly'>('monthly');
  const [selectedDate, setSelectedDate] = useState(getCurrentDateStringInIST()); // For daily
  const [selectedMonth, setSelectedMonth] = useState(getMonthYearInIST().monthYear); // For monthly
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString()); // For yearly
  const [monthlyBalancesYear, setMonthlyBalancesYear] = useState(new Date().getFullYear()); // For monthly remaining balances
  const [categorySummaryMonth, setCategorySummaryMonth] = useState(getMonthYearInIST().monthYear); // For category summaries
  // Function to get all months that should be displayed (current months + salary months)
  const getAllDisplayableMonths = (): number[] => {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    // Start with current months (January to current month)
    const currentMonths = Array.from({ length: currentMonth }, (_, i) => i + 1);
    
    // Add salary months for the current year
    const salaryMonthsForCurrentYear = salaryMonths
      .filter(sm => sm.year === currentYear)
      .map(sm => sm.month);
    
    // Combine and remove duplicates
    const allMonths = [...new Set([...currentMonths, ...salaryMonthsForCurrentYear])];
    
    return allMonths.sort((a, b) => a - b);
  };

  const [selectedMonths, setSelectedMonths] = useState<number[]>(() => {
    const currentMonth = new Date().getMonth() + 1;
    return Array.from({ length: currentMonth }, (_, i) => i + 1);
  });

  // Month selection helpers
  const toggleMonth = (month: number) => {
    setSelectedMonths(prev => 
      prev.includes(month) 
        ? prev.filter(m => m !== month)
        : [...prev, month].sort((a, b) => a - b)
    );
  };

  const selectAllMonths = () => {
    setSelectedMonths(Array.from({ length: 12 }, (_, i) => i + 1));
  };

  const selectCurrentMonths = () => {
    const displayableMonths = getAllDisplayableMonths();
    setSelectedMonths(displayableMonths);
  };

  const clearMonthSelection = () => {
    setSelectedMonths([]);
  };

  const isMonthSelected = (month: number) => selectedMonths.includes(month);
  
  // Export state
  const [exportFromDate, setExportFromDate] = useState(getCurrentDateStringInIST());
  const [exportToDate, setExportToDate] = useState(getCurrentDateStringInIST());
  const [exportType, setExportType] = useState<'expenses' | 'credits'>('expenses');
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);
  
  // Expense Category Breakdown expand/collapse state
  const [isCategoryBreakdownExpanded, setIsCategoryBreakdownExpanded] = useState(true);

  // Scroll functions for navigation buttons
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest'
      });
    }
  };

  // Monthly remaining balances
  const { 
    data: monthlyBalances, 
    loading: monthlyBalancesLoading, 
    error: monthlyBalancesError,
    refetch: refetchMonthlyBalances,
    updateAllBalances,
    getRemainingBalanceForMonth,
    getTotalRemainingForMonth,
    getOverBudgetCategories,
    getAccumulatedTotalForCategory,
    getMonthName 
  } = useMonthlyRemainingBalances(user?.id, monthlyBalancesYear);

  // Salary months tracking
  const { salaryMonths, getSalaryMonthsSet, unmarkSalaryMonth } = useSalaryMonthsTracking(user?.id);

  // Category summaries
  const { 
    data: categorySummaries, 
    loading: categorySummariesLoading, 
    error: categorySummariesError,
    refetch: refetchCategorySummaries,
    updateAllSummaries,
    getTotalBudget,
    getTotalSpent,
    getTotalRemaining,
    getTotalAccumulatedRemaining,
    getOverBudgetCategoriesSummary,
    getUnderBudgetCategoriesSummary,
    getOnBudgetCategoriesSummary,
    formatMonthYear
  } = useCategorySummaries(user?.id, categorySummaryMonth);

  // Auto-update monthly remaining balances when page loads
  useEffect(() => {
    if (user?.id && monthlyBalancesYear) {
      // Update all balances for the selected year
      updateAllBalances();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, monthlyBalancesYear]); // Removed updateAllBalances from dependencies to prevent infinite loop

  // Auto-scroll to current month when monthly balances data loads
  useEffect(() => {
    if (monthlyBalances && monthlyBalances.length > 0) {
      // Scroll to current month after a short delay to ensure table is rendered
      const scrollToCurrentMonth = () => {
        const currentMonth = new Date().getMonth() + 1; // 1-12
        // Target the Monthly Remaining Balances table container specifically
        const monthlyBalancesSection = document.getElementById('monthly-balances');
        const tableContainer = monthlyBalancesSection?.querySelector('.overflow-x-auto');
        
        if (tableContainer) {
          // Calculate scroll position for current month
          // Mobile: Category column (80px) + each month column (65px) * (currentMonth - 1)
          // Desktop: Category column (120px) + each month column (90px) * (currentMonth - 1)
          const categoryWidth = isMobile ? 80 : 120;
          const monthWidth = isMobile ? 65 : 90;
          const scrollPosition = categoryWidth + (monthWidth * (currentMonth - 1));
          
          // Smooth scroll to current month
          tableContainer.scrollTo({
            left: scrollPosition,
            behavior: 'smooth'
          });
        }
      };
      
      // Delay to ensure table is fully rendered
      const timeoutId = setTimeout(scrollToCurrentMonth, 300);
      
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthlyBalances]);

  // Auto-update category summaries when page loads
  useEffect(() => {
    if (user?.id && categorySummaryMonth) {
      // Update all summaries for the selected month
      updateAllSummaries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, categorySummaryMonth]); // Removed updateAllSummaries from dependencies to prevent infinite loop

  // Auto-update selected months when salary months change
  useEffect(() => {
    const displayableMonths = getAllDisplayableMonths();
    setSelectedMonths(prev => {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      // Keep current months (January to current month) and add/remove salary months
      const currentMonths = Array.from({ length: currentMonth }, (_, i) => i + 1);
      const salaryMonthsForCurrentYear = salaryMonths
        .filter(sm => sm.year === currentYear)
        .map(sm => sm.month);
      
      // Combine current months with salary months
      const allValidMonths = [...new Set([...currentMonths, ...salaryMonthsForCurrentYear])];
      
      // Remove months that are no longer valid (future months without salary)
      const filteredMonths = prev.filter(month => allValidMonths.includes(month));
      
      // Add new salary months
      const newMonths = salaryMonthsForCurrentYear.filter(month => !filteredMonths.includes(month));
      
      return [...new Set([...filteredMonths, ...newMonths])].sort((a, b) => a - b);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salaryMonths]);

  // Function to check if a month still has salary credits and handle removal
  const checkAndHandleSalaryRemoval = async (year: number, month: number) => {
    if (!user?.id) return;

    try {
      // Check if there are any salary credits for this month
      const monthStart = `${year}-${month.toString().padStart(2, '0')}-01`;
      const nextMonth = new Date(year, month, 1); // month is 0-indexed in Date constructor
      const monthEnd = `${nextMonth.getFullYear()}-${(nextMonth.getMonth() + 1).toString().padStart(2, '0')}-01`;

      type SalaryCreditRow = { id: string };

      const { data: salaryCredits, error } = await (supabase
        .from('credits' as never)
        .select('id')
        .eq('user_id', user.id)
        .eq('category', 'Salary')
        .gte('date', monthStart)
        .lt('date', monthEnd)) as unknown as { data: SalaryCreditRow[] | null; error: PostgrestError | null };

      if (error) {
        console.error('Error checking salary credits:', error);
        return;
      }

      // If no salary credits found for this month, unmark the salary month
      if (!salaryCredits || salaryCredits.length === 0) {
        await unmarkSalaryMonth(year, month);
        
        // Remove the month from selected months if it's not a current month
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        
        if (year === currentYear && month > currentMonth) {
          setSelectedMonths(prev => prev.filter(m => m !== month));
        }
      }
    } catch (error) {
      console.error('Error in checkAndHandleSalaryRemoval:', error);
    }
  };

  // Monitor credits changes to check for salary removal
  useEffect(() => {
    if (credits.length > 0 && salaryMonths.length > 0) {
      // Check each salary month to see if it still has salary credits
      salaryMonths.forEach(salaryMonth => {
        const currentYear = new Date().getFullYear();
        if (salaryMonth.year === currentYear) {
          checkAndHandleSalaryRemoval(salaryMonth.year, salaryMonth.month);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credits, salaryMonths]);

  // Calculate analytics data
  const analytics = useMemo(() => {
    // Daily analytics
    const dailyExpenses = expenses.filter(expense => expense.date === selectedDate);
    const dailyTotal = dailyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const dailyByCategory = dailyExpenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    // Monthly analytics
    const monthlyExpenses = expenses.filter(expense => expense.date.startsWith(selectedMonth));
    const monthlyTotal = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const monthlyByCategory = monthlyExpenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    // Get daily breakdown for selected month
    const monthlyDailyBreakdown = monthlyExpenses.reduce((acc, expense) => {
      const day = expense.date.split('-')[2];
      // Convert to number to remove leading zeros, then back to string for consistency
      const dayKey = String(parseInt(day, 10));
      acc[dayKey] = (acc[dayKey] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    // Yearly analytics
    const yearlyExpenses = expenses.filter(expense => expense.date.startsWith(selectedYear));
    const yearlyTotal = yearlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const yearlyByCategory = yearlyExpenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    // Get monthly breakdown for selected year
    const yearlyMonthlyBreakdown = yearlyExpenses.reduce((acc, expense) => {
      const month = expense.date.slice(5, 7);
      acc[month] = (acc[month] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    return {
      daily: {
        total: dailyTotal,
        count: dailyExpenses.length,
        byCategory: dailyByCategory,
        expenses: dailyExpenses
      },
      monthly: {
        total: monthlyTotal,
        count: monthlyExpenses.length,
        byCategory: monthlyByCategory,
        dailyBreakdown: monthlyDailyBreakdown,
        expenses: monthlyExpenses
      },
      yearly: {
        total: yearlyTotal,
        count: yearlyExpenses.length,
        byCategory: yearlyByCategory,
        monthlyBreakdown: yearlyMonthlyBreakdown,
        expenses: yearlyExpenses
      }
    };
  }, [expenses, selectedDate, selectedMonth, selectedYear]);



  const currentData = analytics[selectedPeriod];

  // Prepare chart data
  const categoryChartData = useMemo(() => {
    const entries = Object.entries(currentData.byCategory);
    return entries
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value); // Sort by amount in descending order
  }, [currentData]);

  const timeChartData = useMemo(() => {
    if (selectedPeriod === 'daily') {
      // For daily view, show individual expenses (no chart, just list)
      return [];
    }
    if (selectedPeriod === 'monthly') {
      // Monthly view should show daily breakdown for the selected month
      const daily = analytics.monthly.dailyBreakdown;
      
      // Get the selected month and year to determine number of days
      const [year, month] = selectedMonth.split('-').map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();
      
      // Debug logging
      console.log('Daily breakdown data:', daily);
      console.log('Days in month:', daysInMonth);
      
      // Create array with all days of the month, ensuring proper positioning
      const chartData = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const amount = daily[String(day)] || 0;
        chartData.push({
          day: day,
          amount: amount
        });
        
        // Debug logging for days 1-9
        if (day <= 9) {
          console.log(`Day ${day}: amount = ${amount}, key exists: ${String(day) in daily}`);
        }
      }
      
      console.log('Final chart data:', chartData);
      return chartData;
    }
    if (selectedPeriod === 'yearly') {
      // Yearly view should show monthly breakdown for the selected year
      const monthly = analytics.yearly.monthlyBreakdown;
      const months = Object.keys(monthly)
        .map(m => parseInt(m))
        .sort((a, b) => a - b);
      return months.map(m => ({
        month: m,
        amount: monthly[String(m).padStart(2, '0')] || 0,
      }));
    }
    return [] as Array<{ day?: number; month?: number; amount: number }>;
  }, [selectedPeriod, analytics, selectedMonth]);

  const chartColors = [
    'var(--chart-purple)',
    'var(--chart-indigo)',
    'var(--chart-green)',
    'var(--chart-orange)',
    'var(--chart-red)',
    'var(--chart-teal)',
    'var(--chart-gold)',
    'var(--chart-rose)'
  ];


  // Export functions
  const getFilteredTransactionsCount = () => {
    if (!exportFromDate || !exportToDate) return 0;
    
    if (exportType === 'expenses') {
      return expenses.filter(expense => 
        expense.date >= exportFromDate && expense.date <= exportToDate
      ).length;
    } else {
      return credits.filter(credit => 
        credit.date >= exportFromDate && credit.date <= exportToDate
      ).length;
    }
  };

  const handleExportTransactions = async () => {
    if (!exportFromDate || !exportToDate) return;
    
    setExportLoading(true);
    setExportError(null);
    setExportSuccess(false);
    
    try {
      let filteredData;
      let exportData;
      let fileName;
      
      if (exportType === 'expenses') {
        // Filter expenses by date range
        filteredData = expenses.filter(expense => 
          expense.date >= exportFromDate && expense.date <= exportToDate
        );
        
        if (filteredData.length === 0) {
          setExportError('No expenses found for the selected date range.');
          return;
        }
        
        // Sort expenses by date (oldest first)
        filteredData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        // Prepare expense data for export
        exportData = filteredData.map(expense => ({
          Date: new Date(expense.date).toLocaleDateString('en-US', { 
            month: '2-digit', 
            day: '2-digit', 
            year: 'numeric' 
          }), // MM/DD/YYYY format for Excel
          Amount: expense.amount,
          Category: expense.category,
          Description: expense.description
        }));
        
        fileName = `expenses_${exportFromDate}_to_${exportToDate}.csv`;
      } else {
        // Filter credits by date range
        filteredData = credits.filter(credit => 
          credit.date >= exportFromDate && credit.date <= exportToDate
        );
        
        if (filteredData.length === 0) {
          setExportError('No credits found for the selected date range.');
          return;
        }
        
        // Sort credits by date (oldest first)
        filteredData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        // Prepare credit data for export (Date, Amount, Category, Description)
        exportData = filteredData.map(credit => ({
          Date: new Date(credit.date).toLocaleDateString('en-US', { 
            month: '2-digit', 
            day: '2-digit', 
            year: 'numeric' 
          }), // MM/DD/YYYY format for Excel
          Amount: credit.amount,
          Category: credit.category || 'Unassigned',
          Description: credit.description || ''
        }));
        
        fileName = `credits_${exportFromDate}_to_${exportToDate}.csv`;
      }
      
      // Create CSV content
      const headers = Object.keys(exportData[0]);
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(header => {
            const value = row[header as keyof typeof row];
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setExportSuccess(true);
      
      // Reset success message after 5 seconds
      setTimeout(() => setExportSuccess(false), 5000);
      
    } catch (error) {
      console.error('Export error:', error);
      setExportError('Failed to export transactions. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center">
        <div className="text-white text-xl">Loading analytics...</div>
      </div>
    );
  }

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
        {/* Header */}
        <header className="mb-4 sm:mb-6 md:mb-8 fade-in">
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4 md:mb-6">
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className="glass-button h-10 sm:h-11 touch-manipulation"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </div>
          
          <div className="flex flex-col gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div>
              <h1 className="text-2xl sm:text-2xl md:text-3xl lg:text-4xl font-heading font-bold gradient-text leading-tight">
                Expense Analytics
              </h1>
              <p className="text-muted-foreground text-base sm:text-base md:text-lg mt-1 sm:mt-2">
                Analyze your spending patterns and trends
              </p>
            </div>
            
            {/* Navigation Buttons */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => scrollToSection('category-breakdown-chart')}
                className="glass-button hover:bg-primary/10 hover:border-primary/30 transition-all duration-200 h-9 sm:h-10 touch-manipulation text-sm sm:text-sm"
              >
                <Target className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Category Breakdown</span>
                <span className="sm:hidden">Categories</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => scrollToSection('monthly-balances')}
                className="glass-button hover:bg-blue-500/10 hover:border-blue-500/30 transition-all duration-200 h-9 sm:h-10 touch-manipulation text-sm sm:text-sm"
              >
                <Wallet className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Monthly Balances</span>
                <span className="sm:hidden">Balances</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => scrollToSection('credit-income-analytics')}
                className="glass-button hover:bg-green-500/10 hover:border-green-500/30 transition-all duration-200 h-9 sm:h-10 touch-manipulation text-sm sm:text-sm"
              >
                <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Credit & Income</span>
                <span className="sm:hidden">Credits</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => scrollToSection('export-transactions')}
                className="glass-button hover:bg-purple-500/10 hover:border-purple-500/30 transition-all duration-200 h-9 sm:h-10 touch-manipulation text-sm sm:text-sm"
              >
                <Download className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Export Data</span>
                <span className="sm:hidden">Export</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Category Summary Section */}
        <div className="mt-6 sm:mt-8 md:mt-12 slide-up">
          <Card className="glass-card p-3 sm:p-4 md:p-6">
            <div className="flex items-center gap-2 mb-3 sm:mb-4 md:mb-6">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <h3 className="text-lg sm:text-lg md:text-xl font-heading font-semibold">Category Summary</h3>
            </div>

            {/* Month Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
              <Label htmlFor="category-summary-month" className="text-white text-base font-medium whitespace-nowrap">
                Select Month:
              </Label>
              <div className="flex items-center gap-2 sm:gap-3">
                <Input
                  id="category-summary-month"
                  type="month"
                  value={categorySummaryMonth}
                  onChange={(e) => setCategorySummaryMonth(e.target.value)}
                  className="bg-white/10 border-white/20 text-white w-40 sm:w-44 touch-manipulation"
                />
                {!isMobile && (
                  <Button
                    onClick={() => updateAllSummaries()}
                    disabled={categorySummariesLoading}
                    className="glass-button bg-gradient-primary hover:bg-gradient-primary/80 h-9 sm:h-10"
                    size="sm"
                  >
                    {categorySummariesLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span className="hidden sm:inline">Updating...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4" />
                        <span className="hidden sm:inline">Update Summary</span>
                      </div>
                    )}
                  </Button>
                )}
                <div className="text-sm sm:text-sm text-muted-foreground">
                  • {formatMonthYear(categorySummaryMonth)}
                </div>
              </div>
            </div>

            {/* Category Summary Table */}
            {categorySummariesLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading category summaries...</p>
              </div>
            ) : categorySummariesError ? (
              <div className="text-center py-8">
                <p className="text-red-400 mb-4">Error: {categorySummariesError}</p>
                <Button onClick={refetchCategorySummaries} className="glass-button">
                  Retry
                </Button>
              </div>
            ) : categorySummaries.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No category summary data found for {formatMonthYear(categorySummaryMonth)}</p>
                <p className="text-xs text-muted-foreground mt-2">Make sure you have categories and budgets set up</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-3 sm:mx-0">
                <div className="min-w-full px-3 sm:px-0">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/20">
                        <th className="text-left p-2 sm:p-3 text-sm sm:text-sm font-medium text-white sticky left-0 bg-white/5 min-w-[120px]">Category</th>
                        <th className="text-center p-2 sm:p-3 text-sm sm:text-sm font-medium text-white min-w-[100px] sm:min-w-[120px]">Budget</th>
                        <th className="text-center p-2 sm:p-3 text-sm sm:text-sm font-medium text-white min-w-[100px] sm:min-w-[120px]">Spent</th>
                        <th className="text-center p-2 sm:p-3 text-sm sm:text-sm font-medium text-white min-w-[100px] sm:min-w-[120px]">Remaining</th>
                        <th className="text-center p-2 sm:p-3 text-sm sm:text-sm font-medium text-white min-w-[120px] sm:min-w-[140px]">Accumulated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categorySummaries.map((summary, index) => (
                        <tr key={index} className="border-b border-white/10 hover:bg-white/5">
                          <td className="p-2 sm:p-3 text-sm sm:text-sm text-white font-medium sticky left-0 bg-white/5">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <span className="text-sm sm:text-lg">{getCategoryIcon(summary.category_name)}</span>
                              <span className="truncate">{summary.category_name}</span>
                            </div>
                          </td>
                          <td className="p-2 sm:p-3 text-sm sm:text-sm text-center text-blue-400 font-semibold">
                            ₹{formatCurrencyInIST(summary.total_budget || 0)}
                          </td>
                          <td className="p-2 sm:p-3 text-sm sm:text-sm text-center text-orange-400 font-semibold">
                            ₹{formatCurrencyInIST(summary.total_spent || 0)}
                          </td>
                          <td className={`p-2 sm:p-3 text-sm sm:text-sm text-center font-bold ${
                            (summary.remaining_balance || 0) < 0 ? 'text-red-400' : 
                            (summary.remaining_balance || 0) > 0 ? 'text-green-400' : 'text-white/60'
                          }`}>
                            ₹{formatCurrencyInIST(summary.remaining_balance || 0)}
                          </td>
                          <td className={`p-2 sm:p-3 text-sm sm:text-sm text-center font-bold ${
                            (() => {
                              // Get the accumulated total from Monthly Remaining Balances (same as Total column)
                              const categoryData = monthlyBalances.find(cat => cat.category_name === summary.category_name);
                              const accumulatedTotal = categoryData ? getAccumulatedTotalForCategory(categoryData) : 0;
                              return accumulatedTotal < 0 ? 'text-red-400' : 
                                     accumulatedTotal > 0 ? 'text-green-400' : 'text-white/60';
                            })()
                          }`}>
                            {(() => {
                              // Get the accumulated total from Monthly Remaining Balances (same as Total column)
                              const categoryData = monthlyBalances.find(cat => cat.category_name === summary.category_name);
                              const accumulatedTotal = categoryData ? getAccumulatedTotalForCategory(categoryData) : 0;
                              return `₹${formatCurrencyInIST(accumulatedTotal)}`;
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-white/20 bg-white/5">
                        <td className="p-2 sm:p-3 text-sm sm:text-sm font-bold text-white sticky left-0 bg-white/10">TOTAL</td>
                        <td className="p-2 sm:p-3 text-sm sm:text-sm text-center font-bold text-blue-400">
                          ₹{formatCurrencyInIST(getTotalBudget() || 0)}
                        </td>
                        <td className="p-2 sm:p-3 text-sm sm:text-sm text-center font-bold text-orange-400">
                          ₹{formatCurrencyInIST(getTotalSpent() || 0)}
                        </td>
                        <td className={`p-2 sm:p-3 text-sm sm:text-sm text-center font-bold ${
                          (getTotalRemaining() || 0) < 0 ? 'text-red-400' : 
                          (getTotalRemaining() || 0) > 0 ? 'text-green-400' : 'text-white/60'
                        }`}>
                          ₹{formatCurrencyInIST(getTotalRemaining() || 0)}
                        </td>
                        <td className={`p-2 sm:p-3 text-sm sm:text-sm text-center font-bold ${
                          (() => {
                            // Get the grand total from Monthly Remaining Balances (same as Total column)
                            const grandTotal = monthlyBalances.reduce((sum, categoryData) => 
                              sum + getAccumulatedTotalForCategory(categoryData), 0);
                            return grandTotal < 0 ? 'text-red-400' : 
                                   grandTotal > 0 ? 'text-green-400' : 'text-white/60';
                          })()
                        }`}>
                          {(() => {
                            // Get the grand total from Monthly Remaining Balances (same as Total column)
                            const grandTotal = monthlyBalances.reduce((sum, categoryData) => 
                              sum + getAccumulatedTotalForCategory(categoryData), 0);
                            return `₹${formatCurrencyInIST(grandTotal)}`;
                          })()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Summary Cards */}
            {categorySummaries.length > 0 && (
              <div className="mt-4 sm:mt-6 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                <div className="p-3 sm:p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-400" />
                    <span className="text-sm sm:text-sm font-medium text-white">Under Budget</span>
                  </div>
                  <div className="text-sm sm:text-lg font-bold text-green-400">
                    {getUnderBudgetCategoriesSummary().length} Categories
                  </div>
                </div>
                
                <div className="p-3 sm:p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                    <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-400" />
                    <span className="text-sm sm:text-sm font-medium text-white">Over Budget</span>
                  </div>
                  <div className="text-sm sm:text-lg font-bold text-red-400">
                    {getOverBudgetCategoriesSummary().length} Categories
                  </div>
                </div>

                <div className="p-3 sm:p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                    <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400" />
                    <span className="text-sm sm:text-sm font-medium text-white">Total Budget</span>
                  </div>
                  <div className="text-sm sm:text-lg font-bold text-blue-400">
                    ₹{formatCurrencyInIST(getTotalBudget() || 0)}
                  </div>
                </div>

                <div className="p-3 sm:p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                    <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-orange-400" />
                    <span className="text-sm sm:text-sm font-medium text-white">Total Spent</span>
                  </div>
                  <div className="text-sm sm:text-lg font-bold text-orange-400">
                    ₹{formatCurrencyInIST(getTotalSpent() || 0)}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Period Selector */}
        <div className="flex flex-wrap gap-2 sm:gap-4 mb-4 sm:mb-6 md:mb-8 slide-up">
          {(['daily', 'monthly', 'yearly'] as const).map((period) => (
            <Button
              key={period}
              variant={selectedPeriod === period ? 'default' : 'outline'}
              onClick={() => setSelectedPeriod(period)}
              className={`${selectedPeriod === period ? 'glass-button bg-gradient-primary' : 'glass-button'} h-9 sm:h-10 touch-manipulation text-sm sm:text-sm`}
              size="sm"
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </Button>
          ))}
        </div>

        {/* Compact Date/Month/Year Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8 slide-up">
          {selectedPeriod === 'daily' && (
            <div className="flex items-center gap-2">
              <Label htmlFor="date-select" className="text-white text-base font-medium whitespace-nowrap">
                Date:
              </Label>
              <Input
                id="date-select"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-white/10 border-white/20 text-white w-40 sm:w-44 touch-manipulation"
              />
            </div>
          )}
          
          {selectedPeriod === 'monthly' && (
            <div className="flex items-center gap-2">
              <Label htmlFor="month-select" className="text-white text-base font-medium whitespace-nowrap">
                Month:
              </Label>
              <Input
                id="month-select"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-white/10 border-white/20 text-white w-44 sm:w-48 touch-manipulation"
              />
            </div>
          )}
          
          {selectedPeriod === 'yearly' && (
            <div className="flex items-center gap-2">
              <Label htmlFor="year-select" className="text-white text-base font-medium whitespace-nowrap">
                Year:
              </Label>
              <Input
                id="year-select"
                type="number"
                min="2020"
                max="2030"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-white/10 border-white/20 text-white w-20 sm:w-24 touch-manipulation"
              />
            </div>
          )}
          
          <div className="text-sm sm:text-sm text-muted-foreground">
            {selectedPeriod === 'daily' && (
              <span>• {new Date(selectedDate).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
              })}</span>
            )}
            {selectedPeriod === 'monthly' && (
              <span>• {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { 
                month: 'long',
                year: 'numeric' 
              })}</span>
            )}
            {selectedPeriod === 'yearly' && (
              <span>• {selectedYear}</span>
            )}
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8 slide-up">
          <Card className="glass-card p-3 sm:p-4 md:p-6 hover-lift">
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
              <div className="p-2 sm:p-3 rounded-xl bg-gradient-primary">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm sm:text-sm text-muted-foreground">Total Spent</p>
                <p className="text-base sm:text-lg md:text-2xl font-bold truncate">₹{formatCurrencyInIST(currentData.total)}</p>
              </div>
            </div>
          </Card>

          <Card className="glass-card p-3 sm:p-4 md:p-6 hover-lift">
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
              <div className="p-2 sm:p-3 rounded-xl bg-gradient-secondary">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm sm:text-sm text-muted-foreground">Total Transactions</p>
                <p className="text-base sm:text-lg md:text-2xl font-bold">{currentData.count}</p>
              </div>
            </div>
          </Card>

          <Card className="glass-card p-3 sm:p-4 md:p-6 hover-lift">
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
              <div className="p-2 sm:p-3 rounded-xl bg-gradient-accent">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm sm:text-sm text-muted-foreground">Average per Transaction</p>
                <p className="text-base sm:text-lg md:text-2xl font-bold truncate">
                  ₹{formatCurrencyInIST(currentData.count > 0 ? Math.round(currentData.total / currentData.count) : 0)}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div id="category-breakdown-chart" className={`grid gap-4 sm:gap-6 md:gap-8 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
          {/* Category Breakdown (Pie) */}
          <Card className="glass-card p-3 sm:p-4 md:p-6 fade-in">
            <div className="flex items-center gap-2 mb-3 sm:mb-4 md:mb-6">
              <PieChart className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <h3 className="text-base sm:text-lg md:text-xl font-heading font-semibold">Category Breakdown Chart</h3>
            </div>
            
            {Object.keys(currentData.byCategory).length === 0 ? (
              <div className="text-center py-4 sm:py-6 md:py-8">
                <p className="text-muted-foreground text-xs sm:text-sm md:text-base">No expenses for this period</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <ChartContainer
                  config={{}}
                  className="w-full flex justify-center"
                >
                  <RePieChart 
                    width={isMobile ? 300 : 400} 
                    height={isMobile ? 300 : 400}
                  >
                    <Pie
                      data={categoryChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={isMobile ? 90 : 120}
                      innerRadius={isMobile ? 45 : 60}
                      paddingAngle={2}
                    >
                      {categoryChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-black/90 text-white p-2 sm:p-3 rounded-lg border border-white/20 shadow-lg max-w-[180px] sm:max-w-[200px]">
                              <p className="font-medium text-xs sm:text-sm">{payload[0].name}</p>
                              <p className="text-xs text-muted-foreground">
                                ₹{formatCurrencyInIST(Number(payload[0].value) || 0)}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </RePieChart>
                </ChartContainer>
                
                {/* Mobile-friendly legend */}
                {isMobile && (
                  <div className="mt-3 sm:mt-4 w-full">
                    <div className="grid grid-cols-1 gap-1 sm:gap-2 max-h-24 sm:max-h-32 overflow-y-auto">
                      {categoryChartData.map((item, index) => (
                        <div key={item.name} className="flex items-center gap-1 sm:gap-2 text-xs">
                          <div 
                            className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: chartColors[index % chartColors.length] }}
                          />
                          <span className="text-sm sm:text-sm mr-1">{getCategoryIcon(item.name)}</span>
                          <span className="font-medium truncate text-sm sm:text-sm">{item.name}</span>
                          <span className="text-muted-foreground ml-auto text-sm">
                            ₹{formatCurrencyInIST(item.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>


          {/* Time Breakdown (Bar) */}
          <Card className="glass-card p-3 sm:p-4 md:p-6 fade-in">
            <div className="flex items-center gap-2 mb-3 sm:mb-4 md:mb-6">
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <h3 className="text-lg sm:text-lg md:text-xl font-heading font-semibold">Daily Breakdown Chart</h3>
            </div>
            
            {timeChartData.length === 0 && currentData.expenses.length === 0 && selectedPeriod !== 'daily' && (
              <div className="text-center py-4 sm:py-6 md:py-8">
                <p className="text-muted-foreground text-sm sm:text-sm md:text-base">No expenses for this period</p>
              </div>
            )}

            {timeChartData.length > 0 && (
              <div className="flex flex-col items-center">
                <ChartContainer config={{}} className="w-full flex justify-center">
                  <ReBarChart 
                    width={isMobile ? 260 : 300} 
                    height={isMobile ? 260 : 300} 
                    data={timeChartData}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.3} />
                    <XAxis 
                      dataKey={selectedPeriod === 'monthly' ? 'day' : 'month'}
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={isMobile ? 9 : 12}
                      type="number"
                      domain={selectedPeriod === 'monthly' ? [1, 31] : [1, 12]}
                      tickCount={isMobile ? (selectedPeriod === 'monthly' ? 10 : 4) : (selectedPeriod === 'monthly' ? 31 : 12)}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={isMobile ? 9 : 12}
                      domain={[0, 'dataMax + 1000']}
                    />
                    <Bar 
                      dataKey="amount" 
                      fill="hsl(var(--primary))" 
                      radius={[3, 3, 0, 0]}
                      minPointSize={2}
                    />
                    {/* Add reference line at y=0 to make 0 bars more visible */}
                    <ReferenceLine y={0} stroke="hsl(var(--muted))" strokeDasharray="3 3" opacity={0.5} />
                    <ChartTooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-black/90 text-white p-2 sm:p-3 rounded-lg border border-white/20 shadow-lg max-w-[160px] sm:max-w-[200px]">
                              <p className="font-medium text-xs sm:text-sm">
                                {selectedPeriod === 'monthly' ? `Day ${label}` : `Month ${label}`}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                ₹{formatCurrencyInIST(Number(payload[0].value) || 0)}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </ReBarChart>
                </ChartContainer>
              </div>
            )}

            {timeChartData.length === 0 && selectedPeriod === 'daily' && currentData.expenses.length === 0 && (
              <div className="text-center py-4 sm:py-6 md:py-8">
                <p className="text-muted-foreground text-sm sm:text-sm md:text-base">No expenses for this date</p>
              </div>
            )}

            {timeChartData.length === 0 && selectedPeriod === 'daily' && currentData.expenses.length > 0 && (
              <div className="space-y-2 sm:space-y-3 md:space-y-4">
                {currentData.expenses.map((expense) => (
                  <div key={expense.id} className="p-2 sm:p-3 md:p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex justify-between items-center">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 sm:gap-2 mb-1">
                          <span className="text-sm sm:text-lg">{getCategoryIcon(expense.category)}</span>
                          <p className="font-medium text-xs sm:text-sm md:text-base truncate">{expense.description}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{expense.category}</p>
                      </div>
                      <p className="font-bold text-sm sm:text-base md:text-lg flex-shrink-0 ml-2">₹{formatCurrencyInIST(expense.amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Expense Category Breakdown - Full Width */}
        <div id="category-breakdown" className="mt-4 sm:mt-6 md:mt-8">
          <Card className="glass-card p-3 sm:p-4 md:p-6 fade-in">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 md:mb-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <h3 className="text-lg sm:text-lg md:text-xl font-heading font-semibold">Expense Category Breakdown</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCategoryBreakdownExpanded(!isCategoryBreakdownExpanded)}
                className="glass-button hover:bg-white/10 transition-all duration-200 h-8 sm:h-9 touch-manipulation w-full sm:w-auto justify-center"
              >
                {isCategoryBreakdownExpanded ? (
                  <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" />
                ) : (
                  <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
                )}
                <span className="ml-1 sm:ml-2 text-sm sm:text-sm">
                  {isCategoryBreakdownExpanded ? 'Collapse' : 'Expand'}
                </span>
              </Button>
            </div>
            
            {/* Collapsible Content */}
            {isCategoryBreakdownExpanded && (
              <>
                {Object.keys(currentData.byCategory).length === 0 ? (
              <div className="text-center py-4 sm:py-6 md:py-8">
                <DollarSign className="h-8 w-8 sm:h-12 sm:w-12 md:h-16 md:w-16 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                <p className="text-muted-foreground text-sm sm:text-sm md:text-base">No expenses for this period</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-3 md:space-y-4">
                {categoryChartData.map((item, index) => {
                  const percentage = (item.value / currentData.total) * 100;
                  const isTopCategory = index === 0;
                  const isHighSpending = percentage > 30;
                  const barColor = chartColors[index % chartColors.length];
                  
                  return (
                    <div 
                      key={item.name}
                      className={`group relative overflow-hidden rounded-lg sm:rounded-xl border transition-all duration-300 sm:hover:scale-[1.02] hover:shadow-lg ${
                        isTopCategory 
                          ? 'border-primary/50 bg-gradient-to-r from-primary/10 to-primary/5' 
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      {/* Background gradient effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      <div className="relative p-3 sm:p-4 md:p-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-2 sm:mb-3 md:mb-4">
                          <div className="flex items-center gap-2 sm:gap-2 md:gap-3 min-w-0 flex-1">
                            {/* Category icon with animated background */}
                            <div className={`relative flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 md:w-12 md:h-12 rounded-full flex-shrink-0 ${
                              isTopCategory 
                                ? 'bg-primary/20 border-2 border-primary/30' 
                                : 'bg-white/10 border border-white/20'
                            } transition-all duration-300 group-hover:scale-110`}>
                              <span className="text-sm sm:text-lg md:text-xl">{getCategoryIcon(item.name)}</span>
                              {isTopCategory && (
                                <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 bg-primary rounded-full flex items-center justify-center">
                                  <TrendingUp className="h-1 w-1 sm:h-1.5 sm:w-1.5 md:h-2.5 md:w-2.5 text-white" />
                                </div>
                              )}
                            </div>
                            
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm sm:text-base md:text-lg font-semibold text-white group-hover:text-primary transition-colors duration-300 truncate">
                                {item.name}
                              </h4>
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                {percentage.toFixed(1)}% of total expenses
                              </p>
                            </div>
                          </div>
                          
                          <div className="w-full sm:w-auto text-left sm:text-right flex-shrink-0 sm:ml-2">
                            <p className="text-lg sm:text-lg md:text-2xl font-bold text-white">
                              ₹{formatCurrencyInIST(item.value)}
                            </p>
                            {isHighSpending && (
                              <p className="text-xs sm:text-sm text-orange-400 font-medium mt-1">
                                High Spending Category
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* Animated progress bar */}
                        <div className="relative">
                          <div className="w-full h-1.5 sm:h-2 md:h-3 bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                              style={{ 
                                width: `${percentage}%`,
                                background: `linear-gradient(90deg, ${barColor}, color-mix(in srgb, ${barColor} 60%, transparent))`
                              }}
                            >
                              {/* Shimmer effect */}
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                            </div>
                          </div>
                          
                          {/* Percentage indicator on progress bar */}
                          <div 
                            className="absolute top-1.5 sm:top-3 md:top-4 text-[11px] sm:text-xs font-medium text-white/80 transition-all duration-300"
                            style={{ left: `${Math.min(percentage, 95)}%`, transform: 'translateX(-50%)' }}
                          >
                            {percentage.toFixed(1)}%
                          </div>
                        </div>
                        
                        {/* Additional insights for top categories */}
                        {isTopCategory && (
                          <div className="mt-2 sm:mt-3 md:mt-4 pt-2 sm:pt-3 md:pt-4 border-t border-white/10">
                            <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-primary/80">
                              <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:w-4" />
                              <span className="font-medium text-sm">Top spending category this period</span>
                            </div>
                          </div>
                        )}
                        
                        {/* Hover effect overlay */}
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      </div>
                    </div>
                  );
                })}
                
                {/* Summary footer */}
                <div className="mt-3 sm:mt-4 md:mt-6 pt-3 sm:pt-4 md:pt-6 border-t border-white/10">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                    <div className="text-center sm:text-center">
                      <p className="text-base sm:text-lg md:text-2xl font-bold text-white">₹{formatCurrencyInIST(currentData.total)}</p>
                      <p className="text-sm text-muted-foreground">Total Expenses</p>
                    </div>
                    <div className="text-center sm:text-center">
                      <p className="text-base sm:text-lg md:text-2xl font-bold text-primary">{categoryChartData.length}</p>
                      <p className="text-sm text-muted-foreground">Categories</p>
                    </div>
                    <div className="text-center sm:text-center">
                      <p className="text-base sm:text-lg md:text-2xl font-bold text-green-400">
                        ₹{formatCurrencyInIST(categoryChartData.length > 0 ? currentData.total / categoryChartData.length : 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">Avg per Category</p>
                    </div>
                  </div>
                </div>
              </div>
                )}
              </>
            )}
          </Card>
        </div>

        {/* Monthly Transactions List */}
        {selectedPeriod === 'monthly' && currentData.expenses.length > 0 && (
          <div className="mt-6 sm:mt-8 md:mt-12 slide-up">
            <Card className="glass-card p-3 sm:p-4 md:p-6">
              <div className="flex items-center gap-2 mb-3 sm:mb-4 md:mb-6">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <h3 className="text-lg sm:text-lg md:text-xl font-heading font-semibold">
                  All Transactions - {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { 
                    month: 'long',
                    year: 'numeric' 
                  })}
                </h3>
              </div>
              
              <div className="space-y-2 sm:space-y-3 md:space-y-4 max-h-80 sm:max-h-96 overflow-y-auto">
                {currentData.expenses
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((expense) => (
                    <div key={expense.id} className="p-2 sm:p-3 md:p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                      <div className="flex justify-between items-center">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 sm:gap-2 mb-1">
                            <span className="text-sm sm:text-lg">{getCategoryIcon(expense.category)}</span>
                            <p className="font-medium text-sm sm:text-sm md:text-base truncate">{expense.description}</p>
                            <span className="text-sm text-muted-foreground bg-white/10 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full flex-shrink-0">
                              {new Date(expense.date).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{expense.category}</p>
                        </div>
                        <p className="font-bold text-sm sm:text-base md:text-lg flex-shrink-0 ml-2">₹{formatCurrencyInIST(expense.amount)}</p>
                      </div>
                    </div>
                  ))}
              </div>
              
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/10">
                <p className="text-sm sm:text-sm text-muted-foreground text-center">
                  Showing {currentData.expenses.length} transactions for {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { 
                    month: 'long',
                    year: 'numeric' 
                  })}
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* Monthly Remaining Balances Section */}
        <div id="monthly-balances" className="mt-6 sm:mt-8 md:mt-12 slide-up">
          <Card className="glass-card p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-6">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <h3 className="text-lg sm:text-lg md:text-xl font-heading font-semibold">Monthly Remaining Balances</h3>
              </div>
              
            </div>

            {/* Year Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
              <Label htmlFor="monthly-balances-year" className="text-base font-medium text-foreground whitespace-nowrap">
                Select Year:
              </Label>
              <div className="flex items-center gap-2 sm:gap-3">
                <Input
                  id="monthly-balances-year"
                  type="number"
                  min="2020"
                  max="2030"
                  value={monthlyBalancesYear}
                  onChange={(e) => setMonthlyBalancesYear(parseInt(e.target.value))}
                  className="w-20 sm:w-24 touch-manipulation bg-[color:var(--input-bg)] border-[color:var(--input-border)] text-foreground focus:border-[color:var(--input-border-focus)] focus:ring-1 focus:ring-[color:var(--input-border-focus)]"
                />
                {!isMobile && (
                  <Button
                    onClick={() => updateAllBalances()}
                    disabled={monthlyBalancesLoading}
                    className="glass-button bg-gradient-primary hover:bg-gradient-primary/80 h-9 sm:h-10"
                    size="sm"
                  >
                    {monthlyBalancesLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span className="hidden sm:inline">Updating...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4" />
                        <span className="hidden sm:inline">Update Balances</span>
                      </div>
                    )}
                  </Button>
                )}
                <div className="text-sm sm:text-sm text-muted-foreground">
                  • {monthlyBalancesYear}
                </div>
              </div>
            </div>

            {/* Month Selection Filter */}
            <div className="mb-4 p-3 rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-overlay)]">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium text-foreground">Select Months:</Label>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllMonths}
                    className="text-xs px-2 py-1 h-6 bg-[color:var(--surface-muted)] border-[color:var(--border-soft)] text-foreground hover:bg-[color:var(--surface-muted-hover)]"
                  >
                    All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectCurrentMonths}
                    className="text-xs px-2 py-1 h-6 bg-[color:var(--surface-muted)] border-[color:var(--border-soft)] text-foreground hover:bg-[color:var(--surface-muted-hover)]"
                  >
                    Current
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearMonthSelection}
                    className="text-xs px-2 py-1 h-6 bg-[color:var(--surface-muted)] border-[color:var(--border-soft)] text-foreground hover:bg-[color:var(--surface-muted-hover)]"
                  >
                    Clear
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-6 sm:grid-cols-12 gap-1 sm:gap-2">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                  const currentYear = new Date().getFullYear();
                  const hasSalary = salaryMonths.some(sm => sm.year === currentYear && sm.month === month);
                  const isCurrentMonth = month === new Date().getMonth() + 1;
                  
                  return (
                    <button
                      key={month}
                      onClick={() => toggleMonth(month)}
                      className={`p-2 text-xs rounded border transition-all relative ${
                        isMonthSelected(month)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-[color:var(--surface-muted)] text-foreground border-[color:var(--border-soft)] hover:bg-[color:var(--surface-muted-hover)]'
                      } ${hasSalary ? 'ring-1 ring-green-400' : ''}`}
                      title={`${getMonthName(month)}${hasSalary ? ' (Salary Added)' : ''}${isCurrentMonth ? ' (Current Month)' : ''}`}
                    >
                      {getMonthName(month).slice(0, 3)}
                      {hasSalary && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full"></div>
                      )}
                    </button>
                  );
                })}
              </div>
              
              {selectedMonths.length > 0 && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Selected: {selectedMonths.map(m => getMonthName(m).slice(0, 3)).join(', ')}
                </div>
              )}
              
              {/* Legend for month indicators */}
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Salary Added</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span>Current Month</span>
                </div>
              </div>
            </div>

            {/* Monthly Balances Table */}
            {monthlyBalancesLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading monthly remaining balances...</p>
              </div>
            ) : monthlyBalancesError ? (
              <div className="text-center py-8">
                <p className="text-red-400 mb-4">Error: {monthlyBalancesError}</p>
                <Button onClick={refetchMonthlyBalances} className="glass-button">
                  Retry
                </Button>
              </div>
            ) : monthlyBalances.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No remaining balance data found for {monthlyBalancesYear}</p>
                <p className="text-xs text-muted-foreground mt-2">Make sure you have categories and budgets set up</p>
              </div>
            ) : (
              <div className="relative">
                <div className="overflow-x-auto -mx-3 sm:mx-0">
                  <div className="min-w-full px-3 sm:px-0" style={{ 
                    minWidth: selectedMonths.length > 0 
                      ? `${(isMobile ? 80 : 120) + (selectedMonths.length * (isMobile ? 65 : 90)) + (isMobile ? 70 : 90)}px`
                      : isMobile ? '250px' : '300px'
                  }}>
                    <table className="w-full" style={{ 
                      minWidth: selectedMonths.length > 0 
                        ? `${(isMobile ? 80 : 120) + (selectedMonths.length * (isMobile ? 65 : 90)) + (isMobile ? 70 : 90)}px`
                        : isMobile ? '250px' : '300px'
                    }}>
                    <thead>
                      <tr className="border-b border-[color:var(--border-soft)]">
                        <th
                          className={`text-left font-medium text-foreground sticky left-0 border-r border-[color:var(--border-soft)] ${
                          isMobile ? 'p-2 text-xs min-w-[80px]' : 'p-2 sm:p-3 text-sm min-w-[120px]'
                        }`}
                          style={{ backgroundColor: 'var(--surface-raised)' }}
                        >Category</th>
                        {selectedMonths.length > 0 ? selectedMonths.map(month => (
                          <th key={month} className={`text-center font-medium text-foreground ${
                            isMobile ? 'p-1 text-xs min-w-[65px]' : 'p-2 sm:p-3 text-sm min-w-[80px] sm:min-w-[90px]'
                          }`}>
                            {getMonthName(month).slice(0, isMobile ? 1 : 3)}
                          </th>
                        )) : (
                          <th className={`text-center font-medium text-foreground ${
                            isMobile ? 'p-1 text-xs min-w-[65px]' : 'p-2 sm:p-3 text-sm min-w-[80px] sm:min-w-[90px]'
                          }`}>
                            No months selected
                          </th>
                        )}
                        <th
                          className={`text-center font-medium text-foreground sticky right-0 ${
                          isMobile ? 'p-1 text-xs min-w-[70px]' : 'p-2 sm:p-3 text-sm min-w-[80px] sm:min-w-[90px]'
                        }`}
                          style={{ backgroundColor: 'var(--surface-muted)' }}
                        >Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyBalances.map((categoryData, index) => {
                        // Calculate accumulated total from January 2025 to current month of current year
                        const categoryTotal = getAccumulatedTotalForCategory(categoryData);
                        
                        return (
                          <tr key={index} className="border-b border-[color:var(--border-soft)] hover:bg-[color:var(--surface-muted-hover)]">
                            <td
                              className={`font-medium sticky left-0 border-r border-[color:var(--border-soft)] text-foreground ${
                              isMobile ? 'p-2 text-xs' : 'p-2 sm:p-3 text-sm'
                            }`}
                              style={{ backgroundColor: 'var(--surface-raised)' }}
                            >
                              <div className={`flex items-center ${
                                isMobile ? 'gap-1' : 'gap-1 sm:gap-2'
                              }`}>
                                <span className={isMobile ? 'text-xs' : 'text-sm sm:text-lg'}>{getCategoryIcon(categoryData.category_name)}</span>
                                <span className={`truncate font-semibold text-foreground drop-shadow-sm ${
                                  isMobile ? 'text-xs' : 'text-sm'
                                }`}>{categoryData.category_name}</span>
                              </div>
                            </td>
                            {selectedMonths.length > 0 ? selectedMonths.map(month => {
                              const balance = getRemainingBalanceForMonth(categoryData, month);
                              const isCurrentMonth = month === new Date().getMonth() + 1 && monthlyBalancesYear === new Date().getFullYear();
                              const isFutureMonth = month > new Date().getMonth() + 1 && monthlyBalancesYear === new Date().getFullYear();
                              const isPastYear = monthlyBalancesYear < new Date().getFullYear();
                              const isFutureYear = monthlyBalancesYear > new Date().getFullYear();
                              const currentYear = new Date().getFullYear();
                              const hasSalary = salaryMonths.some(sm => sm.year === currentYear && sm.month === month);
                              
                              // Show data if it's not a future month OR if it has salary
                              const shouldShowData = !(isFutureMonth && !isPastYear && !isFutureYear) || hasSalary;
                              
                              return (
                                <td 
                                  key={month} 
                                  className={`text-center font-semibold ${
                                    !shouldShowData ? 'text-muted-foreground' :
                                    balance < 0 ? 'text-red-400' : balance > 0 ? 'text-green-500' : 'text-muted-foreground'
                                  } ${isCurrentMonth ? 'ring-1 ring-primary/50 bg-primary/10' : ''} ${
                                    hasSalary ? 'ring-1 ring-green-400/40 bg-green-400/10' : ''
                                  } ${
                                    isMobile ? 'p-1 text-xs' : 'p-2 sm:p-3 text-sm'
                                  }`}
                                  title={`${getMonthName(month)} ${monthlyBalancesYear}${hasSalary ? ' (Salary Added)' : ''}`}
                                >
                                  {!shouldShowData ? '-' : (
                                    isMobile ? 
                                      `₹${Math.round(balance).toLocaleString()}` :
                                      `₹${formatCurrencyInIST(balance)}`
                                  )}
                                </td>
                              );
                            }) : (
                              <td className={`text-center font-semibold text-muted-foreground ${
                                isMobile ? 'p-1 text-xs' : 'p-2 sm:p-3 text-sm'
                              }`}>
                                Select months to view data
                              </td>
                            )}
                            <td
                              className={`text-center font-bold sticky right-0 ${
                              categoryTotal < 0 ? 'text-red-400' : categoryTotal > 0 ? 'text-green-500' : 'text-muted-foreground'
                            } ${isMobile ? 'p-1 text-xs min-w-[70px]' : 'p-2 sm:p-3 text-sm'}`}
                              style={{ backgroundColor: 'var(--surface-muted)' }}
                            >
                              {isMobile ? 
                                `₹${Math.round(categoryTotal).toLocaleString()}` :
                                `₹${formatCurrencyInIST(categoryTotal)}`
                              }
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-[color:var(--border-soft)] bg-[color:var(--surface-overlay)]">
                        <td
                          className={`font-bold sticky left-0 border-r border-[color:var(--border-soft)] text-foreground ${
                          isMobile ? 'p-2 text-xs' : 'p-2 sm:p-3 text-sm'
                        }`}
                          style={{ backgroundColor: 'var(--surface-raised)' }}
                        >TOTAL</td>
                        {selectedMonths.length > 0 ? selectedMonths.map(month => {
                          const total = getTotalRemainingForMonth(month);
                          const isCurrentMonth = month === new Date().getMonth() + 1 && monthlyBalancesYear === new Date().getFullYear();
                          const isFutureMonth = month > new Date().getMonth() + 1 && monthlyBalancesYear === new Date().getFullYear();
                          const isPastYear = monthlyBalancesYear < new Date().getFullYear();
                          const isFutureYear = monthlyBalancesYear > new Date().getFullYear();
                          const currentYear = new Date().getFullYear();
                          const hasSalary = salaryMonths.some(sm => sm.year === currentYear && sm.month === month);
                          
                          // Show data if it's not a future month OR if it has salary
                          const shouldShowData = !(isFutureMonth && !isPastYear && !isFutureYear) || hasSalary;
                          
                          return (
                            <td 
                              key={month} 
                              className={`text-center font-bold ${
                                !shouldShowData ? 'text-muted-foreground' :
                                total < 0 ? 'text-red-400' : total > 0 ? 'text-green-500' : 'text-muted-foreground'
                              } ${isCurrentMonth ? 'ring-1 ring-primary/50 bg-primary/10' : ''} ${
                                hasSalary ? 'ring-1 ring-green-400/40 bg-green-400/10' : ''
                              } ${
                                isMobile ? 'p-1 text-xs' : 'p-2 sm:p-3 text-sm'
                              }`}
                              title={`Total for ${getMonthName(month)} ${monthlyBalancesYear}${hasSalary ? ' (Salary Added)' : ''}`}
                            >
                              {!shouldShowData ? '-' : (
                                isMobile ? 
                                  `₹${Math.round(total).toLocaleString()}` :
                                  `₹${formatCurrencyInIST(total)}`
                              )}
                            </td>
                          );
                        }) : (
                          <td className={`text-center font-bold text-muted-foreground ${
                            isMobile ? 'p-1 text-xs' : 'p-2 sm:p-3 text-sm'
                          }`}>
                            -
                          </td>
                        )}
                          <td
                            className={`text-center font-bold sticky right-0 ${
                          (() => {
                            const grandTotal = monthlyBalances.reduce((sum, categoryData) => 
                              sum + getAccumulatedTotalForCategory(categoryData), 0);
                            return grandTotal < 0 ? 'text-red-400' : grandTotal > 0 ? 'text-green-500' : 'text-muted-foreground';
                          })()
                        } ${isMobile ? 'p-1 text-xs min-w-[70px]' : 'p-2 sm:p-3 text-xs sm:text-sm'}`}
                            style={{ backgroundColor: 'var(--surface-muted)' }}
                          >
                          {(() => {
                            const grandTotal = monthlyBalances.reduce((sum, categoryData) => 
                              sum + getAccumulatedTotalForCategory(categoryData), 0);
                            return isMobile ? 
                              `₹${Math.round(grandTotal).toLocaleString()}` :
                              `₹${formatCurrencyInIST(grandTotal)}`;
                          })()}
                        </td>
                      </tr>
                    </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            )}


            {/* Summary Cards */}
            {monthlyBalances.length > 0 && (
              <div className="mt-4 sm:mt-6 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                <div className="p-3 sm:p-4 rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-overlay)]">
                  <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-400" />
                    <span className="text-sm sm:text-sm font-medium text-foreground">Best Month</span>
                  </div>
                  <div className="text-sm sm:text-lg font-bold text-green-400">
                    {(() => {
                      const currentMonth = new Date().getMonth() + 1;
                      const monthTotals = Array.from({ length: currentMonth }, (_, i) => ({
                        month: i + 1,
                        total: getTotalRemainingForMonth(i + 1)
                      }));
                      const bestMonth = monthTotals.reduce((max, current) => 
                        current.total > max.total ? current : max
                      );
                      return `${getMonthName(bestMonth.month)} (₹${formatCurrencyInIST(bestMonth.total)})`;
                    })()}
                  </div>
                </div>
                
                <div className="p-3 sm:p-4 rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-overlay)]">
                  <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                    <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-400" />
                    <span className="text-sm sm:text-sm font-medium text-foreground">Worst Month</span>
                  </div>
                  <div className="text-sm sm:text-lg font-bold text-red-400">
                    {(() => {
                      const currentMonth = new Date().getMonth() + 1;
                      const monthTotals = Array.from({ length: currentMonth }, (_, i) => ({
                        month: i + 1,
                        total: getTotalRemainingForMonth(i + 1)
                      }));
                      const worstMonth = monthTotals.reduce((min, current) => 
                        current.total < min.total ? current : min
                      );
                      return `${getMonthName(worstMonth.month)} (₹${formatCurrencyInIST(worstMonth.total)})`;
                    })()}
                  </div>
                </div>

                <div className="p-3 sm:p-4 rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-overlay)]">
                  <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400" />
                    <span className="text-sm sm:text-sm font-medium text-foreground">Current Month</span>
                  </div>
                  <div className="text-sm sm:text-lg font-bold text-blue-400">
                    {(() => {
                      const currentMonth = new Date().getMonth() + 1;
                      const currentTotal = getTotalRemainingForMonth(currentMonth);
                      return `₹${formatCurrencyInIST(currentTotal)}`;
                    })()}
                  </div>
                </div>

                <div className="p-3 sm:p-4 rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-overlay)]">
                  <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                    <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400" />
                    <span className="text-sm sm:text-sm font-medium text-foreground">Over Budget</span>
                  </div>
                  <div className="text-sm sm:text-lg font-bold text-yellow-400">
                    {(() => {
                      const currentMonth = new Date().getMonth() + 1;
                      const overBudgetCount = getOverBudgetCategories(currentMonth).length;
                      return `${overBudgetCount} Categories`;
                    })()}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Monthly Remaining Balances Chart Section */}
        <div id="monthly-balances-chart" className="mt-6 sm:mt-8 md:mt-12 slide-up">
          <MonthlyRemainingBalancesChart 
            data={monthlyBalances}
            year={monthlyBalancesYear}
            loading={monthlyBalancesLoading}
          />
        </div>

        {/* Credit & Income Analytics Section */}
        <div id="credit-income-analytics" className="mt-8 sm:mt-12 slide-up">
          <CreditIncomeAnalyticsSection userId={user?.id} />
        </div>

        {/* Export Transactions Section */}
        <div id="export-transactions" className="mt-6 sm:mt-8 md:mt-12 slide-up">
          <Card className="glass-card p-3 sm:p-4 md:p-6">
            <div className="flex items-center gap-2 mb-3 sm:mb-4 md:mb-6">
              <svg className="h-4 w-4 sm:h-5 sm:w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg sm:text-lg md:text-xl font-heading font-semibold">Export Transactions</h3>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="from-date" className="text-white text-base font-medium">
                    From Date
                  </Label>
                  <Input
                    id="from-date"
                    type="date"
                    value={exportFromDate}
                    onChange={(e) => setExportFromDate(e.target.value)}
                    className="bg-white/10 border-white/20 text-white mt-1 sm:mt-2 touch-manipulation"
                  />
                </div>
                <div>
                  <Label htmlFor="to-date" className="text-white text-base font-medium">
                    To Date
                  </Label>
                  <Input
                    id="to-date"
                    type="date"
                    value={exportToDate}
                    onChange={(e) => setExportToDate(e.target.value)}
                    className="bg-white/10 border-white/20 text-white mt-1 sm:mt-2 touch-manipulation"
                  />
                </div>
                <div>
                  <Label htmlFor="export-type" className="text-white text-base font-medium">
                    Export Type
                  </Label>
                  <Select value={exportType} onValueChange={(value: 'expenses' | 'credits') => setExportType(value)}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white mt-1 sm:mt-2 touch-manipulation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/20">
                      <SelectItem value="expenses" className="text-white hover:bg-white/10">Expenses</SelectItem>
                      <SelectItem value="credits" className="text-white hover:bg-white/10">Credits</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <Button 
                  onClick={handleExportTransactions}
                  disabled={!exportFromDate || !exportToDate || exportLoading}
                  className="glass-button bg-gradient-primary hover:bg-gradient-primary/80 h-9 sm:h-10 touch-manipulation"
                  size="sm"
                >
                  {exportLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span className="hidden sm:inline">Exporting...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm sm:text-sm">Export {exportType === 'expenses' ? 'Expenses' : 'Credits'} to CSV</span>
                    </div>
                  )}
                </Button>
                
                {exportFromDate && exportToDate && (
                  <div className="text-sm sm:text-sm text-muted-foreground">
                    {getFilteredTransactionsCount()} {exportType === 'expenses' ? 'expenses' : 'credits'} found
                  </div>
                )}
              </div>
              
              {exportError && (
                <div className="p-2 sm:p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm sm:text-sm">
                  {exportError}
                </div>
              )}
              
              {exportSuccess && (
                <div className="p-2 sm:p-3 rounded-lg bg-green-500/20 border border-green-500/30 text-green-200 text-sm sm:text-sm">
                  Export completed successfully! Check your downloads folder.
                </div>
              )}
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default Analytics;