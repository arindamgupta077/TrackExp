import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSalaryMonthsTracking } from '@/hooks/useSalaryMonthsTracking';

export interface MonthlyRemainingBalance {
  category_name: string;
  january: number;
  february: number;
  march: number;
  april: number;
  may: number;
  june: number;
  july: number;
  august: number;
  september: number;
  october: number;
  november: number;
  december: number;
}

export const useMonthlyRemainingBalances = (userId: string | undefined, year: number) => {
  const [data, setData] = useState<MonthlyRemainingBalance[]>([]);
  const [historicalData, setHistoricalData] = useState<Record<number, MonthlyRemainingBalance[]>>({});
  const [currentYearData, setCurrentYearData] = useState<MonthlyRemainingBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { getSalaryMonthsSet } = useSalaryMonthsTracking(userId);

  const fetchHistoricalData = async (targetYear: number) => {
    try {
      const { data: result, error: fetchError } = await supabase
        .rpc('get_user_monthly_remaining_balances', {
          target_user_id: userId,
          target_year: targetYear
        });

      if (fetchError) {
        throw fetchError;
      }

      // Filter out the special category used for tracking preferences and the Salary category
      const filteredData = (result || []).filter(item => 
        item.category_name !== '__SKIP_DEFAULT_CATEGORIES__' && 
        item.category_name !== 'Salary'
      );
      
      return filteredData;
    } catch (err) {
      console.error(`Error fetching historical data for year ${targetYear}:`, err);
      return [];
    }
  };

  const fetchMonthlyRemainingBalances = async () => {
    if (!userId || !year) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Always fetch current year data for total calculation
      const currentYear = new Date().getFullYear();
      const currentYearData = await fetchHistoricalData(currentYear);
      setCurrentYearData(currentYearData);

      // Fetch selected year data for display
      const selectedYearData = await fetchHistoricalData(year);
      setData(selectedYearData);

      // Fetch historical data from 2025 to current year - 1 (for total calculation)
      const historicalPromises = [];
      for (let historicalYear = 2025; historicalYear < currentYear; historicalYear++) {
        historicalPromises.push(
          fetchHistoricalData(historicalYear).then(data => ({ year: historicalYear, data }))
        );
      }
      
      if (historicalPromises.length > 0) {
        const historicalResults = await Promise.all(historicalPromises);
        const historicalMap: Record<number, MonthlyRemainingBalance[]> = {};
        
        historicalResults.forEach(({ year: historicalYear, data }) => {
          historicalMap[historicalYear] = data;
        });
        
        setHistoricalData(historicalMap);
      } else {
        setHistoricalData({});
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch monthly remaining balances';
      console.error('Error fetching monthly remaining balances:', err);
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAllBalances = async () => {
    if (!userId || !year) return;

    try {
      const { error: updateError } = await supabase
        .rpc('update_all_monthly_remaining_balances', {
          target_user_id: userId,
          target_year: year
        });

      if (updateError) {
        throw updateError;
      }

      // Refresh data after update
      await fetchMonthlyRemainingBalances();
      
      // Only show success toast on non-mobile devices
      if (!isMobile) {
        toast({
          title: 'Success',
          description: 'Monthly remaining balances updated successfully',
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update monthly remaining balances';
      console.error('Error updating monthly remaining balances:', err);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const getRemainingBalanceForMonth = (categoryData: MonthlyRemainingBalance, monthNumber: number): number => {
    switch (monthNumber) {
      case 1: return categoryData.january;
      case 2: return categoryData.february;
      case 3: return categoryData.march;
      case 4: return categoryData.april;
      case 5: return categoryData.may;
      case 6: return categoryData.june;
      case 7: return categoryData.july;
      case 8: return categoryData.august;
      case 9: return categoryData.september;
      case 10: return categoryData.october;
      case 11: return categoryData.november;
      case 12: return categoryData.december;
      default: return 0;
    }
  };

  const getTotalRemainingForMonth = (monthNumber: number): number => {
    return data.reduce((total, categoryData) => {
      return total + getRemainingBalanceForMonth(categoryData, monthNumber);
    }, 0);
  };

  const getOverBudgetCategories = (monthNumber: number): MonthlyRemainingBalance[] => {
    return data.filter(categoryData => 
      getRemainingBalanceForMonth(categoryData, monthNumber) < 0
    );
  };

  const getAccumulatedTotalForCategory = (categoryData: MonthlyRemainingBalance): number => {
    // Calculate accumulated total from January 2025 to current month of CURRENT YEAR
    // PLUS any months where salary has been added (even if they're in the future)
    // This total should NEVER change regardless of the selected year filter
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    let total = 0;
    
    // Get salary months set for quick lookup
    const salaryMonthsSet = getSalaryMonthsSet();
    
    // Add all months from historical years (2025 to currentYear - 1)
    for (let historicalYear = 2025; historicalYear < currentYear; historicalYear++) {
      const historicalYearData = historicalData[historicalYear];
      if (historicalYearData) {
        // Find the corresponding category in historical data
        const historicalCategoryData = historicalYearData.find(
          cat => cat.category_name === categoryData.category_name
        );
        if (historicalCategoryData) {
          // Add all 12 months for this historical year
          for (let month = 1; month <= 12; month++) {
            total += getRemainingBalanceForMonth(historicalCategoryData, month);
          }
        }
      }
    }
    
    // Add months from January to current month of CURRENT YEAR
    // Always use currentYearData state for current year calculation
    const currentYearCategoryData = currentYearData.find(
      cat => cat.category_name === categoryData.category_name
    );
    if (currentYearCategoryData) {
      for (let month = 1; month <= currentMonth; month++) {
        total += getRemainingBalanceForMonth(currentYearCategoryData, month);
      }
    }
    
    // NEW LOGIC: Add months where salary has been added (even if they're in the future)
    // This ensures that when salary is added for a future month, that month is included in the total
    for (let year = 2025; year <= currentYear; year++) {
      const yearData = year === currentYear ? currentYearData : historicalData[year];
      if (yearData) {
        const yearCategoryData = yearData.find(
          cat => cat.category_name === categoryData.category_name
        );
        if (yearCategoryData) {
          // Check each month to see if salary was added for it
          for (let month = 1; month <= 12; month++) {
            const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
            
            // If salary was added for this month, include it in the total
            // But only if it's not already included (avoid double counting)
            if (salaryMonthsSet.has(monthKey)) {
              // For current year, only include if it's beyond current month
              // For historical years, this is already included above, so skip
              if (year === currentYear && month > currentMonth) {
                total += getRemainingBalanceForMonth(yearCategoryData, month);
              } else if (year > currentYear) {
                // For future years, include the month if salary was added
                total += getRemainingBalanceForMonth(yearCategoryData, month);
              }
            }
          }
        }
      }
    }
    
    return total;
  };

  const getMonthName = (monthNumber: number): string => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthNumber - 1] || '';
  };

  useEffect(() => {
    fetchMonthlyRemainingBalances();
  }, [userId, year]);

  return {
    data,
    loading,
    error,
    refetch: fetchMonthlyRemainingBalances,
    updateAllBalances,
    getRemainingBalanceForMonth,
    getTotalRemainingForMonth,
    getOverBudgetCategories,
    getAccumulatedTotalForCategory,
    getMonthName
  };
};
