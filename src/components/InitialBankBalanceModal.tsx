import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, PiggyBank, TrendingUp, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrencyInIST } from '@/lib/dateUtils';

interface InitialBankBalanceModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

const InitialBankBalanceModal = ({ isOpen, onComplete }: InitialBankBalanceModalProps) => {
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState('');
  const [error, setError] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!balance || balance.trim() === '') {
      setError('Please enter your initial bank balance');
      return;
    }

    const amount = parseFloat(balance);
    if (isNaN(amount) || amount < 0) {
      setError('Please enter a valid positive number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          initial_bank_balance: amount,
          has_set_initial_balance: true
        })
        .eq('user_id', user?.id);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Bank Balance Set!",
        description: `Your initial bank balance of ₹${formatCurrencyInIST(amount)} has been recorded.`,
      });

      onComplete();
    } catch (error) {
      console.error('Error setting initial bank balance:', error);
      setError('Failed to save bank balance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          has_set_initial_balance: true
        })
        .eq('user_id', user?.id);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Setup Skipped",
        description: "You can set your bank balance later in your profile settings.",
      });

      onComplete();
    } catch (error) {
      console.error('Error skipping bank balance setup:', error);
      toast({
        title: "Error",
        description: "Failed to skip setup. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md glass-card border-white/20">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500">
              <PiggyBank className="h-5 w-5 text-white" />
            </div>
            <CardTitle className="text-xl font-heading gradient-text">Set Your Bank Balance</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Help us track your finances better by setting your current bank balance.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Balance Input */}
            <div className="space-y-2">
              <Label htmlFor="balance" className="text-white font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Current Bank Balance *
              </Label>
              <Input
                id="balance"
                type="number"
                step="0.01"
                min="0"
                placeholder="Enter your current bank balance"
                value={balance}
                onChange={(e) => {
                  setBalance(e.target.value);
                  setError('');
                }}
                className={`bg-white/10 border-white/20 text-white placeholder:text-white/50 ${
                  error ? 'border-red-500/50' : ''
                }`}
                disabled={loading}
              />
              {error && (
                <p className="text-xs text-red-400">{error}</p>
              )}
            </div>

            {/* Benefits Section */}
            <div className="space-y-3 p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-400" />
                <h3 className="text-sm font-medium text-white">Why set your bank balance?</h3>
              </div>
              <ul className="space-y-2 text-xs text-white/70">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-3 w-3 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Track your actual available funds</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-3 w-3 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Get accurate budget recommendations</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-3 w-3 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Monitor your financial health</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleSkip}
                disabled={loading}
                className="flex-1 glass-button border-white/20 hover:bg-white/10"
              >
                Skip for Now
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 glass-button bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <PiggyBank className="h-4 w-4" />
                    Set Balance
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

export default InitialBankBalanceModal;
