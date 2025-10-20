import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus, Calendar, DollarSign, Briefcase, TrendingUp, PieChart, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useBudgets } from '@/hooks/useBudgets';
import { useCategories } from '@/hooks/useCategories';
import { useExpenses } from '@/hooks/useExpenses';
import { useToast } from '@/hooks/use-toast';
import { formatCurrencyInIST } from '@/lib/dateUtils';
import { supabase } from '@/integrations/supabase/client';
import { getIconByCategoryName } from '@/data/categoryIcons';

interface MonthlySalaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSalary: (salaryData: {
    month: string; // YYYY-MM format
    amount: number;
    date: string; // YYYY-MM-01 format
  }) => void;
  onManageBudget?: () => void;
}

interface FormErrors {
  amount?: string;
  month?: string;
}

const MonthlySalaryModal = ({ isOpen, onClose, onAddSalary, onManageBudget }: MonthlySalaryModalProps) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isAnimating, setIsAnimating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    month: (() => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}`;
    })(), // Current month YYYY-MM using local date
    amount: ''
  });
  const [budgetData, setBudgetData] = useState<{
    totalBudget: number;
    categoryBreakdown: Array<{ name: string; budget: number; spent: number; remaining: number }>;
    loading: boolean;
  }>({
    totalBudget: 0,
    categoryBreakdown: [],
    loading: false
  });

  const { user } = useAuth();
  const { toast } = useToast();
  const { categories } = useCategories(user?.id);
  const { expenses } = useExpenses(user?.id);

  // Helper function to get category icon
  const getCategoryIcon = (categoryName: string): string => {
    const category = categories.find(cat => cat.name === categoryName);
    return category?.icon || getIconByCategoryName(categoryName);
  };

  // Handle modal animation states
  useEffect(() => {
    if (isOpen) {
      setShowModal(true);
      setIsAnimating(true);
      // Trigger animation after a brief delay to ensure DOM is ready
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 10);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(true);
      // Delay hiding the modal to allow exit animation
      const timer = setTimeout(() => {
        setShowModal(false);
        setIsAnimating(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Generate month options (last 12 months + next 6 months)
  const generateMonthOptions = () => {
    const options = [];
    const currentDate = new Date();
    
    // Add past 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      // Use local date formatting instead of toISOString() to avoid timezone issues
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const value = `${year}-${month}`;
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      options.push({ value, label });
      
    }
    
    // Add next 6 months
    for (let i = 1; i <= 6; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      // Use local date formatting instead of toISOString() to avoid timezone issues
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const value = `${year}-${month}`;
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      options.push({ value, label });
      
    }
    
    return options;
  };

  const monthOptions = generateMonthOptions();

  // Fetch budget data when month changes
  useEffect(() => {
    const fetchBudgetData = async () => {
      if (!user?.id || !formData.month) {
        setBudgetData({
          totalBudget: 0,
          categoryBreakdown: [],
          loading: false
        });
        return;
      }

      setBudgetData(prev => ({ ...prev, loading: true }));

      try {
        // Get budgets for the selected month
        const { data: budgets, error: budgetsError } = await supabase
          .from('budgets')
          .select(`
            amount,
            categories!inner(name)
          `)
          .eq('user_id', user.id)
          .eq('month_year', formData.month);

        if (budgetsError) {
          throw budgetsError;
        }

        // Calculate expenses for the selected month
        const monthStart = `${formData.month}-01`;
        const nextMonth = new Date(monthStart);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const monthEnd = nextMonth.toISOString().slice(0, 10);

        const monthExpenses = expenses.filter(expense => 
          expense.date >= monthStart && expense.date < monthEnd
        );

        // Create category breakdown
        const categoryBreakdown = categories
          .filter(cat => cat.name !== 'Salary') // Exclude Salary category
          .map(category => {
            const budget = budgets?.find(b => b.categories.name === category.name);
            const budgetAmount = budget?.amount || 0;
            
            const spent = monthExpenses
              .filter(expense => expense.category === category.name)
              .reduce((sum, expense) => sum + expense.amount, 0);

            return {
              name: category.name,
              budget: budgetAmount,
              spent: spent,
              remaining: budgetAmount - spent
            };
          })
          .filter(item => item.budget > 0 || item.spent > 0); // Only show categories with budget or expenses

        const totalBudget = categoryBreakdown.reduce((sum, item) => sum + item.budget, 0);

        console.log('Budget data for month:', formData.month, {
          budgets,
          monthExpenses,
          categoryBreakdown,
          totalBudget
        });

        setBudgetData({
          totalBudget,
          categoryBreakdown,
          loading: false
        });
      } catch (error) {
        console.error('Error fetching budget data:', error);
        setBudgetData({
          totalBudget: 0,
          categoryBreakdown: [],
          loading: false
        });
      }
    };

    fetchBudgetData();
  }, [formData.month, user?.id, categories, expenses]);

  const validateForm = () => {
    const newErrors: FormErrors = {};

    // Validate amount
    if (!formData.amount || formData.amount.trim() === '') {
      newErrors.amount = 'Salary amount is required';
    } else {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        newErrors.amount = 'Amount must be a positive number';
      } else {
        // Validate salary amount against total budget
        if (budgetData.totalBudget > 0 && amount < budgetData.totalBudget) {
          const deficitAmount = budgetData.totalBudget - amount;
          newErrors.amount = `You can add monthly income more than or equal to your month's total budget (₹${formatCurrencyInIST(budgetData.totalBudget)}). You need to decrease your budget by ₹${formatCurrencyInIST(deficitAmount)} to add your ₹${formatCurrencyInIST(amount)} salary.`;
        }
      }
    }

    // Validate month
    if (!formData.month || formData.month.trim() === '') {
      newErrors.month = 'Month selection is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const salaryData = {
        month: formData.month,
        amount: parseFloat(formData.amount),
        date: `${formData.month}-01` // First day of the month
      };


      await onAddSalary(salaryData);
      
      // Show success toast
      const monthName = monthOptions.find(opt => opt.value === formData.month)?.label || formData.month;
      const salaryAmount = parseFloat(formData.amount);
      const budgetAmount = budgetData.totalBudget;
      
      let description = `₹${formatCurrencyInIST(salaryAmount)} salary for ${monthName} has been recorded.`;
      
      if (budgetAmount > 0 && salaryAmount > budgetAmount) {
        const excessAmount = salaryAmount - budgetAmount;
        description = `₹${formatCurrencyInIST(salaryAmount)} salary for ${monthName} recorded: ₹${formatCurrencyInIST(budgetAmount)} as salary credit + ₹${formatCurrencyInIST(excessAmount)} as unassigned credit.`;
      }
      
      toast({
        title: "Salary Added!",
        description: description,
      });

      // Reset form and close modal
      setFormData({
        month: (() => {
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          return `${year}-${month}`;
        })(),
        amount: ''
      });
      setErrors({});
      setIsAnimating(true);
      setTimeout(() => {
        onClose();
      }, 200);
    } catch (error) {
      console.error('Error adding salary:', error);
      toast({
        title: "Error",
        description: "Failed to add salary. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (!showModal) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-all duration-300 ease-out ${
      isAnimating && isOpen ? 'opacity-0' : 'opacity-100'
    }`}>
      <Card className={`w-full max-w-2xl glass-card border-white/20 max-h-[90vh] overflow-y-auto transition-all duration-300 ease-out transform ${
        isAnimating && isOpen 
          ? 'opacity-0 scale-95 translate-y-4' 
          : 'opacity-100 scale-100 translate-y-0'
      }`}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500">
                <Briefcase className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-xl font-heading gradient-text">Add Monthly Salary</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAnimating(true);
                setTimeout(() => {
                  onClose();
                }, 200);
              }}
              className="h-8 w-8 p-0 hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Record your monthly salary income. This will be added as credit under the "Salary" category.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Month Selection */}
            <div className="space-y-2">
              <Label htmlFor="month" className="text-white font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Month *
              </Label>
              <Select 
                value={formData.month} 
                onValueChange={(value) => handleInputChange('month', value)}
                disabled={loading}
              >
                <SelectTrigger className={`bg-white/10 border-white/20 text-white ${
                  errors.month ? 'border-red-500/50' : ''
                }`}>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/20 max-h-60">
                  {monthOptions.map((option) => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                      className="text-white hover:bg-white/10"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.month && (
                <p className="text-xs text-red-400">{errors.month}</p>
              )}
            </div>

            {/* Amount Field */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-white font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Salary Amount *
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min={budgetData.totalBudget > 0 ? budgetData.totalBudget : "0.01"}
                placeholder="Enter your monthly salary"
                value={formData.amount}
                onChange={(e) => {
                  handleInputChange('amount', e.target.value);
                  // Real-time validation
                  if (e.target.value && budgetData.totalBudget > 0) {
                    const amount = parseFloat(e.target.value);
                    if (!isNaN(amount) && amount < budgetData.totalBudget) {
                      const deficitAmount = budgetData.totalBudget - amount;
                      setErrors(prev => ({
                        ...prev,
                        amount: `You can add monthly income more than or equal to your month's total budget (₹${formatCurrencyInIST(budgetData.totalBudget)}). You need to decrease your budget by ₹${formatCurrencyInIST(deficitAmount)} to add your ₹${formatCurrencyInIST(amount)} salary.`
                      }));
                    } else if (!isNaN(amount) && amount >= budgetData.totalBudget) {
                      setErrors(prev => ({ ...prev, amount: undefined }));
                    }
                  }
                }}
                className={`bg-white/10 border-white/20 text-white placeholder:text-white/50 ${
                  errors.amount ? 'border-red-500/50' : ''
                }`}
                disabled={loading}
              />
              {budgetData.totalBudget > 0 && (
                <p className="text-xs text-white/60">
                  Minimum required: ₹{formatCurrencyInIST(budgetData.totalBudget)}
                </p>
              )}
              {errors.amount && (
                <p className="text-xs text-red-400">{errors.amount}</p>
              )}
            </div>

            {/* Budget Display Section */}
            <div className="space-y-3 p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-blue-400" />
                  <h3 className="text-sm font-medium text-white">
                    Budget Overview for {monthOptions.find(opt => opt.value === formData.month)?.label}
                  </h3>
                </div>
                {onManageBudget && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onManageBudget}
                    className="glass-button border-blue-500/50 hover:bg-blue-500/20 text-xs px-2 py-1"
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    Manage Budget
                  </Button>
                )}
              </div>

              {budgetData.loading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
                  <span className="ml-2 text-sm text-white/70">Loading budget data...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <span className="text-sm font-medium text-blue-400">Total Monthly Budget:</span>
                    <span className="text-sm font-bold text-blue-400">
                      ₹{formatCurrencyInIST(budgetData.totalBudget)}
                    </span>
                  </div>


                  {budgetData.categoryBreakdown.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs text-white/70 mb-2">Category Breakdown:</p>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {budgetData.categoryBreakdown.map((category, index) => (
                          <div key={index} className="flex justify-between items-center text-xs p-2 rounded bg-white/5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{getCategoryIcon(category.name)}</span>
                              <span className="text-white/80">{category.name}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-white/60">
                                Budget: ₹{formatCurrencyInIST(category.budget)}
                              </div>
                              <div className="text-white/60">
                                Spent: ₹{formatCurrencyInIST(category.spent)}
                              </div>
                              <div className={`${category.remaining >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                Remaining: ₹{formatCurrencyInIST(category.remaining)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <p className="text-xs text-white/50 mb-2">
                        No budget data available for this month
                      </p>
                      <p className="text-xs text-white/40">
                        Set up budgets for your categories to see detailed breakdown
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAnimating(true);
                  setTimeout(() => {
                    onClose();
                  }, 200);
                }}
                disabled={loading}
                className="flex-1 glass-button border-white/20 hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || budgetData.loading}
                className="flex-1 glass-button bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Adding Salary...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Monthly Salary
                  </div>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default MonthlySalaryModal;
