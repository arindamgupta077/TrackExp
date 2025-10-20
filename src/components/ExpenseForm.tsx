import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus, Calendar, Settings2, AlertTriangle, DollarSign, Upload, FileSpreadsheet, Calculator } from 'lucide-react';
import { expenseSchema } from '@/lib/validations';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories'
import { getIconByCategoryName } from '@/data/categoryIcons';
import { useBudgets, BudgetWithCarryover } from '@/hooks/useBudgets';
import { useMonthlyRemainingBalances } from '@/hooks/useMonthlyRemainingBalances';
import { useToast } from '@/hooks/use-toast';
import { getCurrentDateStringInIST, formatCurrencyInIST } from '@/lib/dateUtils';
import { Calculator as CalculatorComponent } from '@/components/Calculator';

interface ExpenseFormProps {
  onAddExpense: (expense: { paymentMethod: string; category: string; amount: number; description: string; date: string }) => void;
  onClose: () => void;
  creditCardExpenses?: Array<{ category: string; amount: number }>;
  monthlyBalances?: Array<{ category_name: string; january: number; february: number; march: number; april: number; may: number; june: number; july: number; august: number; september: number; october: number; november: number; december: number }>;
}

interface FormErrors {
  category?: string;
  amount?: string;
  description?: string;
  date?: string;
  general?: string;
}

type WorksheetCell = string | number | Date | null | undefined;
type WorksheetRow = WorksheetCell[];

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

