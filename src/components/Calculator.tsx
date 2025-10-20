import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calculator as CalculatorIcon, X } from 'lucide-react';

interface CalculatorProps {
  onResult: (result: number) => void;
  onClose: () => void;
  isOpen: boolean;
}

const Calculator = ({ onResult, onClose, isOpen }: CalculatorProps) => {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);
  const [lastOperation, setLastOperation] = useState<string | null>(null);
  const [liveResult, setLiveResult] = useState<string | null>(null);

  // Keyboard event handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      // Prevent default behavior for calculator keys
      const calculatorKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '-', '*', '/', '=', 'Enter', 'Escape', '.', 'Backspace', 'Delete'];
      
      if (calculatorKeys.includes(event.key)) {
        event.preventDefault();
      }

      // Handle number keys (0-9)
      if (event.key >= '0' && event.key <= '9') {
        handleNumber(event.key);
      }
      // Handle operation keys
      else if (event.key === '+') {
        handleOperation('+');
      }
      else if (event.key === '-') {
        handleOperation('-');
      }
      else if (event.key === '*') {
        handleOperation('×');
      }
      else if (event.key === '/') {
        handleOperation('÷');
      }
      // Handle equals and Enter
      else if (event.key === '=' || event.key === 'Enter') {
        handleEquals();
      }
      // Handle decimal point
      else if (event.key === '.') {
        handleDecimal();
      }
      // Handle clear functions
      else if (event.key === 'Escape') {
        handleAllClear();
      }
      else if (event.key === 'Backspace' || event.key === 'Delete') {
        handleDelete();
      }
    };

    // Add event listener when calculator is open
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    // Cleanup event listener
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, display, equation, operation, previousValue, waitingForNewValue]);

  const handleNumber = (num: string) => {
    if (waitingForNewValue) {
      setDisplay(num);
      setWaitingForNewValue(false);
      // Add the new number to the equation after the last operation
      setEquation(equation + ' ' + num);
      
      // Calculate live result for display
      if (previousValue !== null && operation) {
        const inputValue = parseFloat(num);
        const newValue = calculate(previousValue, inputValue, operation);
        setLiveResult(String(newValue));
      } else {
        setLiveResult(null);
      }
    } else {
      const newDisplay = display === '0' ? num : display + num;
      setDisplay(newDisplay);
      // Update equation for continuing number entry
      if (equation && !waitingForNewValue) {
        // Replace the last number in the equation with the new display
        const parts = equation.split(' ');
        if (parts.length > 0 && !isNaN(parseFloat(parts[parts.length - 1]))) {
          parts[parts.length - 1] = newDisplay;
          setEquation(parts.join(' '));
          
          // Calculate live result for display
          if (previousValue !== null && operation) {
            const inputValue = parseFloat(newDisplay);
            const newValue = calculate(previousValue, inputValue, operation);
            setLiveResult(String(newValue));
          } else {
            setLiveResult(null);
          }
        } else {
          setEquation(equation + ' ' + newDisplay);
        }
      } else if (!equation) {
        setEquation(newDisplay);
        setLiveResult(null);
      }
    }
  };

  const handleOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      // First operation - just add the current number and operation
      setPreviousValue(inputValue);
      setEquation(display + ' ' + nextOperation);
    } else if (operation) {
      // Check if we're entering consecutive operations (when waitingForNewValue is true)
      if (waitingForNewValue) {
        // Replace the last operation in the equation
        const parts = equation.split(' ');
        if (parts.length >= 2) {
          // Remove the last operation and add the new one
          parts[parts.length - 1] = nextOperation;
          setEquation(parts.join(' '));
        }
      } else {
        // Chain operation - calculate previous and continue building equation
        const currentValue = previousValue || 0;
        const newValue = calculate(currentValue, inputValue, operation);

        setDisplay(String(newValue));
        setPreviousValue(newValue);
        // Build the equation by adding the current number and next operation
        setEquation(equation + ' ' + nextOperation);
      }
    }

    setWaitingForNewValue(true);
    setOperation(nextOperation);
    setLastOperation(nextOperation);
  };

  const calculate = (firstValue: number, secondValue: number, operation: string): number => {
    switch (operation) {
      case '+':
        return firstValue + secondValue;
      case '-':
        return firstValue - secondValue;
      case '×':
        return firstValue * secondValue;
      case '÷':
        return secondValue !== 0 ? firstValue / secondValue : 0;
      default:
        return secondValue;
    }
  };

  const handleEquals = () => {
    const inputValue = parseFloat(display);

    if (previousValue !== null && operation) {
      const newValue = calculate(previousValue, inputValue, operation);
      setDisplay(String(newValue));
      setEquation(equation + ' = ' + String(newValue));
      setPreviousValue(null);
      setOperation(null);
      setWaitingForNewValue(true);
    }
  };

  // All Clear - clears everything
  const handleAllClear = () => {
    setDisplay('0');
    setEquation('');
    setPreviousValue(null);
    setOperation(null);
    setLastOperation(null);
    setWaitingForNewValue(false);
    setLiveResult(null);
  };

  // Clear Entry - clears last entry but keeps calculation
  const handleClearEntry = () => {
    if (waitingForNewValue) {
      setDisplay('0');
    } else {
      setDisplay('0');
      // Remove the last number from equation
      if (equation) {
        const parts = equation.split(' ');
        if (parts.length >= 2 && !isNaN(parseFloat(parts[parts.length - 1]))) {
          parts.pop();
          setEquation(parts.join(' '));
        }
      }
    }
  };

  // Delete/Backspace - removes last character
  const handleDelete = () => {
    if (display.length > 1) {
      const newDisplay = display.slice(0, -1);
      setDisplay(newDisplay);
      
      // Update equation - replace the last number
      if (equation && !waitingForNewValue) {
        const parts = equation.split(' ');
        if (parts.length > 0 && !isNaN(parseFloat(parts[parts.length - 1]))) {
          parts[parts.length - 1] = newDisplay;
          setEquation(parts.join(' '));
          
          // Recalculate live result
          if (previousValue !== null && operation) {
            const inputValue = parseFloat(newDisplay);
            const newValue = calculate(previousValue, inputValue, operation);
            setLiveResult(String(newValue));
          } else {
            setLiveResult(null);
          }
        }
      } else if (!equation) {
        setEquation(newDisplay);
        setLiveResult(null);
      }
    } else {
      // When display becomes single digit, handle different cases
      if (display === '0') {
        // If display is already '0', remove the last operation and number
        if (equation && !waitingForNewValue) {
          const parts = equation.split(' ');
          if (parts.length >= 3) {
            // Remove the last operation and the '0' that was just set
            parts.pop(); // Remove the '0'
            parts.pop(); // Remove the operation
            setEquation(parts.join(' '));
            
            // Update display to show the previous number
            if (parts.length > 0) {
              const lastPart = parts[parts.length - 1];
              if (!isNaN(parseFloat(lastPart))) {
                setDisplay(lastPart);
                setWaitingForNewValue(false);
                
                // Recalculate live result
                if (parts.length >= 2 && previousValue !== null && operation) {
                  const inputValue = parseFloat(lastPart);
                  const newValue = calculate(previousValue, inputValue, operation);
                  setLiveResult(String(newValue));
                } else {
                  setLiveResult(null);
                }
              }
            }
          } else {
            // If only one number left, clear everything
            setDisplay('0');
            setEquation('');
            setPreviousValue(null);
            setOperation(null);
            setWaitingForNewValue(false);
            setLiveResult(null);
          }
        }
      } else {
        // Single digit becomes 0
        setDisplay('0');
        if (equation && !waitingForNewValue) {
          const parts = equation.split(' ');
          if (parts.length > 0 && !isNaN(parseFloat(parts[parts.length - 1]))) {
            parts[parts.length - 1] = '0';
            setEquation(parts.join(' '));
            
            // Recalculate live result
            if (previousValue !== null && operation) {
              const inputValue = 0;
              const newValue = calculate(previousValue, inputValue, operation);
              setLiveResult(String(newValue));
            } else {
              setLiveResult(null);
            }
          }
        } else if (!equation) {
          setEquation('0');
          setLiveResult(null);
        }
      }
    }
  };

  const handleDecimal = () => {
    if (waitingForNewValue) {
      setDisplay('0.');
      setWaitingForNewValue(false);
      // Add the decimal point to the equation after the last operation
      setEquation(equation + ' ' + '0.');
    } else if (display.indexOf('.') === -1) {
      const newDisplay = display + '.';
      setDisplay(newDisplay);
      // Update equation for continuing number entry
      if (equation && !waitingForNewValue) {
        // Replace the last number in the equation with the new display
        const parts = equation.split(' ');
        if (parts.length > 0 && !isNaN(parseFloat(parts[parts.length - 1]))) {
          parts[parts.length - 1] = newDisplay;
          setEquation(parts.join(' '));
        } else {
          setEquation(equation + ' ' + newDisplay);
        }
      } else if (!equation) {
        setEquation(newDisplay);
      }
    }
  };

  const handleUseResult = () => {
    const result = parseFloat(liveResult || display);
    onResult(result);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-[60]">
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4 w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalculatorIcon className="w-5 h-5 text-white" />
            <h3 className="text-lg font-semibold text-white">Calculator</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-white/10"
          >
            <X className="h-4 w-4 text-white" />
          </Button>
        </div>

        {/* Display */}
        <div className="bg-black/20 rounded-lg p-4 mb-4">
          <div className="text-right text-base font-mono text-white/70 min-h-[1.5rem] flex items-center justify-end mb-2">
            {equation || '0'}
          </div>
          <div className="text-right text-3xl font-mono text-white min-h-[2rem] flex items-center justify-end">
            {liveResult || display}
          </div>
        </div>

         {/* Calculator Buttons */}
         <div className="grid grid-cols-4 gap-2">
           {/* Row 1 - Clear Functions */}
           <Button
             variant="outline"
             onClick={handleAllClear}
             className="h-10 bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/30 text-sm"
           >
             AC
           </Button>
           <Button
             variant="outline"
             onClick={handleClearEntry}
             className="h-10 bg-orange-500/20 border-orange-500/30 text-orange-300 hover:bg-orange-500/30 text-sm"
           >
             CE
           </Button>
           <Button
             variant="outline"
             onClick={handleDelete}
             className="h-10 bg-yellow-500/20 border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/30 text-sm"
           >
             ⌫
           </Button>
           <Button
             variant="outline"
             onClick={() => handleOperation('÷')}
             className="h-10 bg-white/10 border-white/20 text-white hover:bg-white/20 text-sm"
           >
             ÷
           </Button>

           {/* Row 2 - Numbers 7,8,9 and Multiply */}
           <Button
             variant="outline"
             onClick={() => handleNumber('7')}
             className="h-10 bg-white/5 border-white/20 text-white hover:bg-white/15 text-sm"
           >
             7
           </Button>
           <Button
             variant="outline"
             onClick={() => handleNumber('8')}
             className="h-10 bg-white/5 border-white/20 text-white hover:bg-white/15 text-sm"
           >
             8
           </Button>
           <Button
             variant="outline"
             onClick={() => handleNumber('9')}
             className="h-10 bg-white/5 border-white/20 text-white hover:bg-white/15 text-sm"
           >
             9
           </Button>
           <Button
             variant="outline"
             onClick={() => handleOperation('×')}
             className="h-10 bg-white/10 border-white/20 text-white hover:bg-white/20 text-sm"
           >
             ×
           </Button>

           {/* Row 3 - Numbers 4,5,6 and Subtract */}
           <Button
             variant="outline"
             onClick={() => handleNumber('4')}
             className="h-10 bg-white/5 border-white/20 text-white hover:bg-white/15 text-sm"
           >
             4
           </Button>
           <Button
             variant="outline"
             onClick={() => handleNumber('5')}
             className="h-10 bg-white/5 border-white/20 text-white hover:bg-white/15 text-sm"
           >
             5
           </Button>
           <Button
             variant="outline"
             onClick={() => handleNumber('6')}
             className="h-10 bg-white/5 border-white/20 text-white hover:bg-white/15 text-sm"
           >
             6
           </Button>
           <Button
             variant="outline"
             onClick={() => handleOperation('-')}
             className="h-10 bg-white/10 border-white/20 text-white hover:bg-white/20 text-sm"
           >
             -
           </Button>

           {/* Row 4 - Numbers 1,2,3 and Add */}
           <Button
             variant="outline"
             onClick={() => handleNumber('1')}
             className="h-10 bg-white/5 border-white/20 text-white hover:bg-white/15 text-sm"
           >
             1
           </Button>
           <Button
             variant="outline"
             onClick={() => handleNumber('2')}
             className="h-10 bg-white/5 border-white/20 text-white hover:bg-white/15 text-sm"
           >
             2
           </Button>
           <Button
             variant="outline"
             onClick={() => handleNumber('3')}
             className="h-10 bg-white/5 border-white/20 text-white hover:bg-white/15 text-sm"
           >
             3
           </Button>
           <Button
             variant="outline"
             onClick={() => handleOperation('+')}
             className="h-10 bg-white/10 border-white/20 text-white hover:bg-white/20 text-sm"
           >
             +
           </Button>

           {/* Row 5 - 0, Decimal, Equals */}
           <Button
             variant="outline"
             onClick={() => handleNumber('0')}
             className="h-10 bg-white/5 border-white/20 text-white hover:bg-white/15 text-sm"
             style={{ gridColumn: 'span 2' }}
           >
             0
           </Button>
           <Button
             variant="outline"
             onClick={handleDecimal}
             className="h-10 bg-white/5 border-white/20 text-white hover:bg-white/15 text-sm"
           >
             .
           </Button>
           <Button
             variant="outline"
             onClick={handleEquals}
             className="h-10 bg-white/10 border-white/20 text-white hover:bg-white/20 text-sm"
           >
             =
           </Button>

           {/* Use Result Button */}
           <Button
             onClick={handleUseResult}
             className="h-10 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white col-span-4 mt-2 text-sm"
           >
             Use Result: ₹{liveResult || display}
           </Button>
         </div>
      </div>
    </div>
  );
};

export { Calculator };
