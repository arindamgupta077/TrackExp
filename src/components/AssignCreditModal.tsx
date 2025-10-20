import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, X } from 'lucide-react';
import { getIconByCategoryName } from '@/data/categoryIcons';

interface AssignCreditModalProps {
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
  onAssign: (category: string, targetYear: number, targetMonth: number) => Promise<void>;
  loading: boolean;
  generateMonthOptions: () => Array<{ value: number; label: string }>;
  generateYearOptions: () => number[];
}

const AssignCreditModal: React.FC<AssignCreditModalProps> = ({
  credit,
  categories,
  onClose,
  onAssign,
  loading,
  generateMonthOptions,
  generateYearOptions
}) => {
  const [assignToCategory, setAssignToCategory] = useState('');
  const [assignToYear, setAssignToYear] = useState(new Date().getFullYear());
  const [assignToMonth, setAssignToMonth] = useState(new Date().getMonth() + 1);

  const handleAssign = async () => {
    if (!assignToCategory) return;
    await onAssign(assignToCategory, assignToYear, assignToMonth);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-lg glass-card border-white/20 max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <CardHeader className="pb-2 sm:pb-3 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500">
                <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base sm:text-lg font-heading gradient-text truncate">
                  Assign Credit to Category Budget
                </CardTitle>
                <p className="text-xs sm:text-sm text-white/70 truncate">
                  Add unassigned credit to a category's budget
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
            <p className="text-sm text-white/70">Credit to assign:</p>
            <p className="text-lg font-semibold text-green-400">
              ₹{credit.amount.toLocaleString()} from {generateMonthOptions()[credit.month - 1].label} {credit.year}
            </p>
            <p className="text-xs text-white/60 mt-1">
              This will add the credit to the selected category's budget for the target month you choose below.
            </p>
          </div>

          {/* Category Selection */}
          <div className="space-y-2">
            <Label className="text-white font-medium text-sm">Select Category</Label>
            <Select 
              value={assignToCategory} 
              onValueChange={setAssignToCategory}
              disabled={loading}
            >
              <SelectTrigger className="bg-white/10 border-white/20 text-white h-9">
                <SelectValue placeholder="Choose a category" />
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

          {/* Target Month Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-white font-medium text-sm">Target Year</Label>
              <Select 
                value={assignToYear.toString()} 
                onValueChange={(value) => setAssignToYear(parseInt(value))}
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
                value={assignToMonth.toString()} 
                onValueChange={(value) => setAssignToMonth(parseInt(value))}
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

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleAssign}
              disabled={loading || !assignToCategory}
              className="flex-1 glass-button bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 h-9 text-sm"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Assigning...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  Add to {assignToCategory || 'Category'} Budget ({generateMonthOptions()[assignToMonth - 1].label} {assignToYear})
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

export default AssignCreditModal;
