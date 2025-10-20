import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, ArrowRight, CreditCard, Split, Plus, Edit, Trash2, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { Credit, useCredits } from '@/hooks/useCredits';
import { useMonthlyUnassignedCredits } from '@/hooks/useMonthlyUnassignedCredits';
import AssignCreditModal from './AssignCreditModal';
import SplitCreditModal from './SplitCreditModal';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

interface ReassignCreditsModalProps {
  onClose: () => void;
  onBudgetRefresh?: (forceRefresh?: boolean) => void;
  onAddCredit: (credit: { category?: string; amount: number; description?: string; date: string }) => void;
}


const ReassignCreditsModal = ({ onClose, onBudgetRefresh, onAddCredit }: ReassignCreditsModalProps) => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [splittingCredit, setSplittingCredit] = useState<Credit | null>(null);
  const [activeTab, setActiveTab] = useState<'reassign' | 'monthly'>('reassign');
  
  // Monthly unassigned credits state
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [editingMonthlyCredit, setEditingMonthlyCredit] = useState<{year: number, month: number} | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Filter state
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  
  // Track if we should show loading to prevent flash
  const [showLoading, setShowLoading] = useState(true);
  
  // Assign credit to category state
  const [assignToCategory, setAssignToCategory] = useState('');
  const [assigningCredit, setAssigningCredit] = useState<{year: number, month: number, amount: number} | null>(null);
  const [assignToYear, setAssignToYear] = useState(new Date().getFullYear());
  const [assignToMonth, setAssignToMonth] = useState(new Date().getMonth() + 1);
  
  // Split assignment state
  const [splitAssigningCredit, setSplitAssigningCredit] = useState<{year: number, month: number, amount: number} | null>(null);
  const [splitAssignments, setSplitAssignments] = useState<Array<{category: string, amount: string}>>([]);
  const [splitTargetYear, setSplitTargetYear] = useState(new Date().getFullYear());
  const [splitTargetMonth, setSplitTargetMonth] = useState(new Date().getMonth() + 1);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const { categories, loading: categoriesLoading } = useCategories(user?.id);
  const { credits, updateCredit, fetchCredits } = useCredits(user?.id);
  const { 
    monthlyCredits, 
    loading: monthlyCreditsLoading, 
    addOrUpdateMonthlyCredit, 
    deleteMonthlyCredit, 
    getUnassignedCreditsForMonth 
  } = useMonthlyUnassignedCredits(user?.id);
  const { isDarkMode } = useTheme();

  const selectTriggerBase = isDarkMode
    ? 'bg-white/10 border-white/20 text-white'
    : 'bg-white border-slate-200 text-slate-700';
  const selectContentBase = isDarkMode
    ? 'bg-slate-900 border-white/20 text-white'
    : 'bg-white border-slate-200 text-slate-700 shadow-xl';
  const selectItemBase = isDarkMode
    ? 'text-white hover:bg-white/10'
    : 'text-slate-700 hover:bg-slate-100';

  // Manage loading state to prevent flash
  useEffect(() => {
    if (!monthlyCreditsLoading) {
      // Add a small delay to ensure smooth transition
      const timer = setTimeout(() => {
        setShowLoading(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [monthlyCreditsLoading]);

  // Filter monthly credits based on selected filters
  const filteredMonthlyCredits = monthlyCredits.filter(credit => {
    const yearMatch = filterYear === 'all' || credit.year.toString() === filterYear;
    const monthMatch = filterMonth === 'all' || credit.month.toString() === filterMonth;
    return yearMatch && monthMatch;
  });

  // Get all unassigned credits from the monthly table
  // const unassignedCredits = credits.filter(credit => !credit.category); // Removed - using monthly table instead

  // Generate year options (current year ± 2 years)
  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 2; i <= currentYear + 2; i++) {
      years.push(i);
    }
    return years;
  };

  // Generate month options
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

  // Create current date string in YYYY-MM-DD format for credit records
  const getCurrentDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Handle adding/updating monthly unassigned credit
  const handleSaveMonthlyCredit = async () => {
    if (!monthlyAmount || parseFloat(monthlyAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid positive amount.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let result;

      if (editingMonthlyCredit) {
        // For editing: delete existing and create new with exact amount
        const deleteResult = await deleteMonthlyCredit(editingMonthlyCredit.year, editingMonthlyCredit.month);
        if (deleteResult.error) {
          throw deleteResult.error;
        }

        // Create new record with the exact amount (not adding to existing)
        result = await addOrUpdateMonthlyCredit(
          selectedYear, 
          selectedMonth, 
          parseFloat(monthlyAmount)
        );

        if (result.error) {
          throw result.error;
        }

        toast({
          title: "Success",
          description: `Monthly unassigned credit for ${generateMonthOptions()[selectedMonth - 1].label} ${selectedYear} has been updated to ₹${parseFloat(monthlyAmount).toLocaleString()}.`,
        });
      } else {
        // For adding new: use the normal addOrUpdateMonthlyCredit function
        result = await addOrUpdateMonthlyCredit(
          selectedYear, 
          selectedMonth, 
          parseFloat(monthlyAmount)
        );

        if (result.error) {
          throw result.error;
        }

        toast({
          title: "Success",
          description: `₹${parseFloat(monthlyAmount).toLocaleString()} has been added to unassigned credits for ${generateMonthOptions()[selectedMonth - 1].label} ${selectedYear}.`,
        });
      }

      setMonthlyAmount('');
      setEditingMonthlyCredit(null);
      setShowAddForm(false);
      
      // Trigger budget refresh
      if (onBudgetRefresh) {
        onBudgetRefresh(true); // Force refresh to update unassigned credits
      }
    } catch (error) {
      console.error('Error saving monthly credit:', error);
      toast({
        title: "Error",
        description: "Failed to save monthly unassigned credit. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle deleting monthly unassigned credit
  const handleDeleteMonthlyCredit = async (year: number, month: number) => {
    setLoading(true);
    try {
      const result = await deleteMonthlyCredit(year, month);

      if (result.error) {
        throw result.error;
      }

      toast({
        title: "Success",
        description: `Monthly unassigned credit for ${generateMonthOptions()[month - 1].label} ${year} has been deleted.`,
      });
        
        // Trigger budget refresh
        if (onBudgetRefresh) {
          onBudgetRefresh(true); // Force refresh to update unassigned credits
        }
    } catch (error) {
      console.error('Error deleting monthly credit:', error);
      toast({
        title: "Error",
        description: "Failed to delete monthly unassigned credit. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle editing monthly unassigned credit
  const handleEditMonthlyCredit = (year: number, month: number) => {
    const amount = getUnassignedCreditsForMonth(year, month);
    setSelectedYear(year);
    setSelectedMonth(month);
    setMonthlyAmount(amount.toString());
    setEditingMonthlyCredit({ year, month });
    setShowAddForm(true);
  };

  // Handle assigning unassigned credit to a category
  const handleAssignToCategory = async (year: number, month: number, amount: number, category?: string, targetYear?: number, targetMonth?: number) => {
    const selectedCategory = category || assignToCategory;
    const selectedTargetYear = targetYear || assignToYear;
    const selectedTargetMonth = targetMonth || assignToMonth;

    if (!selectedCategory) {
      toast({
        title: "No Category Selected",
        description: "Please select a category to assign the credit to.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Create a credit record using the normal credit mechanism
      // This will automatically add the credit to the category's budget for the selected target month
      const creditDateString = getCurrentDateString();
      
      const creditData = {
        category: selectedCategory,
        amount: amount,
        description: `Assigned from Monthly Unassigned Credits (${generateMonthOptions()[month - 1].label} ${year}) to ${generateMonthOptions()[selectedTargetMonth - 1].label} ${selectedTargetYear}`,
        date: creditDateString // Use current date for credit entry
      };

      // Add the credit using the normal credit system (this will automatically update the category budget)
      await onAddCredit(creditData);

      // Remove the amount from monthly unassigned credits
      const result = await deleteMonthlyCredit(year, month);

      if (result.error) {
        throw result.error;
      }

      toast({
        title: "Success",
        description: `₹${amount.toLocaleString()} has been assigned to ${selectedCategory} category budget for ${generateMonthOptions()[selectedTargetMonth - 1].label} ${selectedTargetYear}.`,
      });

      // Reset state
      setAssignToCategory('');
      setAssigningCredit(null);
      setAssignToYear(new Date().getFullYear());
      setAssignToMonth(new Date().getMonth() + 1);
      
      // Trigger budget refresh to update dashboard immediately
      if (onBudgetRefresh) {
        onBudgetRefresh(true); // Force refresh to update unassigned credits
      }
      
      // Close all modals and return to dashboard
      onClose();
    } catch (error) {
      console.error('Error assigning credit to category:', error);
      toast({
        title: "Error",
        description: "Failed to assign credit to category. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle split assignment initialization
  const handleStartSplitAssignment = (year: number, month: number, amount: number) => {
    setSplitAssigningCredit({ year, month, amount });
    setSplitAssignments([{ category: '', amount: '' }]); // Start with one empty assignment
  };

  // Add new split assignment row
  const addSplitAssignment = () => {
    setSplitAssignments(prev => [...prev, { category: '', amount: '' }]);
  };

  // Remove split assignment row
  const removeSplitAssignment = (index: number) => {
    setSplitAssignments(prev => prev.filter((_, i) => i !== index));
  };

  // Update split assignment
  const updateSplitAssignment = (index: number, field: 'category' | 'amount', value: string) => {
    setSplitAssignments(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  // Handle split assignment submission
  const handleSplitAssignment = async (assignments?: Array<{category: string, amount: string}>, targetYear?: number, targetMonth?: number) => {
    const selectedAssignments = assignments || splitAssignments;
    const selectedTargetYear = targetYear || splitTargetYear;
    const selectedTargetMonth = targetMonth || splitTargetMonth;
    const credit = splitAssigningCredit;

    if (!credit) return;

    // Validate split assignments
    const validAssignments = selectedAssignments.filter(assignment => 
      assignment.category && assignment.amount && parseFloat(assignment.amount) > 0
    );

    if (validAssignments.length === 0) {
      toast({
        title: "No Valid Assignments",
        description: "Please add at least one valid category and amount.",
        variant: "destructive",
      });
      return;
    }

    // Calculate total assigned amount
    const totalAssigned = validAssignments.reduce((sum, assignment) => 
      sum + parseFloat(assignment.amount), 0
    );

    // Check if assigned amount exceeds the available unassigned credit
    if (totalAssigned > credit.amount) {
      toast({
        title: "Amount Exceeds Available",
        description: `Total assigned amount (₹${totalAssigned.toLocaleString()}) cannot exceed the available unassigned credit (₹${credit.amount.toLocaleString()}).`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const creditDateString = getCurrentDateString();

      // Create credit records for each assignment
      for (const assignment of validAssignments) {
        const creditData = {
          category: assignment.category,
          amount: parseFloat(assignment.amount),
          description: `Split from Monthly Unassigned Credits (${generateMonthOptions()[credit.month - 1].label} ${credit.year}) to ${generateMonthOptions()[selectedTargetMonth - 1].label} ${selectedTargetYear}`,
          date: creditDateString
        };

        await onAddCredit(creditData);
      }

      // Calculate remaining unassigned credit
      const remainingAmount = credit.amount - totalAssigned;

      if (remainingAmount > 0.01) {
        // Update the monthly unassigned credit with the remaining amount
        const result = await addOrUpdateMonthlyCredit(
          credit.year, 
          credit.month, 
          -totalAssigned // Subtract the assigned amount
        );

        if (result.error) {
          throw result.error;
        }
      } else {
        // If no remaining amount, delete the monthly unassigned credit
        const result = await deleteMonthlyCredit(credit.year, credit.month);

        if (result.error) {
          throw result.error;
        }
      }

      // Show success message based on whether there's remaining balance
      const successMessage = remainingAmount > 0.01 
        ? `₹${totalAssigned.toLocaleString()} has been assigned across ${validAssignments.length} categories for ${generateMonthOptions()[selectedTargetMonth - 1].label} ${selectedTargetYear}. ₹${remainingAmount.toLocaleString()} remains as unassigned credit for ${generateMonthOptions()[credit.month - 1].label} ${credit.year}.`
        : `₹${totalAssigned.toLocaleString()} has been fully assigned across ${validAssignments.length} categories for ${generateMonthOptions()[selectedTargetMonth - 1].label} ${selectedTargetYear}.`;

      toast({
        title: "Split Assignment Successful",
        description: successMessage,
      });

      // Reset state
      setSplitAssigningCredit(null);
      setSplitAssignments([]);
      setSplitTargetYear(new Date().getFullYear());
      setSplitTargetMonth(new Date().getMonth() + 1);
      
      // Trigger budget refresh to update dashboard immediately
      if (onBudgetRefresh) {
        onBudgetRefresh(true); // Force refresh to update unassigned credits
      }
      
      // Close all modals and return to dashboard
      onClose();
    } catch (error) {
      console.error('Error in split assignment:', error);
      toast({
        title: "Error",
        description: "Failed to complete split assignment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Old reassign functionality removed - now using monthly unassigned credits table

  // Removed old unassigned credits check - now using monthly table

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-2xl glass-card border-white/20 max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <CardHeader className="pb-2 sm:pb-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500">
                <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base sm:text-lg font-heading gradient-text truncate">
                  Monthly Unassigned Credits
                </CardTitle>
                <p className="text-xs sm:text-sm text-white/70 truncate">
                  Manage your monthly unassigned credit amounts.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <Button
                onClick={() => setShowAddForm(!showAddForm)}
                size="sm"
                className="glass-button bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 h-7 w-7 sm:h-8 sm:w-8 p-0"
                title="Add Monthly Unassigned Credit"
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-white/10"
              >
                <X className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto">
          <CardContent className="space-y-2 sm:space-y-4 p-2 sm:p-5">
              <>
                {/* Add/Edit Monthly Unassigned Credit */}
                {showAddForm && (
                  <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="p-1 sm:p-1.5 rounded bg-blue-500/20">
                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400" />
                      </div>
                      <h3 className="text-sm sm:text-base font-semibold text-white">
                        {editingMonthlyCredit ? 'Edit' : 'Add'} Monthly Unassigned Credit
                      </h3>
                    </div>
                
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                      <div className="space-y-1 sm:space-y-2">
                        <Label className="text-white font-medium text-xs sm:text-sm">Year</Label>
                        <Select 
                          value={selectedYear.toString()} 
                          onValueChange={(value) => setSelectedYear(parseInt(value))}
                          disabled={loading}
                        >
                          <SelectTrigger className={cn(selectTriggerBase, 'h-8 sm:h-9 text-sm')}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className={cn(selectContentBase, 'max-h-60')}>
                            {generateYearOptions().map((year) => (
                              <SelectItem 
                                key={year} 
                                value={year.toString()}
                                className={cn(selectItemBase, 'text-sm')}
                              >
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1 sm:space-y-2">
                        <Label className="text-white font-medium text-xs sm:text-sm">Month</Label>
                        <Select 
                          value={selectedMonth.toString()} 
                          onValueChange={(value) => setSelectedMonth(parseInt(value))}
                          disabled={loading}
                        >
                          <SelectTrigger className={cn(selectTriggerBase, 'h-8 sm:h-9 text-sm')}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className={cn(selectContentBase, 'max-h-60')}>
                            {generateMonthOptions().map((month) => (
                              <SelectItem 
                                key={month.value} 
                                value={month.value.toString()}
                                className={cn(selectItemBase, 'text-sm')}
                              >
                                {month.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1 sm:space-y-2">
                        <Label className="text-white font-medium text-xs sm:text-sm">Amount</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Enter amount"
                          value={monthlyAmount}
                          onChange={(e) => setMonthlyAmount(e.target.value)}
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-8 sm:h-9 text-sm"
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <Button
                        onClick={handleSaveMonthlyCredit}
                        disabled={loading || !monthlyAmount}
                        className="flex-1 glass-button bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 h-8 sm:h-9 text-sm"
                      >
                        {loading ? (
                          <div className="flex items-center gap-1 sm:gap-2">
                            <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white"></div>
                            <span className="text-xs sm:text-sm">Saving...</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 sm:gap-2">
                            <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="text-xs sm:text-sm">{editingMonthlyCredit ? 'Update' : 'Add'} Credit</span>
                          </div>
                        )}
                      </Button>
                      
                      {editingMonthlyCredit && (
                        <Button
                          onClick={() => {
                            setEditingMonthlyCredit(null);
                            setMonthlyAmount('');
                            setShowAddForm(false);
                          }}
                          variant="outline"
                          className="glass-button border-white/20 hover:bg-white/10 h-8 sm:h-9 text-sm px-3 sm:px-4"
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
              </div>
              )}

              {/* Total Unassigned Credits Display */}
              {monthlyCredits.length > 0 && (
                <div className="p-3 sm:p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500">
                        <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-semibold text-white">Total Unassigned Credits</h3>
                        <p className="text-xs sm:text-sm text-white/70">
                          {filterYear === 'all' && filterMonth === 'all' 
                            ? 'Across all months' 
                            : `Filtered results (${filteredMonthlyCredits.length} month${filteredMonthlyCredits.length !== 1 ? 's' : ''})`
                          }
                        </p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-lg sm:text-xl font-bold text-green-400">
                        ₹{filteredMonthlyCredits.reduce((sum, credit) => sum + credit.unassigned_credit_amount, 0).toLocaleString()}
                      </p>
                      <p className="text-xs sm:text-sm text-white/60">
                        {filteredMonthlyCredits.length} month{filteredMonthlyCredits.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Filter Controls */}
              {monthlyCredits.length > 0 && (
                <div className="p-2 sm:p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-1 sm:gap-2 mb-2 sm:mb-3">
                    <div className="p-1 sm:p-1.5 rounded bg-blue-500/20">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400" />
                    </div>
                    <h3 className="text-xs sm:text-sm font-semibold text-white">Filter Credits</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div className="space-y-1 sm:space-y-2">
                      <Label className="text-white font-medium text-xs sm:text-sm">Year</Label>
                      <Select 
                        value={filterYear} 
                        onValueChange={setFilterYear}
                      >
                        <SelectTrigger className={cn(selectTriggerBase, 'h-7 sm:h-8 text-xs sm:text-sm')}>
                          <SelectValue placeholder="All years" />
                        </SelectTrigger>
                        <SelectContent className={cn(selectContentBase, 'max-h-60')}>
                          <SelectItem value="all" className={cn(selectItemBase, 'text-xs sm:text-sm')}>
                            All Years
                          </SelectItem>
                          {generateYearOptions().map((year) => (
                            <SelectItem 
                              key={year} 
                              value={year.toString()}
                              className={cn(selectItemBase, 'text-xs sm:text-sm')}
                            >
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1 sm:space-y-2">
                      <Label className="text-white font-medium text-xs sm:text-sm">Month</Label>
                      <Select 
                        value={filterMonth} 
                        onValueChange={setFilterMonth}
                      >
                        <SelectTrigger className={cn(selectTriggerBase, 'h-7 sm:h-8 text-xs sm:text-sm')}>
                          <SelectValue placeholder="All months" />
                        </SelectTrigger>
                        <SelectContent className={cn(selectContentBase, 'max-h-60')}>
                          <SelectItem value="all" className={cn(selectItemBase, 'text-xs sm:text-sm')}>
                            All Months
                          </SelectItem>
                          {generateMonthOptions().map((month) => (
                            <SelectItem 
                              key={month.value} 
                              value={month.value.toString()}
                              className={cn(selectItemBase, 'text-xs sm:text-sm')}
                            >
                              {month.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {(filterYear !== 'all' || filterMonth !== 'all') && (
                    <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-white/10">
                      <Button
                        onClick={() => {
                          setFilterYear('all');
                          setFilterMonth('all');
                        }}
                        variant="outline"
                        size="sm"
                        className="glass-button border-white/20 hover:bg-white/10 h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3"
                      >
                        Clear Filters
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Monthly Unassigned Credits List */}
              <div className="space-y-1 sm:space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1 sm:p-1.5 rounded bg-green-500/20">
                    <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-semibold text-white">
                      Monthly Unassigned Credits ({filteredMonthlyCredits.length})
                    </h3>
                    {(filterYear !== 'all' || filterMonth !== 'all') && (
                      <p className="text-xs sm:text-sm text-white/60">
                        Filtered from {monthlyCredits.length} total credits
                      </p>
                    )}
                  </div>
                </div>

                {monthlyCreditsLoading || showLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto"></div>
                    <p className="text-muted-foreground mt-2">Loading monthly credits...</p>
                  </div>
                ) : monthlyCredits.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="p-4 rounded-full bg-muted/20 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <CreditCard className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground text-lg">No monthly unassigned credits found!</p>
                    <p className="text-sm text-muted-foreground mt-2">Add your first monthly unassigned credit above.</p>
                  </div>
                ) : filteredMonthlyCredits.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="p-4 rounded-full bg-muted/20 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Calendar className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground text-lg">No credits found for the selected filters!</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Try adjusting your year or month filters, or clear all filters to see all credits.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1 sm:space-y-3 max-h-56 sm:max-h-64 overflow-y-auto">
                    {filteredMonthlyCredits.map((credit) => (
                      <div 
                        key={`${credit.year}-${credit.month}`}
                        className="p-1.5 sm:p-3 rounded-lg bg-white/5 border border-white/10"
                      >
                        {/* Mobile-optimized layout */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                            <div className="p-1 sm:p-1.5 rounded bg-gradient-to-r from-green-500 to-emerald-500 flex-shrink-0">
                              <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-white text-xs sm:text-sm">
                                {generateMonthOptions()[credit.month - 1].label} {credit.year}
                              </p>
                              <p className="text-xs sm:text-sm text-white/70">
                                Monthly Unassigned Credit
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between sm:justify-end gap-2">
                            <div className="text-left sm:text-right">
                              <p className="font-bold text-sm sm:text-base text-green-400">+₹{credit.unassigned_credit_amount.toLocaleString()}</p>
                            </div>
                            
                            {/* Action buttons - mobile optimized */}
                            <div className="flex items-center gap-1">
                              <Button
                                onClick={() => handleEditMonthlyCredit(credit.year, credit.month)}
                                disabled={loading}
                                size="sm"
                                className="glass-button bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 h-6 w-6 sm:h-7 sm:w-7 p-0"
                                title="Edit this credit"
                              >
                                <Edit className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              </Button>
                              <Button
                                onClick={() => setAssigningCredit({ year: credit.year, month: credit.month, amount: credit.unassigned_credit_amount })}
                                disabled={loading}
                                size="sm"
                                className="glass-button bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 h-6 w-6 sm:h-7 sm:w-7 p-0"
                                title="Add to category budget"
                              >
                                <ArrowRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              </Button>
                              <Button
                                onClick={() => handleStartSplitAssignment(credit.year, credit.month, credit.unassigned_credit_amount)}
                                disabled={loading}
                                size="sm"
                                className="glass-button bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 h-6 w-6 sm:h-7 sm:w-7 p-0"
                                title="Split across multiple categories"
                              >
                                <Split className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              </Button>
                              <Button
                                onClick={() => handleDeleteMonthlyCredit(credit.year, credit.month)}
                                disabled={loading}
                                size="sm"
                                className="glass-button bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 h-6 w-6 sm:h-7 sm:w-7 p-0"
                                title="Delete this credit"
                              >
                                <Trash2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>


            </>
            </CardContent>
          </div>

          {/* Footer */}
          <div className="border-t border-white/10 p-1.5 sm:p-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="glass-button border-white/20 hover:bg-white/10 h-8 sm:h-9 text-xs sm:text-sm"
              >
                Close
              </Button>
              {monthlyCredits.length > 0 && (
                <div className="text-center sm:text-right text-xs sm:text-sm text-white/60">
                  <p>Total: {monthlyCredits.length} | Filtered: {filteredMonthlyCredits.length}</p>
                </div>
              )}
            </div>
          </div>
      </Card>

      {/* Assign Credit Modal */}
      {assigningCredit && (
        <AssignCreditModal
          credit={assigningCredit}
          categories={categories}
          onClose={() => {
            setAssigningCredit(null);
            setAssignToCategory('');
            setAssignToYear(new Date().getFullYear());
            setAssignToMonth(new Date().getMonth() + 1);
          }}
          onAssign={async (category, targetYear, targetMonth) => {
            await handleAssignToCategory(assigningCredit.year, assigningCredit.month, assigningCredit.amount, category, targetYear, targetMonth);
            setAssigningCredit(null);
            setAssignToCategory('');
            setAssignToYear(new Date().getFullYear());
            setAssignToMonth(new Date().getMonth() + 1);
          }}
          loading={loading}
          generateMonthOptions={generateMonthOptions}
          generateYearOptions={generateYearOptions}
        />
      )}

      {/* Split Credit Modal */}
      {splitAssigningCredit && (
        <SplitCreditModal
          credit={splitAssigningCredit}
          categories={categories}
          onClose={() => {
            setSplitAssigningCredit(null);
            setSplitAssignments([]);
            setSplitTargetYear(new Date().getFullYear());
            setSplitTargetMonth(new Date().getMonth() + 1);
          }}
          onSplit={async (assignments, targetYear, targetMonth) => {
            await handleSplitAssignment(assignments, targetYear, targetMonth);
            setSplitAssigningCredit(null);
            setSplitAssignments([]);
            setSplitTargetYear(new Date().getFullYear());
            setSplitTargetMonth(new Date().getMonth() + 1);
          }}
          loading={loading}
          generateMonthOptions={generateMonthOptions}
          generateYearOptions={generateYearOptions}
        />
      )}

    </div>
  );
};

export default ReassignCreditsModal;
