import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Save, Calendar, DollarSign, CreditCard } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { Credit } from '@/hooks/useCredits';
import { getIconByCategoryName } from '@/data/categoryIcons';

interface EditCreditFormProps {
  credit: Credit;
  onUpdateCredit: (creditId: string, credit: { category?: string; amount: number; description?: string; date: string }) => void;
  onClose: () => void;
}

interface FormErrors {
  amount?: string;
  date?: string;
}


const EditCreditForm = ({ credit, onUpdateCredit, onClose }: EditCreditFormProps) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState({
    category: credit.category || 'unassigned',
    amount: credit.amount.toString(),
    description: credit.description || '',
    date: credit.date
  });
  const { user } = useAuth();
  const { categories, loading: categoriesLoading } = useCategories(user?.id);

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
      const creditData = {
        category: formData.category && formData.category !== 'unassigned' ? formData.category : undefined,
        amount: parseFloat(formData.amount),
        description: formData.description || undefined,
        date: formData.date
      };

      await onUpdateCredit(credit.id, creditData);
      onClose();
    } catch (error) {
      console.error('Error updating credit:', error);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-lg glass-card border-white/20 max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-xl font-heading gradient-text">Edit Credit</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Update your credit information. Changes will automatically update the budget.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount Field */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-white font-medium flex items-center gap-2">
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
                className={`bg-white/10 border-white/20 text-white placeholder:text-white/50 ${
                  errors.amount ? 'border-red-500/50' : ''
                }`}
                disabled={loading}
              />
              {errors.amount && (
                <p className="text-xs text-red-400">{errors.amount}</p>
              )}
            </div>

            {/* Category Field */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-white font-medium">
                Category (Optional)
              </Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => handleInputChange('category', value)}
                disabled={loading || categoriesLoading}
              >
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
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
              <p className="text-xs text-muted-foreground">
                Assigning to a category will update that category's budget for the month.
              </p>
            </div>

            {/* Description Field */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-white font-medium">
                Description (Optional)
              </Label>
              <Input
                id="description"
                type="text"
                placeholder="Enter description (optional)"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                disabled={loading}
              />
            </div>

            {/* Date Field */}
            <div className="space-y-2">
              <Label htmlFor="date" className="text-white font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date *
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className={`bg-white/10 border-white/20 text-white ${
                  errors.date ? 'border-red-500/50' : ''
                }`}
                disabled={loading}
              />
              {errors.date && (
                <p className="text-xs text-red-400">{errors.date}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="flex-1 glass-button border-white/20 hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || categoriesLoading}
                className="flex-1 glass-button bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Updating...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Update Credit
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

export default EditCreditForm;