const ExpenseForm = ({ onAddExpense, onClose, creditCardExpenses = [], monthlyBalances = [] }: ExpenseFormProps) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState({
    paymentMethod: 'cash', // Default to cash
    category: '',
    amount: '',
    description: '',
    date: getCurrentDateStringInIST() // Today's date in IST
  });
  const { user } = useAuth();
  const { categories, loading: categoriesLoading, refetch } = useCategories(user?.id);
  const { getBudgetWithCarryover } = useBudgets(user?.id);
  const { toast } = useToast();
  
  // Monthly remaining balances for consistent accumulated balance calculation
  const currentYear = new Date().getFullYear();
  const { getAccumulatedTotalForCategory } = useMonthlyRemainingBalances(user?.id, currentYear);
  const [currentBudget, setCurrentBudget] = useState<BudgetWithCarryover | null>(null);

  // Helper function to get category icon
  const getCategoryIcon = (categoryName: string): string => {
    const category = categories.find(cat => cat.name === categoryName);
    return category?.icon || getIconByCategoryName(categoryName);
  };
  const [budgetWarning, setBudgetWarning] = useState<string | null>(null);
  const [creditCardAlert, setCreditCardAlert] = useState<string | null>(null);
  const [budgetOverageAlert, setBudgetOverageAlert] = useState<string | null>(null);
  const [showImportSection, setShowImportSection] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importedExpenses, setImportedExpenses] = useState<Array<{
    category: string;
    amount: number;
    description: string;
    date: string;
    isValid: boolean;
    error?: string;
  }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCalculator, setShowCalculator] = useState(false);

  // Get accumulated balance for a specific category from Monthly Remaining Balances
  const getCategoryAccumulatedBalance = useCallback((categoryName: string) => {
    const categoryData = monthlyBalances.find(balance => balance.category_name === categoryName);
    if (!categoryData) return 0;
    
    // Use the same calculation as Monthly Remaining Balances Total column
    // This includes salary months and ensures consistency across all components
    return getAccumulatedTotalForCategory(categoryData);
  }, [monthlyBalances, getAccumulatedTotalForCategory]);

  // Get credit card due for a specific category
  const getCategoryCreditCardDue = (categoryName: string) => {
    if (!categoryName || creditCardExpenses.length === 0) return 0;
    
    return creditCardExpenses
      .filter(expense => expense.category === categoryName)
      .reduce((sum, expense) => sum + expense.amount, 0);
  };

  // Check credit card overage when category changes
  const checkCreditCardOverage = useCallback((categoryName: string) => {
    if (!categoryName || creditCardExpenses.length === 0) {
      setCreditCardAlert(null);
      return;
    }

    const categoryCreditCardTotal = creditCardExpenses
      .filter(expense => expense.category === categoryName)
      .reduce((sum, expense) => sum + expense.amount, 0);

    if (categoryCreditCardTotal === 0) {
      setCreditCardAlert(null);
      return;
    }

    const accumulatedBalance = getCategoryAccumulatedBalance(categoryName);
    
    if (accumulatedBalance > 0) {
      const overagePercentage = (categoryCreditCardTotal / accumulatedBalance) * 100;
      
      if (overagePercentage >= 100) {
        setCreditCardAlert(`⚠️ Credit card expenses (₹${formatCurrencyInIST(categoryCreditCardTotal)}) have exceeded 100% of accumulated balance (₹${formatCurrencyInIST(accumulatedBalance)}) for this category!`);
      } else if (overagePercentage >= 80) {
        setCreditCardAlert(`⚠️ Credit card expenses (₹${formatCurrencyInIST(categoryCreditCardTotal)}) are at ${overagePercentage.toFixed(1)}% of accumulated balance (₹${formatCurrencyInIST(accumulatedBalance)}) for this category.`);
      } else {
        setCreditCardAlert(null);
      }
    } else {
      setCreditCardAlert(null);
    }
  }, [creditCardExpenses, getCategoryAccumulatedBalance]);

  // Check budget overage and show accumulated balance when category has exceeded 100% of budget
  const checkBudgetOverage = useCallback((budget: BudgetWithCarryover | null, categoryName: string) => {
    if (!budget || !categoryName) {
      setBudgetOverageAlert(null);
      return;
    }

    // Check if current spending has already exceeded 100% of the budget
    const budgetExceededPercentage = (budget.spent_amount / budget.total_budget) * 100;
    
    if (budgetExceededPercentage >= 100) {
      const accumulatedBalance = getCategoryAccumulatedBalance(categoryName);
      const exceededBy = budget.spent_amount - budget.total_budget;
      
      if (accumulatedBalance > 0) {
        setBudgetOverageAlert(`🚨 Budget exceeded by ₹${formatCurrencyInIST(exceededBy)}! Accumulated Balance: ₹${formatCurrencyInIST(accumulatedBalance)}. Don't exceed this limit.`);
      } else {
        setBudgetOverageAlert(`🚨 Budget exceeded by ₹${formatCurrencyInIST(exceededBy)}! No accumulated balance available for this category.`);
      }
    } else {
      setBudgetOverageAlert(null);
    }
  }, [getCategoryAccumulatedBalance]);

  // Check budget when category or date changes
  useEffect(() => {
    const checkBudget = async () => {
      if (!formData.category || !formData.date || !user?.id) {
        setCurrentBudget(null);
        setBudgetWarning(null);
        setCreditCardAlert(null);
        setBudgetOverageAlert(null);
        return;
      }

      try {
        // Find category ID
        const category = categories.find(cat => cat.name === formData.category);
        if (!category) return;

        const monthYear = formData.date.slice(0, 7); // YYYY-MM format
        const budget = await getBudgetWithCarryover(category.id, monthYear);
        setCurrentBudget(budget);

        // Check budget overage and show accumulated balance if budget is exceeded
        checkBudgetOverage(budget, formData.category);

        // Check if this expense would exceed budget
        if (budget && formData.amount) {
          const amount = parseFloat(formData.amount);
          const newTotalSpent = budget.spent_amount + amount;
          
          if (newTotalSpent > budget.total_budget) {
            const exceededBy = newTotalSpent - budget.total_budget;
            setBudgetWarning(`This expense will exceed your budget by ₹${formatCurrencyInIST(exceededBy)}`);
          } else if (newTotalSpent > budget.total_budget * 0.9) {
            setBudgetWarning(`This expense will use ${Math.round((newTotalSpent / budget.total_budget) * 100)}% of your budget`);
          } else {
            setBudgetWarning(null);
          }
        }

        // Check credit card overage for the selected category
        checkCreditCardOverage(formData.category);
      } catch (error) {
        console.error('Error checking budget:', error);
      }
    };

    checkBudget();
  }, [formData.category, formData.date, formData.amount, categories, user?.id, getBudgetWithCarryover, creditCardExpenses, monthlyBalances, checkBudgetOverage, checkCreditCardOverage]);

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

      // Check budget before adding expense (but don't block)
      if (currentBudget && amount) {
        const newTotalSpent = currentBudget.spent_amount + amount;
        if (newTotalSpent > currentBudget.total_budget) {
          const exceededBy = newTotalSpent - currentBudget.total_budget;
          toast({
            title: 'Budget Warning',
            description: `This expense will exceed your ${currentBudget.category_name} budget by ₹${formatCurrencyInIST(exceededBy)}. The expense will still be added.`,
            variant: 'destructive',
          });
        }
      }
      
      const result2 = await onAddExpense({
        paymentMethod: formData.paymentMethod,
        category: formData.category,
        amount: amount,
        description: formData.description,
        date: formData.date
      });
      
      // Reset form
      setFormData({
        paymentMethod: 'cash',
        category: '',
        amount: '',
        description: '',
        date: getCurrentDateStringInIST()
      });
      setCurrentBudget(null);
      setBudgetWarning(null);
    } catch (error) {
      console.error('ExpenseForm: Error in handleSubmit:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setErrors({ general: `Failed to add expense: ${errorMessage}` });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCalculatorResult = (result: number) => {
    setFormData(prev => ({ ...prev, amount: result.toString() }));
    setShowCalculator(false);
  };

  // Excel import functions
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportLoading(true);
    setImportedExpenses([]);

    try {
      const XLSX = await import('xlsx');
      const data = await readExcelFile(file, XLSX);
      const validatedExpenses = validateImportedData(data);
      setImportedExpenses(validatedExpenses);
      
      if (validatedExpenses.length > 0) {
        const validCount = validatedExpenses.filter(exp => exp.isValid).length;
        const invalidCount = validatedExpenses.length - validCount;
        
        toast({
          title: 'File Imported',
          description: `Found ${validCount} valid expenses${invalidCount > 0 ? ` and ${invalidCount} invalid entries` : ''}`,
        });
      } else {
        toast({
          title: 'No Valid Data',
          description: 'No valid expense data found in the file. Please check the format.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error importing file:', error);
      toast({
        title: 'Import Error',
        description: 'Failed to read the Excel file. Please check the file format.',
        variant: 'destructive',
      });
    } finally {
      setImportLoading(false);
    }
  };

  const readExcelFile = (file: File, XLSX: typeof import('xlsx')): Promise<WorksheetRow[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { 
            type: 'array',
            cellDates: true, // Parse dates as Date objects
            cellNF: false,
            cellText: false,
            cellFormula: false, // Don't evaluate formulas
            cellStyles: false // Don't include cell styles
          });
          
          console.log('📋 Available sheets:', workbook.SheetNames);
          
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Get the range of the worksheet
          const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
          console.log('📊 Worksheet range:', worksheet['!ref']);
          console.log('📊 Total rows in worksheet:', range.e.r + 1);
          
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            raw: false, // Convert everything to strings for better handling
            dateNF: 'yyyy-mm-dd', // Date format
            defval: '', // Default value for empty cells
            blankrows: false // Skip completely blank rows
          }) as WorksheetRow[];
          
          console.log('📊 Raw data from Excel:', jsonData.length, 'rows');
          console.log('📊 First few rows:', jsonData.slice(0, 5));
          
          resolve(jsonData);
        } catch (error) {
          console.error('❌ Error reading Excel file:', error);
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const validateImportedData = (data: WorksheetRow[]): Array<{
    category: string;
    amount: number;
    description: string;
    date: string;
    isValid: boolean;
    error?: string;
  }> => {
    const expenses: Array<{
      category: string;
      amount: number;
      description: string;
      date: string;
      isValid: boolean;
      error?: string;
    }> = [];

    console.log('📊 Total rows in Excel file:', data.length);
    console.log('📋 Available categories:', categories.map(c => c.name));

    // Skip header row and process data
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // Skip completely empty rows (including whitespace-only cells)
      if (!row || row.every(cell => {
        if (cell === null || cell === undefined) return true;
        if (typeof cell === 'string' && cell.trim() === '') return true;
        return false;
      })) {
        console.log(`⏭️ Skipping empty row ${i + 1}`);
        continue;
      }
      
      // Check if row has enough columns
      if (row.length < 4) {
        console.log(`⚠️ Row ${i + 1} has insufficient columns (${row.length}/4):`, row);
        continue;
      }

      const [date, amount, category, description] = row;
      let isValid = true;
      let error = '';

      // Validate category (more flexible)
      const categoryStr = category?.toString().trim() || '';
      if (!categoryStr) {
        isValid = false;
        error = 'Category is required';
      } else {
        const foundCategory = categories.find(cat => 
          cat.name.toLowerCase() === categoryStr.toLowerCase()
        );
        if (!foundCategory) {
          isValid = false;
          error = `Category "${categoryStr}" not found`;
        }
      }

      // Validate amount (more flexible)
      let numAmount = 0;
      if (amount !== null && amount !== undefined && amount !== '') {
        // Try to parse as number, handle various formats
        const amountStr = amount.toString().replace(/[,\s]/g, ''); // Remove commas and spaces
        numAmount = parseFloat(amountStr);
        
        if (isNaN(numAmount) || numAmount <= 0) {
          isValid = false;
          error = error ? `${error}, ` : '';
          error += `Invalid amount: "${amount}"`;
        }
      } else {
        isValid = false;
        error = error ? `${error}, ` : '';
        error += 'Amount is required';
      }

      // Validate date (more flexible)
      let formattedDate = '';
      if (date !== null && date !== undefined && date !== '') {
        if (typeof date === 'string') {
          // Handle string dates
          const trimmedDate = date.trim();
          if (trimmedDate === '') {
            formattedDate = getCurrentDateStringInIST(); // Default to today in IST
          } else {
            // Try to parse the date string with multiple formats
            let parsedDate = new Date(trimmedDate);
            
            // If parsing fails, try alternative formats
            if (isNaN(parsedDate.getTime())) {
              // Try DD/MM/YYYY format
              const parts = trimmedDate.split('/');
              if (parts.length === 3) {
                parsedDate = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
              }
            }
            
            if (isNaN(parsedDate.getTime())) {
              isValid = false;
              error = error ? `${error}, ` : '';
              error += `Invalid date format: "${date}"`;
            } else {
              formattedDate = parsedDate.toISOString().split('T')[0];
            }
          }
        } else if (date instanceof Date) {
          // Handle Date objects
          if (isNaN(date.getTime())) {
            isValid = false;
            error = error ? `${error}, ` : '';
            error += 'Invalid date';
          } else {
            formattedDate = date.toISOString().split('T')[0];
          }
        } else if (typeof date === 'number') {
          // Handle Excel date numbers (days since 1900-01-01)
          const excelDate = new Date((date - 25569) * 86400 * 1000);
          if (isNaN(excelDate.getTime())) {
            isValid = false;
            error = error ? `${error}, ` : '';
            error += 'Invalid Excel date';
          } else {
            formattedDate = excelDate.toISOString().split('T')[0];
          }
        } else {
          isValid = false;
          error = error ? `${error}, ` : '';
          error += `Invalid date type: "${typeof date}"`;
        }
      } else {
        formattedDate = getCurrentDateStringInIST(); // Default to today in IST
      }

      // Validate description (optional field)
      const descriptionStr = description?.toString().trim() || '';

      expenses.push({
        category: categoryStr,
        amount: numAmount,
        description: descriptionStr,
        date: formattedDate,
        isValid,
        error: error || undefined
      });

      // Log validation details for debugging
      if (!isValid) {
        console.log(`❌ Row ${i + 1} invalid:`, { date, amount, category, description, error });
      } else {
        console.log(`✅ Row ${i + 1} valid:`, { date: formattedDate, amount: numAmount, category: categoryStr, description: description?.toString().trim() });
      }
    }

    const validCount = expenses.filter(exp => exp.isValid).length;
    const invalidCount = expenses.length - validCount;
    console.log(`📊 Validation Summary: ${validCount} valid, ${invalidCount} invalid out of ${expenses.length} processed rows`);

    return expenses;
  };

  const handleImportExpenses = async () => {
    const validExpenses = importedExpenses.filter(exp => exp.isValid);
    if (validExpenses.length === 0) {
      toast({
        title: 'No Valid Expenses',
        description: 'No valid expenses to import.',
        variant: 'destructive',
      });
      return;
    }

    setImportLoading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const expense of validExpenses) {
      try {
        await onAddExpense({
          paymentMethod: 'cash', // Default to cash for imported expenses
          ...expense
        });
        successCount++;
      } catch (error) {
        errorCount++;
        console.error('Error importing expense:', error);
      }
    }

    setImportLoading(false);
    setImportedExpenses([]);
    setShowImportSection(false);

    toast({
      title: 'Import Complete',
      description: `Successfully imported ${successCount} expenses${errorCount > 0 ? ` (${errorCount} failed)` : ''}`,
    });
  };

  const downloadTemplate = async () => {
    const XLSX = await import('xlsx');
    const today = getCurrentDateStringInIST();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const template = [
      ['Date', 'Amount', 'Category', 'Description'],
      [today, '100.00', 'Food', 'Lunch'],
      [today, '50.00', 'Transportation', 'Bus fare'],
      [yesterday, '200.00', 'Shopping', 'Groceries'],
      [today, '150.00', 'Entertainment', 'Movie tickets']
    ];

    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
    
    XLSX.writeFile(wb, 'expense_template.xlsx');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
      <Card className="glass-card p-4 sm:p-5 w-full max-w-sm sm:max-w-md border-white/20 max-h-[95vh] overflow-y-auto">
        <CardHeader className="pb-3 sm:pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg text-white flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Add New Expense
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="h-6 w-6 sm:h-7 sm:w-7 p-0 hover:bg-white/10"
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Import/Manual Toggle */}
          <div className="flex gap-2 mb-4">
            <Button
              type="button"
              variant={!showImportSection ? "default" : "outline"}
              onClick={() => setShowImportSection(false)}
              className="flex-1 h-8 text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Manual Entry
            </Button>
            <Button
              type="button"
              variant={showImportSection ? "default" : "outline"}
              onClick={() => setShowImportSection(true)}
              className="flex-1 h-8 text-xs"
            >
              <FileSpreadsheet className="w-3 h-3 mr-1" />
              Import Excel
            </Button>
          </div>

          {showImportSection ? (
            /* Excel Import Section */
            <div className="space-y-4">
              <div className="text-center p-4 border-2 border-dashed border-white/20 rounded-lg">
                <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-white/60" />
                <p className="text-sm text-white/80 mb-2">Upload Excel file with expense data</p>
                <div className="flex gap-2 justify-center">
                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importLoading}
                    className="h-8 px-3 text-xs"
                  >
                    <Upload className="w-3 h-3 mr-1" />
                    {importLoading ? 'Processing...' : 'Choose File'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={downloadTemplate}
                    className="h-8 px-3 text-xs"
                  >
                    Download Template
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                                 <p className="text-xs text-white/60 mt-2">
                   Expected columns: Date (YYYY-MM-DD), Amount, Category, Description
                 </p>
              </div>

              {/* Imported Expenses Preview */}
              {importedExpenses.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-white">
                        Preview ({importedExpenses.filter(exp => exp.isValid).length} valid, {importedExpenses.filter(exp => !exp.isValid).length} invalid)
                      </h4>
                      <p className="text-xs text-white/60">
                        Total processed: {importedExpenses.length} entries
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={handleImportExpenses}
                      disabled={importLoading || importedExpenses.filter(exp => exp.isValid).length === 0}
                      className="h-7 px-3 text-xs"
                    >
                      {importLoading ? 'Importing...' : 'Import All Valid'}
                    </Button>
                  </div>
                  
                  {/* Error Summary */}
                  {importedExpenses.filter(exp => !exp.isValid).length > 0 && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <h5 className="text-sm font-medium text-red-400 mb-2">Common Issues:</h5>
                      <div className="text-xs text-white/70 space-y-1">
                        {(() => {
                          const errorCounts: { [key: string]: number } = {};
                          importedExpenses.filter(exp => !exp.isValid).forEach(exp => {
                            if (exp.error) {
                              const errorType = exp.error.split(',')[0]; // Get first error type
                              errorCounts[errorType] = (errorCounts[errorType] || 0) + 1;
                            }
                          });
                          return Object.entries(errorCounts).map(([error, count]) => (
                            <div key={error}>• {error}: {count} entries</div>
                          ));
                        })()}
                      </div>
                    </div>
                  )}

                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {importedExpenses.map((expense, index) => (
                      <div
                        key={index}
                        className={`p-2 rounded text-xs ${
                          expense.isValid 
                            ? 'bg-green-500/10 border border-green-500/20' 
                            : 'bg-red-500/10 border border-red-500/20'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex gap-2">
                              <span className="text-lg mr-1">{getCategoryIcon(expense.category)}</span>
                              <span className="font-medium">{expense.category}</span>
                              <span className="text-green-400">₹{formatCurrencyInIST(expense.amount)}</span>
                            </div>
                            {expense.description && (
                              <div className="text-white/70">{expense.description}</div>
                            )}
                            <div className="text-white/60">{expense.date}</div>
                          </div>
                          {!expense.isValid && (
                            <span className="text-red-400 text-xs ml-2">{expense.error}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 h-10"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            /* Manual Entry Form */
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paymentMethod" className="text-white text-sm">Payment Method</Label>
              <Select value={formData.paymentMethod} onValueChange={(value) => updateField('paymentMethod', value)}>
                <SelectTrigger className="h-10 sm:h-11 bg-white/10 border-white/20 text-white text-sm">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">
                    <div className="flex items-center gap-2">
                      <span>💵</span>
                      Cash
                    </div>
                  </SelectItem>
                  <SelectItem value="credit_card">
                    <div className="flex items-center gap-2">
                      <span>💳</span>
                      Credit Card
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-white text-sm">Category</Label>
              <Select value={formData.category} onValueChange={(value) => updateField('category', value)}>
                <SelectTrigger className="h-10 sm:h-11 bg-white/10 border-white/20 text-white text-sm">
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
                          <span>{cat.icon || getIconByCategoryName(cat.name)}</span>
                          {cat.name}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-red-300 text-xs mt-1">{errors.category}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className="text-white text-sm">Amount (₹)</Label>
              <div className="flex gap-2">
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => updateField('amount', e.target.value)}
                  className="h-10 sm:h-11 bg-white/10 border-white/20 text-white placeholder:text-white/60 text-sm flex-1"
                  placeholder="0.00"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCalculator(true)}
                  className="h-10 sm:h-11 px-3 border-white/20 bg-white/10 text-white hover:bg-white/20"
                  title="Open Calculator"
                >
                  <Calculator className="w-4 h-4" />
                </Button>
              </div>
              {errors.amount && <p className="text-red-300 text-xs mt-1">{errors.amount}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-white text-sm">Description</Label>
              <Input
                id="description"
                type="text"
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                className="h-10 sm:h-11 bg-white/10 border-white/20 text-white placeholder:text-white/60 text-sm"
                placeholder="Brief description (optional)"
              />
              {errors.description && <p className="text-red-300 text-xs mt-1">{errors.description}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date" className="text-white text-sm">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => updateField('date', e.target.value)}
                className="h-10 sm:h-11 bg-white/10 border-white/20 text-white text-sm"
                required
              />
              {errors.date && <p className="text-red-300 text-xs mt-1">{errors.date}</p>}
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
                    <span className="text-white">₹{formatCurrencyInIST(currentBudget.amount)}</span>
                  </div>
                  {currentBudget.carryover_amount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Carryover:</span>
                      <span className="text-green-400">₹{formatCurrencyInIST(currentBudget.carryover_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Spent:</span>
                    <span className="text-white">₹{formatCurrencyInIST(currentBudget.spent_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Remaining:</span>
                    <span className={`${currentBudget.remaining_amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ₹{formatCurrencyInIST(currentBudget.remaining_amount)}
                    </span>
                  </div>
                  {/* Accumulated Balance */}
                  {formData.category && (
                    <div className="flex justify-between border-t border-white/10 pt-1 mt-2">
                      <span className="text-muted-foreground">Accumulated Balance:</span>
                      <span className="text-purple-400 font-medium">
                        ₹{formatCurrencyInIST(getCategoryAccumulatedBalance(formData.category))}
                      </span>
                    </div>
                  )}
                  
                  {/* Credit Card Due */}
                  {formData.category && getCategoryCreditCardDue(formData.category) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Credit Card Due:</span>
                      <span className="text-orange-400 font-medium">
                        ₹{formatCurrencyInIST(getCategoryCreditCardDue(formData.category))}
                      </span>
                    </div>
                  )}
                  
                  {/* Balance After Settlement */}
                  {formData.category && getCategoryCreditCardDue(formData.category) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Balance After Settlement:</span>
                      <span className="text-cyan-400 font-medium">
                        ₹{formatCurrencyInIST(getCategoryAccumulatedBalance(formData.category) - getCategoryCreditCardDue(formData.category))}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Credit Card Alert */}
            {creditCardAlert && (
              <div className="p-3 rounded-lg bg-orange-500/20 border border-orange-500/30">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-400" />
                  <span className="text-sm font-medium text-orange-400">Credit Card Alert</span>
                </div>
                <p className="text-xs text-orange-300 mt-1">{creditCardAlert}</p>
              </div>
            )}

            {/* Budget Overage Alert */}
            {budgetOverageAlert && (
              <div className="p-3 rounded-lg bg-red-600/20 border border-red-600/30">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-red-500">Budget Exceeded Alert</span>
                </div>
                <p className="text-xs text-red-400 mt-1">{budgetOverageAlert}</p>
              </div>
            )}

            {/* Budget Warning */}
            {budgetWarning && (
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <span className="text-red-400 text-sm font-medium">Budget Warning</span>
                </div>
                <p className="text-red-300 text-xs mt-1">{budgetWarning}</p>
              </div>
            )}

            {errors.general && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                <p className="text-red-300 text-sm">{errors.general}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-3">
              <Button 
                type="submit" 
                disabled={loading}
                className="flex-1 h-10 sm:h-11 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 disabled:opacity-50 text-sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                {loading ? 'Adding...' : 'Add Expense'}
              </Button>
              
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="h-10 sm:h-11 px-5 border-white/20 bg-white/10 text-white hover:bg-white/20 text-sm"
              >
                Cancel
              </Button>
            </div>
          </form>
          )}
        </CardContent>
      </Card>
      
      {/* Calculator Component */}
      <CalculatorComponent
        isOpen={showCalculator}
        onClose={() => setShowCalculator(false)}
        onResult={handleCalculatorResult}
      />
    </div>
  );
};

export { ExpenseForm };