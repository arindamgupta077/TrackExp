import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Split, X, Plus, Trash2 } from 'lucide-react';
import { getIconByCategoryName } from '@/data/categoryIcons';

interface SplitAssignment {
  category: string;
  amount: string;
}

interface SplitCreditModalProps {
  credit: {
    year: number;
    month: number;
    amount: number;
  };
  categories: Array<{
    id: string;
    name: string;
    icon?: string;
  }>;
  onClose: () => void;
  onSplit: (assignments: SplitAssignment[], targetYear: number, targetMonth: number) => Promise<void>;
  loading: boolean;
  generateMonthOptions: () => Array<{ value: number; label: string }>;
  generateYearOptions: () => number[];
}

const SplitCreditModal: React.FC<SplitCreditModalProps> = ({
  credit,
  categories,
  onClose,
  onSplit,
  loading,
  generateMonthOptions,
  generateYearOptions
}) => {
  const [splitTargetYear, setSplitTargetYear] = useState(new Date().getFullYear());
  const [splitTargetMonth, setSplitTargetMonth] = useState(new Date().getMonth() + 1);
  const [splitAssignments, setSplitAssignments] = useState<SplitAssignment[]>([
    { category: '', amount: '' }
  ]);

  const addSplitAssignment = () => {
    setSplitAssignments([...splitAssignments, { category: '', amount: '' }]);
  };

  const removeSplitAssignment = (index: number) => {
    if (splitAssignments.length > 1) {
      setSplitAssignments(splitAssignments.filter((_, i) => i !== index));
    }
  };

  const updateSplitAssignment = (index: number, field: keyof SplitAssignment, value: string) => {
    const updated = [...splitAssignments];
    updated[index] = { ...updated[index], [field]: value };
    setSplitAssignments(updated);
  };

  const handleSplit = async () => {
    if (splitAssignments.length === 0) return;
    await onSplit(splitAssignments, splitTargetYear, splitTargetMonth);
  };

  const totalAssigned = splitAssignments.reduce((sum, assignment) => 
    sum + (parseFloat(assignment.amount) || 0), 0
  );
  const remainingUnassigned = credit.amount - totalAssigned;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-2xl glass-card border-white/20 max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <CardHeader className="pb-2 sm:pb-3 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500">
                <Split className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base sm:text-lg font-heading gradient-text truncate">
                  Split Credit Across Categories
                </CardTitle>
                <p className="text-xs sm:text-sm text-white/70 truncate">
                  Assign portions of unassigned credit to multiple categories
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-white/10 flex-shrink-0"
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
          {/* Credit Info */}
          <div className="p-3 rounded-lg bg-white/5 border border-white/10">
            <p className="text-sm text-white/70">Available unassigned credit:</p>
            <p className="text-lg font-semibold text-blue-400">
              ₹{credit.amount.toLocaleString()} from {generateMonthOptions()[credit.month - 1].label} {credit.year}
            </p>
            <p className="text-xs text-white/60 mt-1">
              Assign any amount to categories for the target month below. The remaining balance will stay as unassigned credit.
            </p>
          </div>

          {/* Target Month Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-white font-medium text-sm">Target Year</Label>
              <Select 
                value={splitTargetYear.toString()} 
                onValueChange={(value) => setSplitTargetYear(parseInt(value))}
                disabled={loading}
              >
                <SelectTrigger className="bg-white/10 border-white/20 text-white h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/20 max-h-60">
                  {generateYearOptions().map((year) => (
                    <SelectItem 
                      key={year} 
                      value={year.toString()}
                      className="text-white hover:bg-white/10"
                    >
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-white font-medium text-sm">Target Month</Label>
              <Select 
                value={splitTargetMonth.toString()} 
                onValueChange={(value) => setSplitTargetMonth(parseInt(value))}
                disabled={loading}
              >
                <SelectTrigger className="bg-white/10 border-white/20 text-white h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/20 max-h-60">
                  {generateMonthOptions().map((month) => (
                    <SelectItem 
                      key={month.value} 
                      value={month.value.toString()}
                      className="text-white hover:bg-white/10"
                    >
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category Assignments */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-white font-medium text-sm">Category Assignments</Label>
              <Button
                onClick={addSplitAssignment}
                size="sm"
                className="glass-button bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 h-8 text-sm"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Category
              </Button>
            </div>
            
            {splitAssignments.map((assignment, index) => (
              <div key={index} className="flex gap-3 items-end">
                <div className="flex-1 space-y-2">
                  <Label className="text-white font-medium text-sm">Category</Label>
                  <Select 
                    value={assignment.category} 
                    onValueChange={(value) => updateSplitAssignment(index, 'category', value)}
                    disabled={loading}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white h-9">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/20 max-h-60">
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
                </div>
                
                <div className="flex-1 space-y-2">
                  <Label className="text-white font-medium text-sm">Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={assignment.amount}
                    onChange={(e) => updateSplitAssignment(index, 'amount', e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-9 text-sm"
                    disabled={loading}
                  />
                </div>
                
                <Button
                  onClick={() => removeSplitAssignment(index)}
                  disabled={loading || splitAssignments.length === 1}
                  size="sm"
                  variant="outline"
                  className="glass-button border-red-500/50 hover:bg-red-500/20 text-red-400 h-9 w-9 p-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            
            {/* Total calculation display */}
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="flex justify-between items-center">
                <span className="text-white font-medium">Total Assigned:</span>
                <span className="text-lg font-semibold text-blue-400">
                  ₹{totalAssigned.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-white font-medium">Remaining Unassigned:</span>
                <span className={`text-sm ${
                  remainingUnassigned >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  ₹{remainingUnassigned.toLocaleString()}
                </span>
              </div>
              <div className="mt-2 p-2 rounded bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs text-blue-300">
                  💡 You can assign any amount up to ₹{credit.amount.toLocaleString()}. The remaining balance will stay as unassigned credit.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSplit}
              disabled={loading || splitAssignments.length === 0}
              className="flex-1 glass-button bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 h-9 text-sm"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Splitting...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Split className="h-4 w-4" />
                  Assign to {splitAssignments.length} Categories ({generateMonthOptions()[splitTargetMonth - 1].label} {splitTargetYear})
                </div>
              )}
            </Button>
            
            <Button
              onClick={onClose}
              variant="outline"
              className="glass-button border-white/20 hover:bg-white/10 h-9 text-sm px-4"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SplitCreditModal;