/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  Plus, 
  Calendar, 
  DollarSign, 
  Tag, 
  Repeat, 
  Edit, 
  Trash2, 
  Clock,
  CheckCircle,
  AlertCircle,
  Play
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { useToast } from '@/hooks/use-toast';
import { getIconByCategoryName } from '@/data/categoryIcons';
import { supabase } from '@/integrations/supabase/client';

interface RecurringExpense {
  id: string;
  category: string;
  amount: number;
  description?: string;
  day_of_month: number;
  time_of_day: string;
  total_occurrences: number;
  remaining_occurrences: number;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface RecurringExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RecurringExpensesModal = ({ isOpen, onClose }: RecurringExpensesModalProps) => {
  const { user } = useAuth();
  const { categories } = useCategories(user?.id);
  const { toast } = useToast();

  // Helper function to get category icon
  const getCategoryIcon = (categoryName: string): string => {
    const category = categories.find(cat => cat.name === categoryName);
    return category?.icon || getIconByCategoryName(categoryName);
  };
  
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<RecurringExpense | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    description: '',
    dayOfMonth: '',
    timeOfDay: '09:00',
    totalOccurrences: ''
  });
  
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch recurring expenses
  const fetchRecurringExpenses = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc('get_user_recurring_expenses', {
        target_user_id: user.id
      });
      
      if (error) throw error;
      setRecurringExpenses(data || []);
    } catch (error) {
      console.error('Error fetching recurring expenses:', error);
      toast({
        title: "Error",
        description: "Failed to load recurring expenses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, toast]);

  // Create new recurring expense
  const createRecurringExpense = async () => {
    if (!user?.id) return;
    
    // Validate form
    const errors: Record<string, string> = {};
    if (!formData.category) errors.category = 'Category is required';
    if (!formData.amount || parseFloat(formData.amount) <= 0) errors.amount = 'Amount must be greater than 0';
    if (!formData.dayOfMonth || parseInt(formData.dayOfMonth) < 1 || parseInt(formData.dayOfMonth) > 31) {
      errors.dayOfMonth = 'Day must be between 1 and 31';
    }
    if (!formData.totalOccurrences || parseInt(formData.totalOccurrences) <= 0) {
      errors.totalOccurrences = 'Total occurrences must be greater than 0';
    }
    if (!formData.timeOfDay) {
      errors.timeOfDay = 'Time is required';
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('recurring_expenses')
        .insert({
          user_id: user.id,
          category: formData.category,
          amount: parseFloat(formData.amount),
          description: formData.description || null,
          day_of_month: parseInt(formData.dayOfMonth),
          time_of_day: formData.timeOfDay,
          total_occurrences: parseInt(formData.totalOccurrences),
          remaining_occurrences: parseInt(formData.totalOccurrences),
          start_date: new Date().toISOString().split('T')[0]
        });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Recurring expense created successfully",
      });
      
      resetForm();
      fetchRecurringExpenses();
    } catch (error) {
      console.error('Error creating recurring expense:', error);
      toast({
        title: "Error",
        description: "Failed to create recurring expense",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Update recurring expense
  const updateRecurringExpense = async () => {
    if (!editingExpense) return;
    
    // Validate form
    const errors: Record<string, string> = {};
    if (!formData.category) errors.category = 'Category is required';
    if (!formData.amount || parseFloat(formData.amount) <= 0) errors.amount = 'Amount must be greater than 0';
    if (!formData.dayOfMonth || parseInt(formData.dayOfMonth) < 1 || parseInt(formData.dayOfMonth) > 31) {
      errors.dayOfMonth = 'Day must be between 1 and 31';
    }
    if (!formData.totalOccurrences || parseInt(formData.totalOccurrences) <= 0) {
      errors.totalOccurrences = 'Total occurrences must be greater than 0';
    }
    if (!formData.timeOfDay) {
      errors.timeOfDay = 'Time is required';
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await (supabase as any).rpc('update_recurring_expense', {
        expense_id: editingExpense.id,
        new_category: formData.category,
        new_amount: parseFloat(formData.amount),
        new_description: formData.description || null,
        new_day_of_month: parseInt(formData.dayOfMonth),
        new_time_of_day: formData.timeOfDay,
        new_total_occurrences: parseInt(formData.totalOccurrences)
      });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Recurring expense updated successfully",
      });
      
      resetForm();
      fetchRecurringExpenses();
    } catch (error) {
      console.error('Error updating recurring expense:', error);
      toast({
        title: "Error",
        description: "Failed to update recurring expense",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Delete recurring expense
  const deleteRecurringExpense = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await (supabase as any).rpc('delete_recurring_expense', {
        expense_id: id
      });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Recurring expense deleted successfully",
      });
      
      fetchRecurringExpenses();
    } catch (error) {
      console.error('Error deleting recurring expense:', error);
      toast({
        title: "Error",
        description: "Failed to delete recurring expense",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      category: '',
      amount: '',
      description: '',
      dayOfMonth: '',
      timeOfDay: '09:00',
      totalOccurrences: ''
    });
    setFormErrors({});
    setShowAddForm(false);
    setEditingExpense(null);
  };

  // Start editing
  const startEditing = (expense: RecurringExpense) => {
    setFormData({
      category: expense.category,
      amount: expense.amount.toString(),
      description: expense.description || '',
      dayOfMonth: expense.day_of_month.toString(),
      timeOfDay: expense.time_of_day,
      totalOccurrences: expense.total_occurrences.toString()
    });
    setEditingExpense(expense);
    setShowAddForm(true);
  };

  // Manually trigger recurring expenses processing
  const handleManualTrigger = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc('manual_trigger_recurring_expenses');
      
      if (error) throw error;
      
      const result = (data as any) && (data as any).length > 0 ? (data as any)[0] : { processed_count: 0, message: 'No data returned' };
      
      toast({
        title: "Success",
        description: result.message || "Recurring expenses processed successfully",
      });
      
      // Refresh the list
      await fetchRecurringExpenses();
    } catch (error) {
      console.error('Error triggering recurring expenses:', error);
      toast({
        title: "Error",
        description: "Failed to process recurring expenses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate day options (1-31)
  const dayOptions = Array.from({ length: 31 }, (_, i) => i + 1);

  // Generate occurrence options (1-60)
  const occurrenceOptions = Array.from({ length: 60 }, (_, i) => i + 1);

  useEffect(() => {
    if (isOpen) {
      fetchRecurringExpenses();
    }
  }, [isOpen, user?.id, fetchRecurringExpenses]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            Expense Automation
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Add/Edit Form */}
          {showAddForm && (
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg">
                  {editingExpense ? 'Edit Recurring Expense' : 'Add New Recurring Expense'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.name}>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{getCategoryIcon(category.name)}</span>
                              <span>{category.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors.category && (
                      <p className="text-sm text-destructive">{formErrors.category}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (₹) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="Enter amount"
                    />
                    {formErrors.amount && (
                      <p className="text-sm text-destructive">{formErrors.amount}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="dayOfMonth">Day of Month *</Label>
                    <Select 
                      value={formData.dayOfMonth} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, dayOfMonth: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        {dayOptions.map((day) => (
                          <SelectItem key={day} value={day.toString()}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors.dayOfMonth && (
                      <p className="text-sm text-destructive">{formErrors.dayOfMonth}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="timeOfDay">Time of Day *</Label>
                    <Input
                      id="timeOfDay"
                      type="time"
                      value={formData.timeOfDay}
                      onChange={(e) => setFormData(prev => ({ ...prev, timeOfDay: e.target.value }))}
                      className="w-full"
                    />
                    {formErrors.timeOfDay && (
                      <p className="text-sm text-destructive">{formErrors.timeOfDay}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Select the exact time when the expense should be added
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="totalOccurrences">Total Occurrences *</Label>
                    <Select 
                      value={formData.totalOccurrences} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, totalOccurrences: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select occurrences" />
                      </SelectTrigger>
                      <SelectContent>
                        {occurrenceOptions.map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} {num === 1 ? 'month' : 'months'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors.totalOccurrences && (
                      <p className="text-sm text-destructive">{formErrors.totalOccurrences}</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter description for the recurring expense"
                    rows={3}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={editingExpense ? updateRecurringExpense : createRecurringExpense}
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : (editingExpense ? 'Update' : 'Create')}
                  </Button>
                  <Button variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Add Button and Manual Trigger */}
          {!showAddForm && (
            <div className="space-y-3">
              <Button 
                onClick={() => setShowAddForm(true)}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Recurring Expense
              </Button>
              
              <Button 
                onClick={handleManualTrigger}
                variant="outline"
                className="w-full"
                disabled={loading}
              >
                <Play className="h-4 w-4 mr-2" />
                {loading ? 'Processing...' : 'Process Recurring Expenses Now'}
              </Button>
            </div>
          )}
          
          {/* Recurring Expenses List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Active Recurring Expenses</h3>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading...</p>
              </div>
            ) : recurringExpenses.length === 0 ? (
              <div className="text-center py-8">
                <Repeat className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No recurring expenses found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create your first recurring expense to automate monthly payments
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recurringExpenses.map((expense) => (
                  <Card key={expense.id} className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="flex items-center gap-1">
                              <span className="text-xs">{getCategoryIcon(expense.category)}</span>
                              <span>{expense.category}</span>
                            </Badge>
                            <Badge variant={expense.is_active ? "default" : "secondary"}>
                              {expense.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">₹{expense.amount.toLocaleString()}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>Day {expense.day_of_month} at {expense.time_of_day}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>{expense.remaining_occurrences}/{expense.total_occurrences} left</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {expense.remaining_occurrences > 0 ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-orange-500" />
                              )}
                              <span className="text-xs">
                                {expense.remaining_occurrences > 0 ? 'Scheduled' : 'Completed'}
                              </span>
                            </div>
                          </div>
                          
                          {expense.description && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {expense.description}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEditing(expense)}
                            disabled={!expense.is_active}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteRecurringExpense(expense.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
