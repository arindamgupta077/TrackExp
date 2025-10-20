import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

const ConfirmDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel',
  variant = 'danger'
}: ConfirmDialogProps) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" />,
          button: 'bg-red-600 hover:bg-red-700 text-white',
          border: 'border-red-500/30'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" />,
          button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
          border: 'border-yellow-500/30'
        };
      default:
        return {
          icon: <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />,
          button: 'bg-blue-600 hover:bg-blue-700 text-white',
          border: 'border-blue-500/30'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
      <Card className={`glass-card p-4 sm:p-6 w-full max-w-sm sm:max-w-md border-white/20 ${styles.border}`}>
        <CardHeader className="pb-3 sm:pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              {styles.icon}
              <CardTitle className="text-lg sm:text-xl text-white">{title}</CardTitle>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-white/10"
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <p className="text-white/80 mb-4 sm:mb-6 text-sm sm:text-base">{message}</p>
          
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button 
              onClick={handleConfirm}
              className={`flex-1 h-10 sm:h-12 ${styles.button} text-sm sm:text-base`}
            >
              {confirmText}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1 h-10 sm:h-12 border-white/20 bg-white/10 text-white hover:bg-white/20 text-sm sm:text-base"
            >
              {cancelText}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { ConfirmDialog };
