import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft,
  Send, 
  Bot, 
  User, 
  Sparkles,
  TrendingUp,
  DollarSign,
  MessageCircle,
  Lightbulb,
  Target,
  BarChart3,
  PieChart,
  Calendar,
  Wallet,
  Zap,
  Brain,
  Shield,
  Clock,
  Star,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Settings,
  Menu,
  X,
  Smartphone,
  Tablet,
  Monitor,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { GeminiChatService } from '@/services/geminiChat';
import { ChatMessage, FinancialAnalysisService } from '@/services/financialAnalysis';
import { useExpenses } from '@/hooks/useExpenses';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { ExpenseAnalysisService } from '@/services/expenseAnalysis';
import { testGeminiAPIKey } from '@/utils/apiKeyTest';
import { getIconByCategoryName } from '@/data/categoryIcons';

const DEFAULT_CATEGORY_ICON = '🗂️';

const resolveCategoryIcon = (category: string | null | undefined): string => {
  if (!category || category.toLowerCase() === 'all') {
    return DEFAULT_CATEGORY_ICON;
  }
  return getIconByCategoryName(category);
};

const AIAgent: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { expenses, loading: expensesLoading } = useExpenses(user?.id);
  const { toast } = useToast();
  const { isDarkMode } = useTheme();
  const isLightMode = !isDarkMode;
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'insights' | 'tips'>('chat');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [sidebarStartX, setSidebarStartX] = useState(0);
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [isChatFullscreen, setIsChatFullscreen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showQuickFilters, setShowQuickFilters] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const previousMessageCount = useRef(0);
  const messagesRef = useRef<ChatMessage[]>([]);

  const availableMonths = useMemo(() => ExpenseAnalysisService.getAvailableMonths(expenses), [expenses]);

  const availableYears = useMemo(() => {
    const years = Array.from(new Set(availableMonths.map(item => item.year)));
    years.sort((a, b) => b - a);
    return years;
  }, [availableMonths]);

  const monthsForSelectedYear = useMemo(() => {
    if (!selectedYear || selectedYear === 'all') {
      return availableMonths;
    }
    const yearNum = parseInt(selectedYear, 10);
    if (Number.isNaN(yearNum)) {
      return availableMonths;
    }
    return availableMonths.filter(item => item.year === yearNum);
  }, [availableMonths, selectedYear]);

  const categoryOptions = useMemo(
    () => Array.from(new Set(expenses.map(expense => expense.category)))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b)),
    [expenses]
  );

  const monthOptions = useMemo(() => monthsForSelectedYear, [monthsForSelectedYear]);

  const selectedMonthLabel = useMemo(() => {
    if (!selectedMonth || selectedMonth === 'all') {
      return 'All months';
    }
    const monthNum = parseInt(selectedMonth, 10);
    if (Number.isNaN(monthNum)) {
      return 'Selected month';
    }
    const match = availableMonths.find(item => {
      if (item.month !== monthNum) return false;
      if (!selectedYear || selectedYear === 'all') return true;
      return item.year === parseInt(selectedYear, 10);
    });
    return match ? match.monthName : 'Selected month';
  }, [availableMonths, selectedMonth, selectedYear]);

  const selectedYearLabel = useMemo(() => {
    if (!selectedYear || selectedYear === 'all') {
      return 'All years';
    }
    return selectedYear;
  }, [selectedYear]);

  const selectedCategoryIcon = useMemo(
    () => resolveCategoryIcon(selectedCategory),
    [selectedCategory]
  );

  const selectedCategoryLabel = useMemo(() => {
    if (!selectedCategory || selectedCategory === 'all') {
      return `${DEFAULT_CATEGORY_ICON} All categories`;
    }
    return `${selectedCategoryIcon} ${selectedCategory}`;
  }, [selectedCategory, selectedCategoryIcon]);

  const quickAnalysisSummary = useMemo(() => (
    <div
      className={`text-xs ${isLightMode ? 'text-slate-500' : 'text-white/70'} flex flex-wrap items-center gap-2 text-center sm:justify-end sm:text-right`}
    >
      <span>{selectedMonthLabel}</span>
      <span>·</span>
      <span>{selectedYearLabel}</span>
      <span>·</span>
      <span>{selectedCategoryLabel}</span>
    </div>
  ), [isLightMode, selectedMonthLabel, selectedYearLabel, selectedCategoryLabel]);

  const rollingTrend = useMemo(() => ExpenseAnalysisService.getRollingTrend(expenses), [expenses]);

  const financialInsights = useMemo(() => FinancialAnalysisService.analyzeExpenses(expenses), [expenses]);

  const pageBackgroundClass = isLightMode
    ? 'bg-gradient-to-br from-slate-50 via-white to-indigo-100'
    : 'bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900';

  const headerContainerClass = isLightMode
    ? 'bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xl'
    : 'bg-white/10 backdrop-blur-lg border-b border-white/20 shadow-2xl';

  const headerIconButtonClass = isLightMode
    ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
    : 'text-white hover:bg-white/20';

  const headerBadgeClass = isLightMode
    ? 'border border-indigo-200 bg-indigo-100 text-indigo-700'
    : 'border border-white/30 bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white';

  const headerTitleGradientClass = isLightMode
    ? 'from-slate-900 to-blue-700'
    : 'from-white to-blue-200';

  const headerSubtitleTextClass = isLightMode ? 'text-slate-600' : 'text-white/80';

  const statCardClass = isLightMode
    ? 'bg-white border border-slate-200 text-slate-900 shadow-md'
    : 'bg-white/10 backdrop-blur-sm border border-white/20 text-white';

  const statLabelClass = isLightMode ? 'text-slate-600' : 'text-white/70';

  const chatCardSurfaceClass = isLightMode
    ? 'bg-white border border-slate-200 shadow-xl backdrop-blur-sm'
    : 'bg-white/95 border-0 shadow-2xl backdrop-blur-sm';

  const mobileChatHeight = isKeyboardOpen
    ? 'min-h-[65vh] h-[65vh]'
    : 'min-h-[calc(100vh-180px)] h-[calc(100vh-180px)]';

  const defaultChatHeightClass = isMobile ? mobileChatHeight : 'h-[700px]';
  const chatCardSizingClass = isChatFullscreen
    ? 'h-full w-full max-h-full max-w-none'
    : `${defaultChatHeightClass} w-full`;

  const chatWrapperClasses = isChatFullscreen
    ? 'fixed inset-0 z-50 flex flex-col bg-slate-950/85 backdrop-blur-md overflow-hidden'
    : isMobile
      ? 'relative w-full min-h-[calc(100vh-200px)]'
      : 'relative w-full';

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  };

  const scrollToLastAssistantMessage = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        // Find the last assistant message element
        const messageElements = scrollContainer.querySelectorAll('[data-message-id]');
        const messageArray = Array.from(messageElements);
        let lastAssistantMessage: Element | undefined;
        for (let i = messageArray.length - 1; i >= 0; i -= 1) {
          const element = messageArray[i];
          const messageId = element.getAttribute('data-message-id');
          const message = messages.find(m => m.id === messageId);
          if (message && message.role === 'assistant') {
            lastAssistantMessage = element;
            break;
          }
        }
        
        if (lastAssistantMessage) {
          // Scroll to the beginning of the last assistant message
          lastAssistantMessage.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }
    }
  }, [messages]);

  const handleManualScrollToBottom = () => {
    scrollToBottom();
    setShowScrollButton(false);
  };

  useEffect(() => {
    if (availableMonths.length === 0) {
      if (selectedMonth) setSelectedMonth('');
      if (selectedYear) setSelectedYear('');
      return;
    }

    const [mostRecent] = availableMonths;
    if (!selectedYear) {
      setSelectedYear(String(mostRecent.year));
    }
    if (!selectedMonth) {
      setSelectedMonth(String(mostRecent.month).padStart(2, '0'));
    }
  }, [availableMonths, selectedMonth, selectedYear]);

  useEffect(() => {
    if (selectedCategory !== 'all' && !categoryOptions.includes(selectedCategory)) {
      setSelectedCategory('all');
    }
  }, [categoryOptions, selectedCategory]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!isChatFullscreen) {
      return undefined;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isChatFullscreen]);

  useEffect(() => {
    if (!isChatFullscreen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsChatFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isChatFullscreen]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    // Get the actual scroll container from the ScrollArea
    const scrollContainer = e.currentTarget.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
    if (!scrollContainer) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom && messages.length > 0);
  };

  // Mobile detection and keyboard handling
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setShowQuickFilters(false);
      }
    };
    
    const handleResize = () => {
      checkMobile();
      // Close mobile sidebar on resize to desktop
      if (window.innerWidth >= 768) {
        setShowMobileSidebar(false);
      }
    };

    const handleKeyboardToggle = () => {
      // Detect if virtual keyboard is open (mobile)
      const initialViewportHeight = window.visualViewport?.height || window.innerHeight;
      const currentViewportHeight = window.visualViewport?.height || window.innerHeight;
      setIsKeyboardOpen(currentViewportHeight < initialViewportHeight * 0.75);
    };

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showMobileSidebar) {
        setShowMobileSidebar(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleEscapeKey);
    window.visualViewport?.addEventListener('resize', handleKeyboardToggle);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleEscapeKey);
      window.visualViewport?.removeEventListener('resize', handleKeyboardToggle);
    };
  }, [showMobileSidebar]);

  useEffect(() => {
    // Handle scrolling when new messages are added
    if (!showWelcome && messages.length > 0 && messages.length > previousMessageCount.current) {
      const lastMessage = messages[messages.length - 1];
      
      // If the last message is from the assistant, scroll to the beginning of that message
      if (lastMessage.role === 'assistant') {
        // Use a small delay to ensure the DOM has updated
        setTimeout(() => {
          scrollToLastAssistantMessage();
        }, 100);
      } else {
        // For user messages, scroll to bottom as usual
        scrollToBottom();
      }
      
      previousMessageCount.current = messages.length;
    } else if (messages.length > previousMessageCount.current) {
      // Update message count
      previousMessageCount.current = messages.length;
    }
  }, [messages, showWelcome, scrollToLastAssistantMessage]);

  const initializeChat = useCallback(async () => {
    setIsLoading(true);
    try {
      const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
      const welcomeMessage = await GeminiChatService.getWelcomeMessage(expenses, userName);
      const initialMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date()
      };
      setMessages([initialMessage]);
      messagesRef.current = [initialMessage];
      setHasInitialized(true);
      // Reset message count when initializing
      previousMessageCount.current = 1;
    } catch (error) {
      console.error('Error initializing chat:', error);
      toast({
        title: "Error",
        description: "Failed to initialize AI assistant",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [expenses, user, messagesRef, toast]);

  // Auto-initialize chat when component loads
  useEffect(() => {
    if (!expensesLoading && expenses.length > 0 && !hasInitialized) {
      initializeChat();
    }
  }, [expensesLoading, expenses, hasInitialized, initializeChat]);

  const sendMessageContent = useCallback(async (content: string) => {
    const trimmedMessage = content.trim();
    if (!trimmedMessage || isLoading) {
      return;
    }

    if (!hasInitialized) {
      await initializeChat();
    }

    const baseMessages = messagesRef.current;
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmedMessage,
      timestamp: new Date()
    };

    const conversation = [...baseMessages, userMessage];
    setMessages(conversation);
    messagesRef.current = conversation;
    setIsLoading(true);

    try {
      const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
      const response = await GeminiChatService.sendMessage(
        trimmedMessage,
        expenses,
        conversation,
        userName
      );

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => {
        const next = [...prev, assistantMessage];
        messagesRef.current = next;
        return next;
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to get response from AI assistant",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [expenses, hasInitialized, initializeChat, isLoading, toast, user]);

  const handleSendMessage = () => {
    if (!inputMessage.trim() || isLoading) {
      return;
    }
    const messageToSend = inputMessage;
    setInputMessage('');
    sendMessageContent(messageToSend);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Mobile sidebar swipe gesture handlers
  const handleSidebarTouchStart = (e: React.TouchEvent) => {
    setSidebarStartX(e.touches[0].clientX);
  };

  const handleSidebarTouchEnd = (e: React.TouchEvent) => {
    const endX = e.changedTouches[0].clientX;
    const diffX = endX - sidebarStartX;
    
    // If swiped right more than 100px, close sidebar
    if (diffX > 100) {
      setShowMobileSidebar(false);
    }
  };

  const suggestedQuestions = [
    "Spending Analysis",
    "Savings Tips",
    "What are my biggest spending categories?",
    "How can I save more money?",
    "What's my spending trend this month?",
    "Give me budgeting tips",
    "Analyze my expense patterns",
    "What should I focus on to improve my finances?",
    "Create a monthly budget plan for me",
    "How much should I save each month?",
    "What are my financial goals progress?",
    "Compare this month vs last month",
    "Analyze January 2025 expenses",
    "How much did I spend in March 2025?",
    "Show me February 2025 breakdown",
    "Calculate my December 2024 total",
    "Compare July 2025 and August 2025",
    "July vs August expenses",
    "Compare my January and February spending",
    "Show me March vs April comparison",
    "What's my average daily spending?",
    "Which category should I reduce?",
    "Help me set a monthly budget",
    "Analyze my weekend spending",
    "What are my top 3 expenses?",
    "How can I track my savings?",
    "Compare my food expenses",
    "Show me my spending by day",
    "What's my entertainment budget?",
    "Help me plan for next month"
  ];

  const quickInsights = [
    {
      title: "Top Spending Category",
      value: expenses.length > 0 ? expenses.reduce((acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
        return acc;
      }, {} as Record<string, number>) : {},
      icon: PieChart
    },
    {
      title: "Monthly Average",
      value: expenses.length > 0 ? expenses.reduce((sum, expense) => sum + expense.amount, 0) / 30 : 0,
      icon: Calendar
    },
    {
      title: "Savings Potential",
      value: expenses.length > 0 ? Math.max(0, expenses.reduce((sum, expense) => sum + expense.amount, 0) * 0.1) : 0,
      icon: Wallet
    }
  ];

  const getTopCategory = () => {
    if (expenses.length === 0) return { category: 'No data', amount: 0 };
    const categoryTotals = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);
    
    const topCategory = Object.entries(categoryTotals).reduce((max, [category, amount]) => 
      amount > max.amount ? { category, amount } : max, 
      { category: '', amount: 0 }
    );
    
    return topCategory;
  };

  const handleSuggestedQuestion = async (question: string) => {
    if (question === "Test API Connection") {
      await handleTestAPIKey();
    } else if (question === "Spending Analysis") {
      await handleSpendingAnalysis();
    } else if (question === "Savings Tips") {
      await handleSavingsTips();
    } else {
      setInputMessage(question);
    }
  };

  const handleTestAPIKey = async () => {
    setIsLoading(true);
    try {
      const result = await testGeminiAPIKey();
      
      const testMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: result.success 
          ? `**✅ API Key Test Successful**\n\n${result.message}\n\nThe AI service is working correctly and ready to help you with your financial questions!`
          : `**❌ API Key Test Failed**\n\n**Error**: ${result.error}\n\n**Message**: ${result.message}\n\n**Troubleshooting Steps:**\n• Check if your API key is valid\n• Verify your internet connection\n• Contact support if the issue persists`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, testMessage]);
      
      toast({
        title: result.success ? "API Test Successful" : "API Test Failed",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
    } catch (error) {
      console.error('Error testing API key:', error);
      toast({
        title: "Test Error",
        description: "Failed to test API key",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpendingAnalysis = async () => {
    await sendMessageContent('Please analyze my spending patterns and provide detailed insights about my expenses, including top categories, spending trends, and areas where I spend the most.');
  };

  const handleSavingsTips = async () => {
    await sendMessageContent('Based on my current spending patterns, please provide specific money-saving tips and recommendations. Help me identify areas where I can reduce expenses and save more money.');
  };

  const handleQuickMonthAnalysis = useCallback(async () => {
    if (!selectedMonth) {
      toast({
        title: 'Select a month',
        description: 'Choose a month to run a quick analysis.',
        variant: 'destructive',
      });
      return;
    }

    const isAllMonths = selectedMonth === 'all';
    const isAllYears = !selectedYear || selectedYear === 'all';

    if (isAllMonths && isAllYears) {
      const prompt = selectedCategory === 'all'
        ? 'Analyze my overall expenses across every month and year'
        : `Analyze my overall ${selectedCategory} spending across every month and year`;
      await sendMessageContent(prompt);
      return;
    }

    if (isAllMonths && !isAllYears) {
      const prompt = selectedCategory === 'all'
        ? `Analyze my expenses across all months in ${selectedYear}`
        : `Analyze my ${selectedCategory} expenses across all months in ${selectedYear}`;
      await sendMessageContent(prompt);
      return;
    }

    if (isAllYears) {
      toast({
        title: 'Select a year',
        description: 'Choose a year to pair with the selected month.',
        variant: 'destructive',
      });
      return;
    }

    const yearNum = parseInt(selectedYear, 10);
    const monthNum = parseInt(selectedMonth, 10);

    if (Number.isNaN(yearNum) || Number.isNaN(monthNum)) {
      toast({
        title: 'Invalid selection',
        description: 'Unable to interpret the chosen month/year. Please select again.',
        variant: 'destructive',
      });
      return;
    }

    const monthEntry = availableMonths.find(item => item.year === yearNum && item.month === monthNum);
    const monthLabel = monthEntry?.monthName || new Date(yearNum, monthNum - 1, 1).toLocaleString('default', { month: 'long' });

    let prompt = `Analyze ${monthLabel} ${yearNum} expenses`;
    if (selectedCategory !== 'all') {
      prompt += ` for ${selectedCategory}`;
    }

    await sendMessageContent(prompt);
  }, [availableMonths, selectedCategory, selectedMonth, selectedYear, sendMessageContent, toast]);

  if (expensesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center">
        <div className="text-white text-xl">Loading your financial data...</div>
      </div>
    );
  }

  return (
    <div className={`ai-agent-page min-h-screen ${pageBackgroundClass}`}>
      {/* Enhanced Header - Mobile Optimized */}
  <div className={`ai-agent-header ${headerContainerClass}`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className={`${headerIconButtonClass} transition-all duration-200 h-10 w-10 sm:h-12 sm:w-12`}
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="p-2 sm:p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg">
                  <Brain className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className={`text-lg sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r ${headerTitleGradientClass} bg-clip-text text-transparent truncate`}>
                    AI Financial Agent
                  </h1>
                  <p className={`${headerSubtitleTextClass} text-xs sm:text-sm flex items-center gap-1 sm:gap-2 truncate`}>
                    <Shield className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="hidden sm:inline">Your intelligent financial advisor powered by AI</span>
                    <span className="sm:hidden">AI Financial Advisor</span>
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowMobileSidebar(!showMobileSidebar)}
                  className={`${headerIconButtonClass} transition-all duration-200 h-10 w-10`}
                >
                  {showMobileSidebar ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              )}
              <Badge variant="secondary" className={`${headerBadgeClass} px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm hidden sm:flex`}>
                <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden lg:inline">AI Assistant</span>
                <span className="lg:hidden">AI</span>
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className={`${headerIconButtonClass} transition-all duration-200 h-10 w-10 sm:h-12 sm:w-12`}
              >
                <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

  <div className="max-w-[90rem] mx-auto px-2 sm:px-4 py-4 sm:py-8">
  {/* Quick Stats Overview - Desktop first, mobile later */}
  <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-8">
          <Card className={`p-3 sm:p-4 ${statCardClass}`}>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${isLightMode ? 'bg-indigo-100' : 'bg-blue-500/20'}`}>
                <DollarSign className={`h-4 w-4 sm:h-5 sm:w-5 ${isLightMode ? 'text-indigo-600' : 'text-blue-300'}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`${statLabelClass} text-xs sm:text-sm truncate`}>Total Expenses</p>
                <p className={`text-sm sm:text-xl font-bold truncate ${isLightMode ? 'text-slate-900' : 'text-white'}`}>₹{expenses.reduce((sum, expense) => sum + expense.amount, 0).toLocaleString()}</p>
              </div>
            </div>
          </Card>

          <Card className={`p-3 sm:p-4 ${statCardClass}`}>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${isLightMode ? 'bg-green-100' : 'bg-green-500/20'}`}>
                <BarChart3 className={`h-4 w-4 sm:h-5 sm:w-5 ${isLightMode ? 'text-green-600' : 'text-green-300'}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`${statLabelClass} text-xs sm:text-sm truncate`}>Transactions</p>
                <p className={`text-sm sm:text-xl font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{expenses.length}</p>
              </div>
            </div>
          </Card>

          <Card className={`p-3 sm:p-4 ${statCardClass}`}>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${isLightMode ? 'bg-purple-100' : 'bg-purple-500/20'}`}>
                <PieChart className={`h-4 w-4 sm:h-5 sm:w-5 ${isLightMode ? 'text-purple-600' : 'text-purple-300'}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`${statLabelClass} text-xs sm:text-sm truncate`}>Top Category</p>
                <p className={`text-sm sm:text-lg font-bold truncate ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{getTopCategory().category}</p>
              </div>
            </div>
          </Card>

          <Card className={`p-3 sm:p-4 ${statCardClass}`}>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${isLightMode ? 'bg-orange-100' : 'bg-orange-500/20'}`}>
                <TrendingUp className={`h-4 w-4 sm:h-5 sm:w-5 ${isLightMode ? 'text-orange-600' : 'text-orange-300'}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`${statLabelClass} text-xs sm:text-sm truncate`}>Categories</p>
                <p className={`text-sm sm:text-xl font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{new Set(expenses.map(e => e.category)).size}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,4fr)_minmax(0,1.6fr)] gap-4 sm:gap-6">
          {/* Enhanced Chat Interface - Mobile Optimized */}
          <div className={chatWrapperClasses}>
            <Card
              className={`${chatCardSizingClass} flex flex-col transition-all duration-300 ${chatCardSurfaceClass} relative ${
                isChatFullscreen ? 'rounded-none border-0 shadow-none' : ''
              }`}
            >
              <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsChatFullscreen(prev => !prev)}
                  className={`${
                    isLightMode
                      ? 'text-slate-600 hover:bg-slate-200'
                      : 'text-slate-900 hover:bg-slate-200 bg-white/80 border border-slate-300'
                  } h-9 w-9 sm:h-10 sm:w-10 transition-colors`}
                  aria-label={isChatFullscreen ? 'Exit full screen' : 'Enter full screen'}
                >
                  {isChatFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              </div>

              {/* Messages - Mobile Optimized */}
              <ScrollArea
                ref={scrollAreaRef}
                className="flex-1 pl-3 pr-12 sm:pl-6 sm:pr-16 py-3 sm:py-6"
                onScrollCapture={handleScroll}
              >
                  <div className="space-y-3 sm:space-y-6">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        data-message-id={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`${isMobile ? 'max-w-[95%]' : 'max-w-[85%]'} rounded-2xl p-3 sm:p-4 shadow-lg ${
                            message.role === 'user'
                              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                              : 'bg-gray-100 text-gray-900 border border-gray-200'
                          }`}
                        >
                          <div className="flex items-start gap-2 sm:gap-3">
                            {message.role === 'assistant' && (
                              <div className="p-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex-shrink-0">
                                <Bot className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                              </div>
                            )}
                            {message.role === 'user' && (
                              <div className="p-1 bg-white/20 rounded-full flex-shrink-0">
                                <User className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                              </div>
                            )}
                            <div className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed break-words">
                              {message.role === 'assistant' ? (
                                <div dangerouslySetInnerHTML={{ 
                                  __html: message.content
                                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                    .replace(/• /g, '<span style="color: #3b82f6;">•</span> ')
                                    .replace(/◦ /g, '<span style="color: #6b7280;">◦</span> ')
                                    .replace(/▪ /g, '<span style="color: #10b981;">▪</span> ')
                                    .replace(/▫ /g, '<span style="color: #9ca3af;">▫</span> ')
                                    .replace(/\n/g, '<br>')
                                }} />
                              ) : (
                                message.content
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className={`${isMobile ? 'max-w-[95%]' : 'max-w-[85%]'} bg-gray-100 rounded-2xl p-3 sm:p-4 border border-gray-200`}>
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="p-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex-shrink-0">
                              <Bot className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                            </div>
                            <div className="flex flex-col gap-1">
                              <div className="flex space-x-1">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                              </div>
                              <p className="text-xs text-gray-500">Thinking...</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>
                  
                  {/* Scroll to Bottom Button - Mobile Optimized */}
                  {showScrollButton && (
                    <div className={`absolute ${isMobile ? 'bottom-2 right-2' : 'bottom-4 right-4'}`}>
                      <Button
                        onClick={handleManualScrollToBottom}
                        size="icon"
                        className={`${isMobile ? 'h-8 w-8' : 'h-10 w-10'} rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg touch-manipulation`}
                        title="Scroll to bottom"
                      >
                        <ChevronDown className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                      </Button>
                    </div>
                  )}
                </ScrollArea>

              {/* Enhanced Input - Mobile Optimized */}
              <div className="p-3 sm:p-6 border-t bg-gradient-to-r from-gray-50 to-blue-50/50">
                <div className="flex gap-2 sm:gap-3">
                  <div className="flex-1 relative">
                    <Input
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={isMobile ? "Ask about your expenses..." : "Ask about your expenses, budgeting, or financial goals..."}
                      disabled={isLoading}
                      className={`${isMobile ? 'h-10 text-sm' : 'h-12 text-base'} pr-10 sm:pr-12 border-2 border-gray-200 focus:border-blue-500 transition-colors`}
                    />
                    {inputMessage.trim() && !isMobile && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>Press Enter</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isLoading}
                    size="icon"
                    className={`${isMobile ? 'h-10 w-10' : 'h-12 w-12'} bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg transition-all duration-200 touch-manipulation`}
                  >
                    {isLoading ? (
                      <RefreshCw className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} animate-spin`} />
                    ) : (
                      <Send className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                    )}
                  </Button>
                </div>
              </div>

              <div
                className={`${isLightMode ? 'bg-slate-50/80 border-t border-slate-200' : 'bg-slate-900/80 border-t border-white/20'} px-2 py-2 sm:px-4 sm:py-3`}
                aria-label="Quick monthly analysis controls"
              >
                <div className="flex flex-col gap-2 sm:gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className={`text-xs ${isLightMode ? 'text-slate-600' : 'text-white/70'} font-medium`}>Quick Analysis</div>
                    {!isMobile && (
                      <div className="hidden sm:flex sm:flex-1 sm:justify-end">
                        {quickAnalysisSummary}
                      </div>
                    )}
                    {isMobile && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowQuickFilters(prev => !prev)}
                        className={`${isLightMode ? 'text-slate-600 hover:bg-slate-200' : 'text-white hover:bg-white/10'} h-8 px-3 text-xs flex items-center gap-1`}
                        aria-expanded={showQuickFilters}
                        aria-controls="quick-filters-panel"
                      >
                        {showQuickFilters ? 'Hide' : 'Analyse'}
                        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${showQuickFilters ? 'rotate-180' : ''}`} />
                      </Button>
                    )}
                  </div>

                  {isMobile && (
                    <div>{quickAnalysisSummary}</div>
                  )}

                  <div
                    id="quick-filters-panel"
                    className={`${isMobile ? (showQuickFilters ? 'grid grid-cols-1 gap-2' : 'hidden') : 'grid grid-cols-1 gap-2'} md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] md:gap-2 lg:gap-3`}
                  >
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger className={`${isLightMode ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-800/90 border-white/30 text-white'} h-10 sm:h-9 text-sm`}>
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        <SelectItem value="all">All months</SelectItem>
                        {monthOptions.map(month => {
                          const value = String(month.month).padStart(2, '0');
                          const key = `${month.year}-${value}`;
                          const label = selectedYear && selectedYear !== 'all'
                            ? `${month.monthName} (${month.count})`
                            : `${month.monthName} ${month.year} (${month.count})`;
                          return (
                            <SelectItem key={key} value={value}>
                              {label}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>

                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className={`${isLightMode ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-800/90 border-white/30 text-white'} h-10 sm:h-9 text-sm`}>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        <SelectItem value="all">All years</SelectItem>
                        {availableYears.map(year => (
                          <SelectItem key={year} value={String(year)}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className={`${isLightMode ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-800/90 border-white/30 text-white'} h-10 sm:h-9 text-sm`}>
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        <SelectItem value="all">
                          <div className="flex items-center gap-2">
                            <span className="text-lg leading-none">{DEFAULT_CATEGORY_ICON}</span>
                            <span>All categories</span>
                          </div>
                        </SelectItem>
                        {categoryOptions.map(category => {
                          const icon = resolveCategoryIcon(category);
                          return (
                            <SelectItem key={category} value={category}>
                              <div className="flex items-center gap-2">
                                <span className="text-lg leading-none">{icon}</span>
                                <span>{category}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>

                    <Button
                      type="button"
                      onClick={handleQuickMonthAnalysis}
                      disabled={
                        isLoading ||
                        !selectedMonth ||
                        (selectedMonth !== 'all' && (!selectedYear || selectedYear === 'all'))
                      }
                      className={`h-10 sm:h-9 text-sm w-full md:w-auto ${isLightMode ? 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white' : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white'} shadow-lg`}
                    >
                      Run Analysis
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Enhanced Sidebar - Mobile Responsive */}
          <div className={`space-y-4 ${isMobile ? (showMobileSidebar ? 'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm' : 'hidden') : ''}`}>
            {isMobile && showMobileSidebar && (
              <>
                {/* Backdrop - Click to close */}
                <div 
                  className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                  onClick={() => setShowMobileSidebar(false)}
                />
                
                {/* Sidebar Panel */}
                <div 
                  className="fixed inset-y-0 right-0 w-80 max-w-[85vw] bg-white shadow-2xl z-50 overflow-y-auto"
                  onTouchStart={handleSidebarTouchStart}
                  onTouchEnd={handleSidebarTouchEnd}
                >
                  {/* Header with prominent close button */}
                  <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowMobileSidebar(false)}
                      className="h-10 w-10 border-2 border-gray-300 hover:border-red-400 hover:bg-red-50 transition-all duration-200"
                      title="Close sidebar"
                    >
                      <X className="h-5 w-5 text-gray-600 hover:text-red-600" />
                    </Button>
                  </div>
                  
                  {/* Content */}
                  <div className="px-4 py-3 space-y-3">
                    {/* Mobile Sidebar Content */}
                    {renderSidebarContent()}
                  </div>
                  
                  {/* Bottom close button for easy access */}
                  <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowMobileSidebar(false)}
                      className="w-full h-12 border-2 border-gray-300 hover:border-red-400 hover:bg-red-50 transition-all duration-200 text-gray-800 hover:text-red-600 font-semibold bg-white"
                    >
                      <X className="h-4 w-4 mr-2 text-gray-600" />
                      <span className="text-gray-800">Close</span>
                    </Button>
                  </div>
                </div>
              </>
            )}
            
            {/* Desktop Sidebar */}
            {!isMobile && (
              <div className="space-y-4">
                {renderSidebarContent()}
              </div>
            )}
          </div>
        </div>
      </div>

      {isMobile && (
        <div className="max-w-[90rem] mx-auto px-2 sm:px-4 pb-6">
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <Card className={`p-3 ${statCardClass}`}>
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg flex-shrink-0 ${isLightMode ? 'bg-indigo-100' : 'bg-blue-500/30'}`}>
                  <DollarSign className={`h-4 w-4 ${isLightMode ? 'text-indigo-600' : 'text-blue-200'}`} />
                </div>
                <div className="min-w-0">
                  <p className={`${statLabelClass} text-xs truncate`}>Expenses</p>
                  <p className={`text-sm font-semibold truncate ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                    ₹{expenses.reduce((sum, expense) => sum + expense.amount, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </Card>

            <Card className={`p-3 ${statCardClass}`}>
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg flex-shrink-0 ${isLightMode ? 'bg-green-100' : 'bg-green-500/30'}`}>
                  <BarChart3 className={`h-4 w-4 ${isLightMode ? 'text-green-600' : 'text-green-200'}`} />
                </div>
                <div className="min-w-0">
                  <p className={`${statLabelClass} text-xs truncate`}>Transactions</p>
                  <p className={`text-sm font-semibold truncate ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{expenses.length}</p>
                </div>
              </div>
            </Card>

            <Card className={`p-3 ${statCardClass}`}>
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg flex-shrink-0 ${isLightMode ? 'bg-purple-100' : 'bg-purple-500/30'}`}>
                  <PieChart className={`h-4 w-4 ${isLightMode ? 'text-purple-600' : 'text-purple-200'}`} />
                </div>
                <div className="min-w-0">
                  <p className={`${statLabelClass} text-xs truncate`}>Top Category</p>
                  <p className={`text-sm font-semibold truncate ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{getTopCategory().category}</p>
                </div>
              </div>
            </Card>

            <Card className={`p-3 ${statCardClass}`}>
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg flex-shrink-0 ${isLightMode ? 'bg-orange-100' : 'bg-orange-500/30'}`}>
                  <TrendingUp className={`h-4 w-4 ${isLightMode ? 'text-orange-600' : 'text-orange-200'}`} />
                </div>
                <div className="min-w-0">
                  <p className={`${statLabelClass} text-xs truncate`}>Categories</p>
                  <p className={`text-sm font-semibold truncate ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{new Set(expenses.map(e => e.category)).size}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );

  // Sidebar content renderer
  function renderSidebarContent() {
    return (
      <>
        {/* AI Features */}
        <Card className={`${isMobile ? 'p-3' : 'p-4'} bg-white/95 backdrop-blur-sm border-2 border-blue-100`}>
          <h3 className={`font-semibold text-gray-900 ${isMobile ? 'mb-2' : 'mb-3'} flex items-center gap-2`}>
            <Zap className="h-4 w-4 text-blue-500" />
            AI Features
          </h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Star className="h-3 w-3 text-yellow-500" />
              <span>Smart Analysis</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Brain className="h-3 w-3 text-purple-500" />
              <span>Personalized Tips</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Target className="h-3 w-3 text-green-500" />
              <span>Goal Tracking</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Shield className="h-3 w-3 text-blue-500" />
              <span>Secure & Private</span>
            </div>
          </div>
        </Card>

        {/* Quick Stats */}
        <Card className={`${isMobile ? 'p-3' : 'p-4'} bg-white/95 backdrop-blur-sm`}>
          <h3 className={`font-semibold text-gray-900 ${isMobile ? 'mb-2' : 'mb-3'} flex items-center gap-2`}>
            <TrendingUp className="h-4 w-4" />
            Financial Overview
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-700 font-medium">Total Expenses:</span>
              <span className="font-bold text-lg text-gray-900">₹{expenses.reduce((sum, expense) => sum + expense.amount, 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700 font-medium">Transactions:</span>
              <span className="font-bold text-gray-900">{expenses.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700 font-medium">Categories:</span>
              <span className="font-bold text-gray-900">{new Set(expenses.map(e => e.category)).size}</span>
            </div>
            <div className="pt-2 border-t">
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-700 text-xs font-medium">Top Category</span>
                <span className="text-xs text-gray-900 font-semibold">{getTopCategory().category}</span>
              </div>
              <Progress 
                value={expenses.length > 0 ? (getTopCategory().amount / expenses.reduce((sum, expense) => sum + expense.amount, 0)) * 100 : 0} 
                className="h-2"
              />
            </div>
          </div>
        </Card>

        {/* Suggested Questions */}
        <Card className={`${isMobile ? 'p-3' : 'p-4'} bg-white/95 backdrop-blur-sm`}>
          <h3 className={`font-semibold text-gray-900 ${isMobile ? 'mb-2' : 'mb-3'} flex items-center gap-2`}>
            <Lightbulb className="h-4 w-4" />
            Quick Questions
          </h3>
          <div className="space-y-2">
            {suggestedQuestions.slice(0, showAllQuestions ? suggestedQuestions.length : (isMobile ? 4 : 6)).map((question, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!hasInitialized) {
                    await initializeChat();
                  }
                  handleSuggestedQuestion(question);
                  if (isMobile) {
                    setShowMobileSidebar(false);
                  }
                }}
                className="w-full text-left justify-start h-auto p-2 sm:p-3 text-xs leading-relaxed text-black hover:text-black hover:bg-blue-50 border-gray-200 hover:border-blue-300 transition-all duration-200 touch-manipulation"
              >
                <ChevronRight className="h-3 w-3 mr-2 text-gray-400 flex-shrink-0" />
                <span className="truncate">{question}</span>
              </Button>
            ))}
            {suggestedQuestions.length > (isMobile ? 4 : 6) && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1"
                onClick={() => {
                  setShowAllQuestions(!showAllQuestions);
                }}
              >
                {showAllQuestions ? (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    Show Less Questions
                  </>
                ) : (
                  <>
                    <ChevronRight className="h-3 w-3" />
                    View More Questions ({suggestedQuestions.length - (isMobile ? 4 : 6)} more)
                  </>
                )}
              </Button>
            )}
          </div>
        </Card>

        {/* Enhanced Tips */}
        <Card className={`${isMobile ? 'p-3' : 'p-4'} bg-white/95 backdrop-blur-sm`}>
          <h3 className={`font-semibold text-gray-900 ${isMobile ? 'mb-2' : 'mb-3'} flex items-center gap-2`}>
            <Target className="h-4 w-4" />
            Pro Tips
          </h3>
          <div className="space-y-3 text-xs text-gray-600">
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
              <p>Ask specific questions about your spending patterns</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></div>
              <p>Request budget recommendations based on your data</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-1.5 flex-shrink-0"></div>
              <p>Get insights on how to save money</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></div>
              <p>Analyze trends in your expense categories</p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-2 text-xs text-blue-600">
              <MessageCircle className="h-3 w-3" />
              <span>Start a conversation to get personalized advice!</span>
            </div>
          </div>
        </Card>
      </>
    );
  }
};

export default AIAgent;
