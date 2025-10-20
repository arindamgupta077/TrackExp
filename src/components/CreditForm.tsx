import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus, Calendar, DollarSign, CreditCard, AlertTriangle, Briefcase } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { useCredits } from '@/hooks/useCredits';
import { useMonthlyUnassignedCredits } from '@/hooks/useMonthlyUnassignedCredits';
import { useToast } from '@/hooks/use-toast';
import { getIconByCategoryName } from '@/data/categoryIcons';

interface CreditFormProps {
  onAddCredit: (credit: { category?: string; amount: number; description?: string; date: string }) => Promise<void>;
  onClose: () => void;
  onAddMonthlySalary?: () => void;
  onUnassignedCreditAdded?: () => void;
}

interface FormErrors {
  amount?: string;
  date?: string;
}


const CreditForm = ({ onAddCredit, onClose, onAddMonthlySalary, onUnassignedCreditAdded }: CreditFormProps) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState({
    category: 'unassigned',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0] // Today's date
  });
  const { user } = useAuth();
  const { toast } = useToast();
  const { categories, loading: categoriesLoading } = useCategories(user?.id);
  const { getUnassignedCreditsTotal } = useCredits(user?.id);
  const { addOrUpdateMonthlyCredit, getTotalUnassignedCredits } = useMonthlyUnassignedCredits(user?.id);

  // Get unassigned credits total for display
  const unassignedTotal = getTotalUnassignedCredits();

  const validateForm = () => {
    const newErrors: FormErrors = {};

    // Validate amount
    if (!formData.amount || formData.amount.trim() === '') {
      newErrors.amount = 'Amount is required';
    } else {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        newErrors.amount = 'Amount must be a positive number';
      }
    }

    // Validate date
    if (!formData.date || formData.date.trim() === '') {
      newErrors.date = 'Date is required';
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
      const amount = parseFloat(formData.amount);
      
      // If category is "unassigned", store in monthly_unassigned_credits table
      if (formData.category === 'unassigned') {
        const date = new Date(formData.date);
        const year = date.getFullYear();
        const month = date.getMonth() + 1; // JavaScript months are 0-based
        
        const result = await addOrUpdateMonthlyCredit(year, month, amount);
        
        if (result.error) {
          throw result.error;
        }
        
        toast({
          title: "Success",
          description: `Unassigned credit of ₹${amount.toLocaleString()} has been added to ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.`,
        });
        
        // Trigger dashboard refresh for unassigned credits
        if (onUnassignedCreditAdded) {
          onUnassignedCreditAdded();
        }
      } else {
        // For assigned categories, use the regular credit system
        const creditData = {
          category: formData.category,
          amount: amount,
          description: formData.description || undefined,
          date: formData.date
        };

        await onAddCredit(creditData);
      }
      
      // Reset form
      setFormData({
        category: 'unassigned',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      setErrors({});
      
      // Close modal after successful addition
      onClose();
    } catch (error) {
      console.error('Error adding credit:', error);
      toast({
        title: "Error",
        description: "Failed to add credit. Please try again.",
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-lg glass-card border-white/20 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-3 sm:pb-4">
          <div className="flex items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 flex-shrink-0">
                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <CardTitle className="text-lg sm:text-xl font-heading gradient-text truncate">Add New Credit</CardTitle>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {onAddMonthlySalary && (
                <Button
                  type="button"
                  onClick={onAddMonthlySalary}
                  disabled={loading}
                  className="glass-button bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-1.5 h-8 sm:h-auto"
                >
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <Briefcase className="h-3 w-3 sm:h-3 sm:w-3" />
                    <span className="hidden sm:inline">Add Monthly Income</span>
                    <span className="sm:hidden">Income</span>
                  </div>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 hover:bg-white/10 flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-2 sm:mt-0">
            Add income or credit to your budget. Assign to a category to increase that month's budget.
          </p>
        </CardHeader>

        <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
          {/* Unassigned Credits Display */}
          {unassignedTotal > 0 && (
            <div className="p-3 sm:p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-amber-400">
                  Unassigned Credits: ₹{unassignedTotal.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-amber-400/80 mt-1 leading-relaxed">
                These credits are not assigned to any category and won't affect your budgets.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            {/* Amount Field */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="amount" className="text-white font-medium flex items-center gap-2 text-sm sm:text-base">
                <DollarSign className="h-4 w-4" />
                Amount *
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Enter credit amount"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                className={`h-10 sm:h-11 bg-white/10 border-white/20 text-white placeholder:text-white/50 text-sm sm:text-base ${
                  errors.amount ? 'border-red-500/50' : ''
                }`}
                disabled={loading}
              />
              {errors.amount && (
                <p className="text-xs text-red-400">{errors.amount}</p>
              )}
            </div>

            {/* Category Field */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="category" className="text-white font-medium text-sm sm:text-base">
                Category (Optional)
              </Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => handleInputChange('category', value)}
                disabled={loading || categoriesLoading}
              >
                <SelectTrigger className="h-10 sm:h-11 bg-white/10 border-white/20 text-white text-sm sm:text-base">
                  <SelectValue placeholder="Select a category (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/20">
                  <SelectItem value="unassigned" className="text-white hover:bg-white/10">
                    <div className="flex items-center gap-2">
                      <span>💰</span>
                      <span>Unassigned</span>
                    </div>
                  </SelectItem>
                  {categories.map((category) => (
                    <SelectItem 
                      key={category.id} 
                      value={category.name}
                      className="text-white hover:bg-white/10"
                    >
                      <div className="flex items-center gap-2">
                        <span>{category.icon || getIconByCategoryName(category.name)}</span>
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Assigning to a category will increase that category's budget for the month.
              </p>
            </div>

            {/* Description Field */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="description" className="text-white font-medium text-sm sm:text-base">
                Description (Optional)
              </Label>
              <Input
                id="description"
                type="text"
                placeholder="Enter description (optional)"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="h-10 sm:h-11 bg-white/10 border-white/20 text-white placeholder:text-white/50 text-sm sm:text-base"
                disabled={loading}
              />
            </div>

            {/* Date Field */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="date" className="text-white font-medium flex items-center gap-2 text-sm sm:text-base">
                <Calendar className="h-4 w-4" />
                Date *
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className={`h-10 sm:h-11 bg-white/10 border-white/20 text-white text-sm sm:text-base ${
                  errors.date ? 'border-red-500/50' : ''
                }`}
                disabled={loading}
              />
              {errors.date && (
                <p className="text-xs text-red-400">{errors.date}</p>
              )}
            </div>


            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="flex-1 glass-button border-white/20 hover:bg-white/10 h-10 sm:h-11 text-sm sm:text-base"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || categoriesLoading}
                className="flex-1 glass-button bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 h-10 sm:h-11 text-sm sm:text-base"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span className="hidden sm:inline">Adding...</span>
                    <span className="sm:hidden">Adding</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Add Credit</span>
                    <span className="sm:hidden">Add</span>
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

export default CreditForm;
