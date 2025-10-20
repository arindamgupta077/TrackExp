import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, CreditCard, Edit, Trash2, DollarSign, Calendar, AlertTriangle, CheckSquare, Square, Plus } from 'lucide-react';
import { formatCurrencyInIST, formatDateInIST } from '@/lib/dateUtils';
import { CreditCardExpense } from '@/hooks/useCreditCardExpenses';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { getIconByCategoryName } from '@/data/categoryIcons';

interface CreditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  creditCardExpenses: CreditCardExpense[];
  categories: Array<{ id: string; name: string }>;
  onDeleteCreditCardExpense: (expenseId: string) => void;
  onUpdateCreditCardExpense: (expenseId: string, expense: { category: string; amount: number; description: string; date: string }) => void;
  onPayCreditCardDue: (expenseId: string) => void;
  onBulkPayCreditCardDues: (expenseIds: string[]) => void;
  onAddCreditCardExpense: (expense: { category: string; amount: number; description: string; date: string }) => void;
}

export const CreditCardModal = ({ 
  isOpen, 
  onClose, 
  creditCardExpenses, 
  categories,
  onDeleteCreditCardExpense, 
  onUpdateCreditCardExpense,
  onPayCreditCardDue,
  onBulkPayCreditCardDues,
  onAddCreditCardExpense
}: CreditCardModalProps) => {
  // Helper function to get category icon
  const getCategoryIcon = (categoryName: string): string => {
    const category = categories.find(cat => cat.name === categoryName);
    return category?.icon || getIconByCategoryName(categoryName);
  };

  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<CreditCardExpense | null>(null);
  const [payDueExpenseId, setPayDueExpenseId] = useState<string | null>(null);
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());
  const [showBulkPayConfirm, setShowBulkPayConfirm] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormData, setAddFormData] = useState({
    category: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0] // Today's date
  });
  const [addFormLoading, setAddFormLoading] = useState(false);
  const [editFormData, setEditFormData] = useState({
    category: '',
    amount: '',
    description: '',
    date: ''
  });
  const [editFormLoading, setEditFormLoading] = useState(false);

  if (!isOpen) return null;

  // Calculate total credit card debt
  const totalDebt = creditCardExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  // Calculate selected expenses total
  const selectedTotal = creditCardExpenses
    .filter(expense => selectedExpenses.has(expense.id))
    .reduce((sum, expense) => sum + expense.amount, 0);

  // Helper functions for bulk selection
  const handleSelectExpense = (expenseId: string) => {
    const newSelected = new Set(selectedExpenses);
    if (newSelected.has(expenseId)) {
      newSelected.delete(expenseId);
    } else {
      newSelected.add(expenseId);
    }
    setSelectedExpenses(newSelected);
  };

  const handleSelectAllExpenses = () => {
    if (selectedExpenses.size === creditCardExpenses.length) {
      setSelectedExpenses(new Set());
    } else {
      setSelectedExpenses(new Set(creditCardExpenses.map(expense => expense.id)));
    }
  };

  const handleBulkPayDues = () => {
    const selectedIds = Array.from(selectedExpenses);
    onBulkPayCreditCardDues(selectedIds);
    setSelectedExpenses(new Set());
    setShowBulkPayConfirm(false);
  };

  const handleAddFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddFormLoading(true);

    try {
      const amount = parseFloat(addFormData.amount);
      
      if (!addFormData.category || !amount || amount <= 0) {
        throw new Error('Please fill in all required fields with valid values');
      }

      await onAddCreditCardExpense({
        category: addFormData.category,
        amount: amount,
        description: addFormData.description,
        date: addFormData.date
      });

      // Reset form
      setAddFormData({
        category: '',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding credit card expense:', error);
    } finally {
      setAddFormLoading(false);
    }
  };

  const updateAddFormField = (field: string, value: string) => {
    setAddFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEditFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    
    setEditFormLoading(true);

    try {
      const amount = parseFloat(editFormData.amount);
      
      if (!editFormData.category || !amount || amount <= 0) {
        throw new Error('Please fill in all required fields with valid values');
      }

      await onUpdateCreditCardExpense(editingExpense.id, {
        category: editFormData.category,
        amount: amount,
        description: editFormData.description,
        date: editFormData.date
      });

      setEditingExpense(null);
    } catch (error) {
      console.error('Error updating credit card expense:', error);
    } finally {
      setEditFormLoading(false);
    }
  };

  const updateEditFormField = (field: string, value: string) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
  };

  // Initialize edit form when editingExpense changes
  const initializeEditForm = (expense: CreditCardExpense) => {
    setEditFormData({
      category: expense.category,
      amount: expense.amount.toString(),
      description: expense.description,
      date: expense.date
    });
  };

  // Get recent expenses (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoString = thirtyDaysAgo.toISOString().split('T')[0];
   
  const recentExpenses = creditCardExpenses
    .filter(expense => expense.date >= thirtyDaysAgoString)
    .sort((a, b) => {
      // First sort by date (newest first)
      const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateComparison !== 0) return dateComparison;
       
      // If dates are the same, sort by created_at timestamp (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
      <Card className="glass-card p-3 sm:p-4 lg:p-6 w-full max-w-4xl border-white/20 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-2 sm:pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg lg:text-xl text-white flex items-center gap-1 sm:gap-2">
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Credit Card Expenses</span>
              <span className="sm:hidden">Credit Card</span>
            </CardTitle>
            <div className="flex items-center gap-1 sm:gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowAddForm(true)}
                className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border-green-500/30 h-7 sm:h-8 px-2 sm:px-3"
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">Add New</span>
                <span className="sm:hidden">Add</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClose}
                className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-white/10"
              >
                <X className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6 pt-0">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Card className="glass-card p-3 sm:p-4 border-white/10">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 flex-shrink-0">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground">Total Credit Card Debt</p>
                  <p className="text-lg sm:text-xl font-bold text-red-400">₹{formatCurrencyInIST(totalDebt)}</p>
                </div>
              </div>
            </Card>

            <Card className="glass-card p-3 sm:p-4 border-white/10">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 flex-shrink-0">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground">Recent Expenses (30 days)</p>
                  <p className="text-lg sm:text-xl font-bold text-orange-400">{recentExpenses.length}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Debt Warning */}
          {totalDebt > 0 && (
            <div className="p-3 sm:p-4 rounded-lg bg-red-500/20 border border-red-500/30">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-400 flex-shrink-0" />
                <span className="text-xs sm:text-sm text-red-400 font-medium">Outstanding Credit Card Debt</span>
              </div>
              <p className="text-xs sm:text-sm text-red-300 mt-1 leading-relaxed">
                You have ₹{formatCurrencyInIST(totalDebt)} in outstanding credit card debt. 
                Consider paying off your dues to avoid interest charges.
              </p>
            </div>
          )}

          {/* Bulk Payment Controls */}
          {creditCardExpenses.length > 0 && (
            <div className="p-3 sm:p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAllExpenses}
                    className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-white/10"
                  >
                    {selectedExpenses.size === creditCardExpenses.length ? (
                      <CheckSquare className="h-3 w-3 sm:h-4 sm:w-4 text-green-400" />
                    ) : (
                      <Square className="h-3 w-3 sm:h-4 sm:w-4 text-white/60" />
                    )}
                  </Button>
                  <span className="text-xs sm:text-sm text-white">
                    {selectedExpenses.size === creditCardExpenses.length ? 'Deselect All' : 'Select All'}
                  </span>
                </div>
                
                {selectedExpenses.size > 0 && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <div className="text-left sm:text-right">
                      <p className="text-xs sm:text-sm text-white">
                        {selectedExpenses.size} selected
                      </p>
                      <p className="text-base sm:text-lg font-bold text-red-400">
                        ₹{formatCurrencyInIST(selectedTotal)}
                      </p>
                    </div>
                    <Button
                      onClick={() => setShowBulkPayConfirm(true)}
                      className="bg-green-500 hover:bg-green-600 text-white px-3 sm:px-4 py-2 text-xs sm:text-sm"
                    >
                      <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Pay Selected ({selectedExpenses.size})</span>
                      <span className="sm:hidden">Pay ({selectedExpenses.size})</span>
                    </Button>
                  </div>
                )}
              </div>
              
              {selectedExpenses.size > 0 && (
                <div className="text-xs text-white/70 leading-relaxed">
                  Selected expenses will be moved to regular expenses and credit card dues will be cleared.
                </div>
              )}
            </div>
          )}

          {/* Credit Card Expenses List */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Recent Credit Card Expenses</h3>
            
            {creditCardExpenses.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <div className="p-3 sm:p-4 rounded-full bg-muted/20 w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                  <CreditCard className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-xs sm:text-sm px-4">No credit card expenses yet. Add your first credit card expense!</p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3 max-h-80 sm:max-h-96 overflow-y-auto pr-1 sm:pr-2">
                {creditCardExpenses.map((expense, index) => (
                  <div 
                    key={expense.id}
                    className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-white/5 border border-white/10 hover-lift"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSelectExpense(expense.id)}
                        className="h-5 w-5 sm:h-6 sm:w-6 p-0 hover:bg-white/10 flex-shrink-0"
                      >
                        {selectedExpenses.has(expense.id) ? (
                          <CheckSquare className="h-3 w-3 sm:h-4 sm:w-4 text-green-400" />
                        ) : (
                          <Square className="h-3 w-3 sm:h-4 sm:w-4 text-white/60" />
                        )}
                      </Button>
                      <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-r from-red-500 to-pink-500 flex-shrink-0">
                        <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-xs sm:text-sm lg:text-base truncate">{expense.description}</p>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-1">
                          <Badge variant="secondary" className="bg-white/10 text-white border-white/20 text-xs w-fit flex items-center gap-1">
                            <span className="text-xs">{getCategoryIcon(expense.category)}</span>
                            <span>{expense.category}</span>
                          </Badge>
                          <span className="text-xs text-muted-foreground">{expense.date}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-sm sm:text-base lg:text-lg text-red-400">₹{formatCurrencyInIST(expense.amount)}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPayDueExpenseId(expense.id)}
                          className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-green-500/20 hover:text-green-400 transition-colors"
                          title="Pay due"
                        >
                          <DollarSign className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingExpense(expense);
                            initializeEditForm(expense);
                          }}
                          className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-blue-500/20 hover:text-blue-400 transition-colors"
                          title="Edit expense"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteExpenseId(expense.id)}
                          className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                          title="Delete expense"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Close Button */}
          <div className="flex justify-end pt-4">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="px-6 border-white/20 bg-white/10 text-white hover:bg-white/20"
            >
              Close
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteExpenseId}
        onClose={() => setDeleteExpenseId(null)}
        onConfirm={() => {
          if (deleteExpenseId) {
            onDeleteCreditCardExpense(deleteExpenseId);
            setDeleteExpenseId(null);
          }
        }}
        title="Delete Credit Card Expense"
        message="Are you sure you want to delete this credit card expense? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Pay Due Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!payDueExpenseId}
        onClose={() => setPayDueExpenseId(null)}
        onConfirm={() => {
          if (payDueExpenseId) {
            onPayCreditCardDue(payDueExpenseId);
            setPayDueExpenseId(null);
          }
        }}
        title="Pay Credit Card Due"
        message="Are you sure you want to pay this credit card due? This will move the expense to your regular expenses and clear the credit card debt."
        confirmText="Pay Due"
        cancelText="Cancel"
        variant="default"
      />

      {/* Bulk Pay Dues Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showBulkPayConfirm}
        onClose={() => setShowBulkPayConfirm(false)}
        onConfirm={handleBulkPayDues}
        title="Pay Selected Credit Card Dues"
        message={`Are you sure you want to pay ${selectedExpenses.size} selected credit card dues totaling ₹${formatCurrencyInIST(selectedTotal)}? This will move all selected expenses to your regular expenses and clear the credit card debts.`}
        confirmText={`Pay All (₹${formatCurrencyInIST(selectedTotal)})`}
        cancelText="Cancel"
        variant="default"
      />

      {/* Add New Credit Card Expense Form */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-60">
          <Card className="glass-card p-3 sm:p-4 lg:p-6 w-full max-w-sm sm:max-w-md border-white/20 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <CardHeader className="pb-2 sm:pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg lg:text-xl text-white flex items-center gap-1 sm:gap-2">
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Add Credit Card Expense</span>
                  <span className="sm:hidden">Add Expense</span>
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowAddForm(false)}
                  className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-white/10"
                >
                  <X className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
              <form onSubmit={handleAddFormSubmit} className="space-y-3 sm:space-y-4">
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="add-category" className="text-white text-xs sm:text-sm">Category</Label>
                  <Select value={addFormData.category} onValueChange={(value) => updateAddFormField('category', value)}>
                    <SelectTrigger className="h-9 sm:h-10 bg-white/10 border-white/20 text-white text-sm">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="add-amount" className="text-white text-xs sm:text-sm">Amount (₹)</Label>
                  <Input
                    id="add-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={addFormData.amount}
                    onChange={(e) => updateAddFormField('amount', e.target.value)}
                    className="h-9 sm:h-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 text-sm"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="add-description" className="text-white text-xs sm:text-sm">Description</Label>
                  <Input
                    id="add-description"
                    type="text"
                    value={addFormData.description}
                    onChange={(e) => updateAddFormField('description', e.target.value)}
                    className="h-9 sm:h-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 text-sm"
                    placeholder="Brief description (optional)"
                  />
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="add-date" className="text-white text-xs sm:text-sm">Date</Label>
                  <Input
                    id="add-date"
                    type="date"
                    value={addFormData.date}
                    onChange={(e) => updateAddFormField('date', e.target.value)}
                    className="h-9 sm:h-10 bg-white/10 border-white/20 text-white text-sm"
                    required
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 pt-3 sm:pt-4">
                  <Button 
                    type="submit" 
                    disabled={addFormLoading}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm py-2 sm:py-2.5"
                  >
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    {addFormLoading ? 'Adding...' : 'Add Expense'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowAddForm(false)}
                    className="px-4 sm:px-6 border-white/20 bg-white/10 text-white hover:bg-white/20 text-sm py-2 sm:py-2.5"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Expense Form */}
      {editingExpense && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-60">
          <Card className="glass-card p-3 sm:p-4 lg:p-6 w-full max-w-sm sm:max-w-md border-white/20 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <CardHeader className="pb-2 sm:pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg lg:text-xl text-white flex items-center gap-1 sm:gap-2">
                  <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Edit Credit Card Expense</span>
                  <span className="sm:hidden">Edit Expense</span>
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setEditingExpense(null)}
                  className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-white/10"
                >
                  <X className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
              <form onSubmit={handleEditFormSubmit} className="space-y-3 sm:space-y-4">
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="edit-category" className="text-white text-xs sm:text-sm">Category</Label>
                  <Select value={editFormData.category} onValueChange={(value) => updateEditFormField('category', value)}>
                    <SelectTrigger className="h-9 sm:h-10 bg-white/10 border-white/20 text-white text-sm">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="edit-amount" className="text-white text-xs sm:text-sm">Amount (₹)</Label>
                  <Input
                    id="edit-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editFormData.amount}
                    onChange={(e) => updateEditFormField('amount', e.target.value)}
                    className="h-9 sm:h-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 text-sm"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="edit-description" className="text-white text-xs sm:text-sm">Description</Label>
                  <Input
                    id="edit-description"
                    type="text"
                    value={editFormData.description}
                    onChange={(e) => updateEditFormField('description', e.target.value)}
                    className="h-9 sm:h-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 text-sm"
                    placeholder="Brief description (optional)"
                  />
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="edit-date" className="text-white text-xs sm:text-sm">Date</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={editFormData.date}
                    onChange={(e) => updateEditFormField('date', e.target.value)}
                    className="h-9 sm:h-10 bg-white/10 border-white/20 text-white text-sm"
                    required
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 pt-3 sm:pt-4">
                  <Button 
                    type="submit" 
                    disabled={editFormLoading}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm py-2 sm:py-2.5"
                  >
                    <Edit className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    {editFormLoading ? 'Updating...' : 'Update Expense'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setEditingExpense(null)}
                    className="px-4 sm:px-6 border-white/20 bg-white/10 text-white hover:bg-white/20 text-sm py-2 sm:py-2.5"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
