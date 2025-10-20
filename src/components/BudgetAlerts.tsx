import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, AlertTriangle, Check, DollarSign } from 'lucide-react';
import { useBudgets, BudgetAlert } from '@/hooks/useBudgets';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { getIconByCategoryName } from '@/data/categoryIcons';

interface BudgetAlertsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BudgetAlerts = ({ isOpen, onClose }: BudgetAlertsProps) => {
  const { user } = useAuth();
  const { budgetAlerts, markAlertAsRead, markAllAlertsAsRead } = useBudgets(user?.id);
  const { categories } = useCategories(user?.id);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Helper function to get category icon
  const getCategoryIcon = (categoryName: string): string => {
    const category = categories.find(cat => cat.name === categoryName);
    return category?.icon || getIconByCategoryName(categoryName);
  };

  const handleMarkAsRead = async (alertId: string) => {
    setBusyId(alertId);
    await markAlertAsRead(alertId);
    setBusyId(null);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAlertsAsRead();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-400" />
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-white">Budget Alerts</h2>
            {budgetAlerts.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {budgetAlerts.length}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {budgetAlerts.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-xs glass-button"
              >
                <Check className="h-3 w-3 mr-1" />
                Mark All Read
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-4 sm:p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          {budgetAlerts.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-4 rounded-full bg-green-500/20 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Check className="h-8 w-8 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">All Good!</h3>
              <p className="text-muted-foreground">No budget alerts at the moment.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {budgetAlerts.map((alert) => (
                <Card key={alert.id} className="glass-card border-red-500/30 bg-red-500/10">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-4 w-4 text-red-400" />
                          <span className="text-lg">{getCategoryIcon(alert.category_name)}</span>
                          <h3 className="font-semibold text-white">
                            Budget Exceeded: {alert.category_name}
                          </h3>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Month:</span>
                            <span className="text-white">{alert.month_year}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Budget Set:</span>
                            <span className="text-white">₹{alert.budget_amount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Amount Spent:</span>
                            <span className="text-red-400 font-semibold">₹{alert.spent_amount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Exceeded By:</span>
                            <span className="text-red-400 font-semibold">₹{alert.exceeded_by.toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="mt-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30">
                          <p className="text-red-400 text-sm">
                            You've exceeded your budget for <span className="inline-flex items-center gap-1"><span>{getCategoryIcon(alert.category_name)}</span><span>{alert.category_name}</span></span> in {alert.month_year}. 
                            Consider reviewing your spending in this category.
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkAsRead(alert.id)}
                        disabled={busyId === alert.id}
                        className="h-8 w-8 p-0 hover:bg-white/10 ml-4"
                        title="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
