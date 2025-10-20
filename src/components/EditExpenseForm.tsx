import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Calendar, Settings2, AlertTriangle, DollarSign, Edit } from 'lucide-react';
import { expenseSchema } from '@/lib/validations';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { useBudgets, BudgetWithCarryover } from '@/hooks/useBudgets';
import { CategoriesManager } from '@/components/CategoriesManager';
import { useToast } from '@/hooks/use-toast';

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  created_at: string;
}

interface EditExpenseFormProps {
  expense: Expense;
  onUpdateExpense: (expenseId: string, expense: { category: string; amount: number; description: string; date: string }) => void;
  onClose: () => void;
}

interface FormErrors {
  category?: string;
  amount?: string;
  description?: string;
  date?: string;
  general?: string;
}

// Fallback emojis for some common names
const defaultCategoryIcon = (name: string) => {
  const map: Record<string, string> = {
    'food': '🍽️',
    'transportation': '🚗',
    'shopping': '🛍️',
    'entertainment': '🎮',
    'health': '⚕️',
    'travel': '✈️',
    'education': '📚',
    'other': '📦'
  };
  const key = name.toLowerCase();
  return map[key] || '🧾';
};

const EditExpenseForm = ({ expense, onUpdateExpense, onClose }: EditExpenseFormProps) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState({
    category: expense.category,
    amount: expense.amount.toString(),
    description: expense.description,
    date: expense.date
  });
  const { user } = useAuth();
  const { categories, loading: categoriesLoading, refetch } = useCategories(user?.id);
  const { getBudgetWithCarryover } = useBudgets(user?.id);
  const { toast } = useToast();
  const [manageOpen, setManageOpen] = useState(false);
  const [currentBudget, setCurrentBudget] = useState<BudgetWithCarryover | null>(null);
  const [budgetWarning, setBudgetWarning] = useState<string | null>(null);

  // Check budget when category or date changes
  useEffect(() => {
    const checkBudget = async () => {
      if (!formData.category || !formData.date || !user?.id) {
        setCurrentBudget(null);
        setBudgetWarning(null);
        return;
      }

      try {
        // Find category ID
        const category = categories.find(cat => cat.name === formData.category);
        if (!category) return;

        const monthYear = formData.date.slice(0, 7); // YYYY-MM format
        const budget = await getBudgetWithCarryover(category.id, monthYear);
        setCurrentBudget(budget);

        // Check if this expense would exceed budget
        if (budget && formData.amount) {
          const amount = parseFloat(formData.amount);
          const newTotalSpent = budget.spent_amount + amount;
          
          if (newTotalSpent > budget.total_budget) {
            const exceededBy = newTotalSpent - budget.total_budget;
            setBudgetWarning(`This expense will exceed your budget by ₹${exceededBy.toLocaleString()}`);
          } else if (newTotalSpent > budget.total_budget * 0.9) {
            setBudgetWarning(`This expense will use ${Math.round((newTotalSpent / budget.total_budget) * 100)}% of your budget`);
          } else {
            setBudgetWarning(null);
          }
        }
      } catch (error) {
        console.error('Error checking budget:', error);
      }
    };

    checkBudget();
  }, [formData.category, formData.date, formData.amount, categories, user?.id, getBudgetWithCarryover]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    
    try {
      const amount = parseFloat(formData.amount);
      
      // Validate form data
      const result = expenseSchema.safeParse({
        category: formData.category,
        amount: amount,
        description: formData.description,
        date: formData.date
      });
      
      if (!result.success) {
        const fieldErrors: FormErrors = {};
        result.error.issues.forEach((error) => {
          const field = error.path[0] as keyof FormErrors;
          fieldErrors[field] = error.message;
        });
        setErrors(fieldErrors);
        return;
      }

      // Check budget before updating expense
      if (currentBudget && amount) {
        const newTotalSpent = currentBudget.spent_amount + amount;
        if (newTotalSpent > currentBudget.total_budget) {
          const exceededBy = newTotalSpent - currentBudget.total_budget;
          toast({
            title: 'Budget Warning',
            description: `This expense will exceed your ${currentBudget.category_name} budget by ₹${exceededBy.toLocaleString()}`,
            variant: 'destructive',
          });
        }
      }
      
      await onUpdateExpense(expense.id, {
        category: formData.category,
        amount: amount,
        description: formData.description,
        date: formData.date
      });
      
      onClose();
    } catch (error) {
      console.error('EditExpenseForm: Error in handleSubmit:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setErrors({ general: `Failed to update expense: ${errorMessage}` });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
      <Card className="glass-card p-4 sm:p-6 w-full max-w-sm sm:max-w-md border-white/20 max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-3 sm:pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg sm:text-xl text-white flex items-center gap-2">
              <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
              Edit Expense
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-white/10"
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="category" className="text-white text-sm sm:text-base">Category</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setManageOpen(true)} className="glass-button h-7 sm:h-8 px-2 text-xs sm:text-sm">
                  <Settings2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" /> Manage
                </Button>
              </div>
              <Select value={formData.category} onValueChange={(value) => updateField('category', value)}>
                <SelectTrigger className="h-10 sm:h-12 bg-white/10 border-white/20 text-white text-sm sm:text-base">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categoriesLoading ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Loading...</div>
                  ) : categories.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No categories yet</div>
                  ) : (
                    categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        <div className="flex items-center gap-2">
                          <span>{defaultCategoryIcon(cat.name)}</span>
                          {cat.name}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-red-300 text-xs sm:text-sm mt-1">{errors.category}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className="text-white text-sm sm:text-base">Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => updateField('amount', e.target.value)}
                className="h-10 sm:h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 text-sm sm:text-base"
                placeholder="0.00"
                required
              />
              {errors.amount && <p className="text-red-300 text-xs sm:text-sm mt-1">{errors.amount}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-white text-sm sm:text-base">Description</Label>
              <Input
                id="description"
                type="text"
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                className="h-10 sm:h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 text-sm sm:text-base"
                placeholder="Brief description (optional)"
              />
              {errors.description && <p className="text-red-300 text-xs sm:text-sm mt-1">{errors.description}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date" className="text-white text-sm sm:text-base">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => updateField('date', e.target.value)}
                className="h-10 sm:h-12 bg-white/10 border-white/20 text-white text-sm sm:text-base"
                required
              />
              {errors.date && <p className="text-red-300 text-xs sm:text-sm mt-1">{errors.date}</p>}
            </div>

            {/* Budget Information */}
            {currentBudget && (
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium text-white">Budget Info</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base Budget:</span>
                    <span className="text-white">₹{currentBudget.amount.toLocaleString()}</span>
                  </div>
                  {currentBudget.carryover_amount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Carryover:</span>
                      <span className="text-green-400">₹{currentBudget.carryover_amount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Budget:</span>
                    <span className="text-blue-400">₹{currentBudget.total_budget.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Spent:</span>
                    <span className="text-white">₹{currentBudget.spent_amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Remaining:</span>
                    <span className={`${currentBudget.remaining_amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ₹{currentBudget.remaining_amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Budget Warning */}
            {budgetWarning && (
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <span className="text-red-400 text-sm">{budgetWarning}</span>
                </div>
              </div>
            )}

            {errors.general && (
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30">
                <p className="text-red-400 text-sm">{errors.general}</p>
              </div>
            )}

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full glass-button bg-gradient-primary hover:scale-105 h-10 sm:h-12 text-sm sm:text-base"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Updating...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  Update Expense
                </div>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Categories Manager */}
      {manageOpen && (
        <CategoriesManager
          isOpen={manageOpen}
          onClose={() => setManageOpen(false)}
          onChanged={() => {
            refetch();
            setManageOpen(false);
          }}
        />
      )}
    </div>
  );
};

export { EditExpenseForm };
