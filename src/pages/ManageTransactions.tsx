import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash, Trash2, Edit, Search, ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EditExpenseForm } from '@/components/EditExpenseForm';
import EditCreditForm from '@/components/EditCreditForm';
import { AuthForm } from '@/components/AuthForm';
import { useAuth } from '@/hooks/useAuth';
import { useExpenses, Expense as ExpenseType } from '@/hooks/useExpenses';
import { useCredits, Credit as CreditType } from '@/hooks/useCredits';
import { useCategories } from '@/hooks/useCategories';
import { getIconByCategoryName } from '@/data/categoryIcons';
import { formatCurrencyInIST, formatDateInIST, getMonthYearInIST } from '@/lib/dateUtils';
import heroImage from '@/assets/hero-bg.jpg';

interface Transaction {
  id: string;
  type: 'expense' | 'credit';
  category: string;
  amount: number;
  description: string;
  date: string;
  created_at: string;
}

const transactionsPerPage = 50;

const ManageTransactions = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { expenses, loading: expensesLoading, deleteExpense, updateExpense } = useExpenses(user?.id);
  const { credits, loading: creditsLoading, deleteCredit, updateCredit, fetchCredits } = useCredits(user?.id);
  const { categories } = useCategories(user?.id);

  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<ExpenseType | null>(null);
  const [deleteCreditId, setDeleteCreditId] = useState<string | null>(null);
  const [editingCredit, setEditingCredit] = useState<CreditType | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [manageExpenseLoading, setManageExpenseLoading] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);

  const [manageExpenseFilter, setManageExpenseFilter] = useState<{
    selectedMonths: string[];
    year: string;
    entryType: 'all' | 'expenses' | 'credits';
    category: string;
  }>(
    {
      selectedMonths: [getMonthYearInIST().monthYear],
      year: getMonthYearInIST().year,
      entryType: 'all',
      category: 'all'
    }
  );

  const pageLoading = authLoading || expensesLoading || creditsLoading;

  const getCategoryIcon = useCallback((categoryName: string): string => {
    const category = categories.find(cat => cat.name === categoryName);
    return category?.icon || getIconByCategoryName(categoryName) || '💼';
  }, [categories]);

  const combinedTransactions = useMemo(() => {
    const expenseTransactions: Transaction[] = expenses.map(expense => ({
      id: expense.id,
      type: 'expense',
      category: expense.category,
      amount: expense.amount,
      description: expense.description,
      date: expense.date,
      created_at: expense.created_at
    }));

    const creditTransactions: Transaction[] = credits.map(credit => ({
      id: credit.id,
      type: 'credit',
      category: credit.category || 'Unassigned',
      amount: credit.amount,
      description: credit.description || '',
      date: credit.date,
      created_at: credit.created_at
    }));

    return [...expenseTransactions, ...creditTransactions].sort((a, b) => {
      const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateComparison !== 0) return dateComparison;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [expenses, credits]);

  const availableCategories = useMemo(() => {
    const uniqueCategories = new Set<string>();
    categories.forEach(cat => uniqueCategories.add(cat.name));
    combinedTransactions.forEach(transaction => {
      if (transaction.category) {
        uniqueCategories.add(transaction.category);
      }
    });
    return Array.from(uniqueCategories).sort((a, b) => a.localeCompare(b));
  }, [categories, combinedTransactions]);

  const filterTransactionsByMonths = useCallback((
    selectedMonths: string[],
    entryType: 'all' | 'expenses' | 'credits',
    category: string
  ) => {
    let filtered = combinedTransactions.filter(transaction =>
      selectedMonths.some(month => transaction.date.startsWith(month))
    );

    if (entryType === 'expenses') {
      filtered = filtered.filter(transaction => transaction.type === 'expense');
    } else if (entryType === 'credits') {
      filtered = filtered.filter(transaction => transaction.type === 'credit');
    }

    if (category !== 'all') {
      filtered = filtered.filter(transaction => transaction.category === category);
    }

    setFilteredTransactions(filtered);
    setCurrentPage(1);
    setSelectedTransactions(new Set());
  }, [combinedTransactions]);

  useEffect(() => {
    if (!expensesLoading && !creditsLoading) {
      filterTransactionsByMonths(
        manageExpenseFilter.selectedMonths,
        manageExpenseFilter.entryType,
        manageExpenseFilter.category
      );
    }
  }, [
    combinedTransactions,
    expensesLoading,
    creditsLoading,
    manageExpenseFilter.selectedMonths,
    manageExpenseFilter.entryType,
    manageExpenseFilter.category,
    filterTransactionsByMonths
  ]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / transactionsPerPage));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, filteredTransactions.length]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / transactionsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * transactionsPerPage;
  const endIndex = startIndex + transactionsPerPage;
  const currentPageTransactions = filteredTransactions.slice(startIndex, endIndex);
  const showingStart = filteredTransactions.length === 0 ? 0 : startIndex + 1;
  const showingEnd = filteredTransactions.length === 0 ? 0 : Math.min(endIndex, filteredTransactions.length);

  const handleMonthToggle = (month: string) => {
    const newSelectedMonths = manageExpenseFilter.selectedMonths.includes(month)
      ? manageExpenseFilter.selectedMonths.filter(m => m !== month)
      : [...manageExpenseFilter.selectedMonths, month];

    setManageExpenseFilter(prev => ({
      ...prev,
      selectedMonths: newSelectedMonths
    }));

    filterTransactionsByMonths(newSelectedMonths, manageExpenseFilter.entryType, manageExpenseFilter.category);
  };

  const handleSelectAllMonths = () => {
    const year = manageExpenseFilter.year;
    const allMonths = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);

    const newSelectedMonths = manageExpenseFilter.selectedMonths.length === 12 ? [] : allMonths;

    setManageExpenseFilter(prev => ({
      ...prev,
      selectedMonths: newSelectedMonths
    }));

    filterTransactionsByMonths(newSelectedMonths, manageExpenseFilter.entryType, manageExpenseFilter.category);
  };

  const handleYearChange = (year: string) => {
    if (!year) {
      return;
    }

    const sanitizedYear = year.replace(/[^0-9]/g, '').slice(0, 4);
    if (!sanitizedYear) {
      return;
    }

    const newSelectedMonths = manageExpenseFilter.selectedMonths.map(month => {
      const monthPart = month.split('-')[1];
      return `${sanitizedYear}-${monthPart}`;
    });

    setManageExpenseFilter(prev => ({
      ...prev,
      year: sanitizedYear,
      selectedMonths: newSelectedMonths
    }));

    filterTransactionsByMonths(newSelectedMonths, manageExpenseFilter.entryType, manageExpenseFilter.category);
  };

  const handleEntryTypeChange = (entryType: 'all' | 'expenses' | 'credits') => {
    setManageExpenseFilter(prev => ({
      ...prev,
      entryType
    }));

    filterTransactionsByMonths(manageExpenseFilter.selectedMonths, entryType, manageExpenseFilter.category);
  };

  const handleCategoryChange = (category: string) => {
    setManageExpenseFilter(prev => ({
      ...prev,
      category
    }));

    filterTransactionsByMonths(manageExpenseFilter.selectedMonths, manageExpenseFilter.entryType, category);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedTransactions(new Set());
  };

  const handlePreviousPage = () => {
    if (safeCurrentPage > 1) {
      handlePageChange(safeCurrentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (safeCurrentPage < totalPages) {
      handlePageChange(safeCurrentPage + 1);
    }
  };

  const handleSelectTransaction = (transactionId: string) => {
    setSelectedTransactions(prev => {
      const next = new Set(prev);
      if (next.has(transactionId)) {
        next.delete(transactionId);
      } else {
        next.add(transactionId);
      }
      return next;
    });
  };

  const handleSelectAllTransactions = () => {
    const currentPageIds = currentPageTransactions.map(transaction => transaction.id);
    const allSelected = currentPageIds.every(id => selectedTransactions.has(id));

    if (allSelected) {
      setSelectedTransactions(prev => {
        const next = new Set(prev);
        currentPageIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedTransactions(prev => {
        const next = new Set(prev);
        currentPageIds.forEach(id => next.add(id));
        return next;
      });
    }
  };

  const handleBulkDeleteTransactions = async () => {
    if (selectedTransactions.size === 0) return;

    setManageExpenseLoading(true);
    try {
      for (const transactionId of selectedTransactions) {
        const transaction = filteredTransactions.find(t => t.id === transactionId);
        if (!transaction) continue;

        if (transaction.type === 'expense') {
          await deleteExpense(transactionId);
        } else {
          await deleteCredit(transactionId);
        }
      }

      setSelectedTransactions(new Set());
      filterTransactionsByMonths(manageExpenseFilter.selectedMonths, manageExpenseFilter.entryType, manageExpenseFilter.category);
      setShowBulkDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting transactions:', error);
    } finally {
      setManageExpenseLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-secondary to-accent">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-surface" />

      <div className="relative z-10 p-3 sm:p-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-white">Manage Transactions</h1>
            <p className="text-sm text-white/70 mt-1">
              Review, edit, or delete expenses and credits across months.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/')}
            className="glass-button border-white/30 text-white hover:bg-white/10 w-full sm:w-auto justify-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <Card className="glass-card p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4 sm:mb-6">
            <Trash className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <h2 className="text-lg sm:text-xl font-heading font-semibold text-white">Transaction Controls</h2>
          </div>

          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
                <Label htmlFor="expense-year-filter" className="text-white text-sm font-medium">
                  Year:
                </Label>
                <Input
                  id="expense-year-filter"
                  type="number"
                  value={manageExpenseFilter.year}
                  onChange={(e) => handleYearChange(e.target.value)}
                  className="bg-white/10 border-white/20 text-white w-full sm:w-24"
                  min="2020"
                  max="2035"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
                <Label htmlFor="entry-type-filter" className="text-white text-sm font-medium">
                  Type:
                </Label>
                <Select value={manageExpenseFilter.entryType} onValueChange={handleEntryTypeChange}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white w-full sm:w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/20 text-white">
                    <SelectItem value="all" className="hover:bg-white/10">All</SelectItem>
                    <SelectItem value="expenses" className="hover:bg-white/10">Expenses</SelectItem>
                    <SelectItem value="credits" className="hover:bg-white/10">Credits</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
                <Label htmlFor="category-filter" className="text-white text-sm font-medium">
                  Category:
                </Label>
                <Select value={manageExpenseFilter.category} onValueChange={handleCategoryChange}>
                  <SelectTrigger id="category-filter" className="bg-white/10 border-white/20 text-white w-full sm:w-48">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/20 text-white max-h-60 overflow-y-auto">
                    <SelectItem value="all" className="hover:bg-white/10">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📂</span>
                        <span>All Categories</span>
                      </div>
                    </SelectItem>
                    {availableCategories.map(categoryName => {
                      const icon = getCategoryIcon(categoryName);
                      return (
                        <SelectItem key={categoryName} value={categoryName} className="hover:bg-white/10">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{icon}</span>
                            <span>{categoryName}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <Label className="text-white text-sm font-medium">
                  Select Months:
                </Label>
                <Button
                  onClick={handleSelectAllMonths}
                  size="sm"
                  className="glass-button bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/30 w-full sm:w-auto justify-center"
                >
                  {manageExpenseFilter.selectedMonths.length === 12 ? 'Deselect All' : 'Select All'}
                </Button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {Array.from({ length: 12 }, (_, i) => {
                  const month = String(i + 1).padStart(2, '0');
                  const monthYear = `${manageExpenseFilter.year}-${month}`;
                  const monthName = formatDateInIST(new Date(parseInt(manageExpenseFilter.year, 10), i), { month: 'short' });
                  const isSelected = manageExpenseFilter.selectedMonths.includes(monthYear);

                  return (
                    <button
                      key={monthYear}
                      onClick={() => handleMonthToggle(monthYear)}
                      className={`p-2 rounded-lg text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-primary text-white border-2 border-primary'
                          : 'bg-white/10 text-white border-2 border-white/20 hover:bg-white/20'
                      }`}
                    >
                      {monthName}
                    </button>
                  );
                })}
              </div>

              <div className="text-xs text-muted-foreground">
                Selected: {manageExpenseFilter.selectedMonths.length} month(s)
              </div>
            </div>
          </div>

          {filteredTransactions.length > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4 p-3 bg-white/5 rounded-lg">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={currentPageTransactions.length > 0 && currentPageTransactions.every(t => selectedTransactions.has(t.id))}
                  onChange={handleSelectAllTransactions}
                  className="w-4 h-4 text-primary bg-white/10 border-white/20 rounded focus:ring-primary"
                />
                <span className="text-sm text-white">
                  Select All on Page ({selectedTransactions.size} selected total)
                </span>
              </div>

              {selectedTransactions.size > 0 && (
                <Button
                  onClick={() => setShowBulkDeleteConfirm(true)}
                  disabled={manageExpenseLoading}
                  className="glass-button bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30 w-full sm:w-auto"
                >
                  {manageExpenseLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
                      Deleting...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Trash className="h-4 w-4" />
                      Delete Selected ({selectedTransactions.size})
                    </div>
                  )}
                </Button>
              )}
            </div>
          )}

          {pageLoading && filteredTransactions.length === 0 ? (
            <div className="text-center py-10 text-white/70">Loading transactions...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No transactions found for {manageExpenseFilter.selectedMonths.length} selected month(s)
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Try selecting different months, year, or entry type
              </p>
            </div>
          ) : (
            <>
              <div className="block sm:hidden space-y-3">
                {currentPageTransactions.map((transaction) => (
                  <Card key={transaction.id} className="glass-card p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedTransactions.has(transaction.id)}
                          onChange={() => handleSelectTransaction(transaction.id)}
                          className="w-4 h-4 text-primary bg-white/10 border-white/20 rounded focus:ring-primary mt-1"
                        />
                        <div>
                          <Badge
                            variant="secondary"
                            className={`${
                              transaction.type === 'expense'
                                ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                : 'bg-green-500/20 text-green-400 border-green-500/30'
                            }`}
                          >
                            {transaction.type === 'expense' ? 'Expense' : 'Credit'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => {
                            if (transaction.type === 'expense') {
                              setEditingExpense(transaction as ExpenseType);
                            } else {
                              setEditingCredit(transaction as CreditType);
                            }
                          }}
                          size="sm"
                          className="glass-button bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/30 p-2"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => {
                            if (transaction.type === 'expense') {
                              setDeleteExpenseId(transaction.id);
                            } else {
                              setDeleteCreditId(transaction.id);
                            }
                          }}
                          size="sm"
                          className="glass-button bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30 p-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/70">Date</span>
                        <span className="text-sm text-white">
                          {formatDateInIST(transaction.date, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/70">Category</span>
                        <Badge variant="secondary" className="bg-white/10 text-white border-white/20 flex items-center gap-2">
                          <span className="text-sm">{getCategoryIcon(transaction.category)}</span>
                          <span className="text-sm">{transaction.category}</span>
                        </Badge>
                      </div>

                      <div className="flex items-start justify-between">
                        <span className="text-xs text-white/70">Description</span>
                        <span className="text-sm text-white text-right max-w-[60%] break-words">
                          {transaction.description || '—'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/10">
                        <span className="text-sm font-medium text-white">Amount</span>
                        <span className={`text-lg font-bold ${
                          transaction.type === 'expense' ? 'text-orange-400' : 'text-green-400'
                        }`}>
                          {transaction.type === 'expense' ? '-' : '+'}₹{formatCurrencyInIST(transaction.amount)}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left p-3 text-sm font-medium text-white w-12">
                        <input
                          type="checkbox"
                          checked={currentPageTransactions.length > 0 && currentPageTransactions.every(t => selectedTransactions.has(t.id))}
                          onChange={handleSelectAllTransactions}
                          className="w-4 h-4 text-primary bg-white/10 border-white/20 rounded focus:ring-primary"
                        />
                      </th>
                      <th className="text-left p-3 text-sm font-medium text-white">Type</th>
                      <th className="text-left p-3 text-sm font-medium text-white">Date</th>
                      <th className="text-left p-3 text-sm font-medium text-white">Category</th>
                      <th className="text-left p-3 text-sm font-medium text-white">Description</th>
                      <th className="text-right p-3 text-sm font-medium text-white">Amount</th>
                      <th className="text-center p-3 text-sm font-medium text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPageTransactions.map(transaction => (
                      <tr key={transaction.id} className="border-b border-white/10 hover:bg-white/5">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedTransactions.has(transaction.id)}
                            onChange={() => handleSelectTransaction(transaction.id)}
                            className="w-4 h-4 text-primary bg-white/10 border-white/20 rounded focus:ring-primary"
                          />
                        </td>
                        <td className="p-3">
                          <Badge
                            variant="secondary"
                            className={`${
                              transaction.type === 'expense'
                                ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                : 'bg-green-500/20 text-green-400 border-green-500/30'
                            }`}
                          >
                            {transaction.type === 'expense' ? 'Expense' : 'Credit'}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm text-white">
                          {formatDateInIST(transaction.date, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </td>
                        <td className="p-3 text-sm text-white">
                          <Badge variant="secondary" className="bg-white/10 text-white border-white/20 flex items-center gap-2">
                            <span className="text-sm">{getCategoryIcon(transaction.category)}</span>
                            <span>{transaction.category}</span>
                          </Badge>
                        </td>
                        <td className="p-3 text-sm text-white max-w-xs truncate">
                          {transaction.description || '—'}
                        </td>
                        <td className={`p-3 text-sm text-right font-semibold ${
                          transaction.type === 'expense' ? 'text-orange-400' : 'text-green-400'
                        }`}>
                          {transaction.type === 'expense' ? '-' : '+'}₹{formatCurrencyInIST(transaction.amount)}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              onClick={() => {
                                if (transaction.type === 'expense') {
                                  setEditingExpense(transaction as ExpenseType);
                                } else {
                                  setEditingCredit(transaction as CreditType);
                                }
                              }}
                              size="sm"
                              className="glass-button bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/30"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              onClick={() => {
                                if (transaction.type === 'expense') {
                                  setDeleteExpenseId(transaction.id);
                                } else {
                                  setDeleteCreditId(transaction.id);
                                }
                              }}
                              size="sm"
                              className="glass-button bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-white/20 bg-white/5">
                      <td colSpan={5} className="p-3 text-sm font-bold text-white">
                        Page {safeCurrentPage} of {totalPages} - Total: {filteredTransactions.length} transactions
                      </td>
                      <td className="p-3 text-sm text-right font-bold">
                        <div className="space-y-1">
                          <div className="text-orange-400">
                            Expenses: -₹{formatCurrencyInIST(filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0))}
                          </div>
                          <div className="text-green-400">
                            Credits: +₹{formatCurrencyInIST(filteredTransactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0))}
                          </div>
                          <div className="text-white border-t border-white/20 pt-1">
                            Net: {(() => {
                              const expenseTotal = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
                              const creditTotal = filteredTransactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
                              const net = creditTotal - expenseTotal;
                              return net >= 0 ? `+₹${formatCurrencyInIST(net)}` : `-₹${formatCurrencyInIST(Math.abs(net))}`;
                            })()}
                          </div>
                        </div>
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="block sm:hidden mt-4 p-4 bg-white/5 rounded-lg">
                <div className="space-y-2">
                  <div className="text-center text-sm text-white/70 mb-3">
                    Page {safeCurrentPage} of {totalPages} - Total: {filteredTransactions.length} transactions
                  </div>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-orange-400">Expenses:</span>
                      <span className="text-orange-400 font-semibold">
                        -₹{formatCurrencyInIST(filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-400">Credits:</span>
                      <span className="text-green-400 font-semibold">
                        +₹{formatCurrencyInIST(filteredTransactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0))}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-white/20">
                      <span className="text-white font-medium">Net:</span>
                      <span className="text-white font-bold">
                        {(() => {
                          const expenseTotal = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
                          const creditTotal = filteredTransactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
                          const net = creditTotal - expenseTotal;
                          return net >= 0 ? `+₹${formatCurrencyInIST(net)}` : `-₹${formatCurrencyInIST(Math.abs(net))}`;
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {filteredTransactions.length > 0 && (
            <div className="mt-6">
              <div className="text-center text-sm text-white/70 mb-4">
                Showing {showingStart} to {showingEnd} of {filteredTransactions.length} transactions
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handlePreviousPage}
                    disabled={safeCurrentPage === 1}
                    size="sm"
                    className="glass-button bg-white/10 hover:bg-white/20 text-white border-white/20 disabled:opacity-50 px-4 py-2"
                  >
                    Previous
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (safeCurrentPage <= 3) {
                        pageNum = i + 1;
                      } else if (safeCurrentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = safeCurrentPage - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          size="sm"
                          className={`glass-button ${
                            safeCurrentPage === pageNum
                              ? 'bg-primary text-white border-primary'
                              : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                          } px-3 py-2`}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    onClick={handleNextPage}
                    disabled={safeCurrentPage === totalPages}
                    size="sm"
                    className="glass-button bg-white/10 hover:bg-white/20 text-white border-white/20 disabled:opacity-50 px-4 py-2"
                  >
                    Next
                  </Button>
                </div>

                <div className="text-sm text-white/70 sm:hidden">
                  Page {safeCurrentPage} of {totalPages}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      <ConfirmDialog
        isOpen={!!deleteExpenseId}
        onClose={() => setDeleteExpenseId(null)}
        onConfirm={async () => {
          if (deleteExpenseId) {
            await deleteExpense(deleteExpenseId);
            setDeleteExpenseId(null);
            filterTransactionsByMonths(manageExpenseFilter.selectedMonths, manageExpenseFilter.entryType, manageExpenseFilter.category);
          }
        }}
        title="Delete Expense"
        message="Are you sure you want to delete this expense? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={!!deleteCreditId}
        onClose={() => setDeleteCreditId(null)}
        onConfirm={async () => {
          if (deleteCreditId) {
            await deleteCredit(deleteCreditId);
            await fetchCredits();
            setDeleteCreditId(null);
            filterTransactionsByMonths(manageExpenseFilter.selectedMonths, manageExpenseFilter.entryType, manageExpenseFilter.category);
          }
        }}
        title="Delete Credit"
        message="Are you sure you want to delete this credit? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
  onConfirm={handleBulkDeleteTransactions}
        title="Delete Selected Transactions"
        message={`Are you sure you want to delete ${selectedTransactions.size} selected transactions? This action cannot be undone.`}
        confirmText="Delete All"
        cancelText="Cancel"
        variant="danger"
      />

      {editingExpense && (
        <EditExpenseForm
          expense={editingExpense}
          onUpdateExpense={async (expenseId, expense) => {
            await updateExpense(expenseId, expense);
            filterTransactionsByMonths(manageExpenseFilter.selectedMonths, manageExpenseFilter.entryType, manageExpenseFilter.category);
          }}
          onClose={() => setEditingExpense(null)}
        />
      )}

      {editingCredit && (
        <EditCreditForm
          credit={editingCredit}
          onUpdateCredit={async (creditId, credit) => {
            await updateCredit(creditId, credit);
            await fetchCredits();
            filterTransactionsByMonths(manageExpenseFilter.selectedMonths, manageExpenseFilter.entryType, manageExpenseFilter.category);
          }}
          onClose={() => setEditingCredit(null)}
        />
      )}
    </div>
  );
};

export default ManageTransactions;
