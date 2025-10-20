import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  BookOpen, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  ExternalLink,
  DollarSign,
  CreditCard,
  PieChart,
  BarChart3,
  Settings,
  Target,
  TrendingUp,
  Calendar,
  Plus,
  Trash,
  Wallet,
  Bot,
  Repeat,
  Tag,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Star,
  Zap,
  Shield,
  Smartphone,
  Globe
} from 'lucide-react';

const LearnMore = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<'guide' | 'about'>('guide');
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());

  const toggleFeature = (featureId: string) => {
    const newExpanded = new Set(expandedFeatures);
    if (newExpanded.has(featureId)) {
      newExpanded.delete(featureId);
    } else {
      newExpanded.add(featureId);
    }
    setExpandedFeatures(newExpanded);
  };

  const features = [
    {
      id: 'expense-tracking',
      title: 'Expense Tracking',
      icon: <DollarSign className="h-6 w-6" />,
      description: 'Track your daily expenses with ease',
      details: [
  'Add expenses with date, amount, category, and description',
        'Support for both cash and credit card payments',
        'Real-time budget monitoring and warnings',
        'Excel import functionality for bulk expense entry',
        'Automatic expense categorization and validation',
        'Edit and delete expense entries as needed',
        'View expense history with filtering options'
      ]
    },
    {
      id: 'credit-card-management',
      title: 'Credit Card Management',
      icon: <CreditCard className="h-6 w-6" />,
      description: 'Manage your credit card expenses and payments',
      details: [
        'Track credit card expenses separately from cash expenses',
        'View credit card debt by category with financial metrics',
        'Pay credit card dues individually or in bulk',
        'Monitor credit card impact on your budget',
        'Real-time updates when payments are made',
        'Add new credit card expenses directly from the modal',
        'Track total credit card bill and payment history'
      ]
    },
    {
      id: 'budget-management',
      title: 'Budget Management',
      icon: <Target className="h-6 w-6" />,
      description: 'Create and manage monthly budgets',
      details: [
        'Set monthly budgets for different categories',
        'Track remaining budget with visual indicators',
        'Budget carryover functionality for unused amounts',
        'Real-time budget warnings and alerts',
        'Accumulated balance tracking across months',
        'Category-wise budget monitoring',
        'Budget vs actual spending comparisons'
      ]
    },
    {
      id: 'analytics',
      title: 'Analytics & Insights',
      icon: <BarChart3 className="h-6 w-6" />,
      description: 'Comprehensive financial analytics',
      details: [
        'Monthly and yearly expense analysis',
        'Category-wise spending breakdown',
        'Trend analysis and spending patterns',
        'Visual charts and graphs for better understanding',
        'Export functionality for reports',
        'Monthly comparison features',
        'Spending trend identification'
      ]
    },
    {
      id: 'automation',
      title: 'Expense Automation',
      icon: <Repeat className="h-6 w-6" />,
      description: 'Automate recurring expenses',
      details: [
        'Set up recurring expenses for regular bills',
        'Automatic expense entry on scheduled dates',
        'Flexible scheduling (daily, weekly, monthly)',
        'Easy management of recurring expense patterns',
        'Notification system for upcoming payments',
        'Edit and delete recurring expense schedules',
        'Time-based recurring expense management'
      ]
    },
    {
      id: 'ai-agent',
      title: 'AI Financial Assistant',
      icon: <Bot className="h-6 w-6" />,
      description: 'Get AI-powered financial insights',
      details: [
        'Intelligent expense categorization',
        'Personalized spending recommendations',
        'Financial goal tracking and suggestions',
        'Natural language queries about your finances',
        'Smart alerts and notifications',
        'Mobile-optimized AI chat interface',
        'Context-aware financial advice'
      ]
    },
    {
      id: 'credit-management',
      title: 'Credit Management',
      icon: <Wallet className="h-6 w-6" />,
      description: 'Track and manage your income and credits',
      details: [
        'Add credits and income entries with descriptions',
        'Track total accumulated credits in dashboard',
        'View recent credits with edit and delete options',
        'Monitor unassigned credits for flexible spending',
        'Income tracking for salary, freelance, and other sources',
        'Credit history and transaction management',
        'Integration with expense tracking for complete financial picture'
      ]
    }
  ];

  const steps = [
    {
      step: 1,
      title: 'Create Your Account',
      description: 'Sign up with your email and create a secure account',
      icon: <User className="h-8 w-8" />
    },
    {
      step: 2,
      title: 'Set Up Your Profile',
      description: 'Add your personal information and set initial preferences',
      icon: <Settings className="h-8 w-8" />
    },
    {
      step: 3,
      title: 'Create Categories',
      description: 'Set up expense categories that match your spending habits',
      icon: <Tag className="h-8 w-8" />
    },
    {
      step: 4,
      title: 'Set Monthly Budgets',
      description: 'Define monthly budgets for each category',
      icon: <Target className="h-8 w-8" />
    },
    {
      step: 5,
      title: 'Start Tracking Expenses',
      description: 'Add your daily expenses and watch your budget in real-time',
      icon: <Plus className="h-8 w-8" />
    },
    {
      step: 6,
      title: 'Monitor & Analyze',
      description: 'Review your spending patterns and adjust budgets as needed',
      icon: <TrendingUp className="h-8 w-8" />
    }
  ];

  const pageWrapperClass = 'min-h-screen relative overflow-hidden bg-[color:var(--surface-base)] text-foreground';
  const headerBarClass = 'border-b border-[color:var(--border-soft)] bg-[color:var(--surface-overlay)]/80 backdrop-blur-xl';
  const sectionCardClass = 'border border-[color:var(--border-soft)] bg-[color:var(--surface-overlay)] backdrop-blur-sm shadow-sm';
  const featureTileClass = 'rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-muted)] hover:bg-[color:var(--surface-muted-hover)] transition-colors';
  const badgeClass = 'flex items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-overlay)] px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm text-muted-foreground';

  return (
    <div className={pageWrapperClass}>
      {/* Header */}
      <div className={headerBarClass}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/')}
                className="glass-button border border-[color:var(--border-soft)] bg-[color:var(--surface-overlay)] text-foreground hover:bg-[color:var(--surface-muted)] h-8 sm:h-10 px-2 sm:px-3"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <div className="h-4 sm:h-6 w-px bg-[color:var(--border-soft)]" />
              <h1 className="text-lg sm:text-xl font-bold">Learn More</h1>
            </div>
            
            {/* Navigation Tabs */}
            <div className="flex gap-1 sm:gap-2">
              <Button
                variant="ghost"
                onClick={() => setActiveSection('guide')}
                className={`h-8 sm:h-10 px-2 sm:px-3 text-xs sm:text-sm rounded-xl transition-colors ${
                  activeSection === 'guide' 
                    ? 'bg-gradient-primary text-primary-foreground shadow-lg hover:opacity-90 border border-transparent'
                    : 'border border-[color:var(--border-soft)] bg-[color:var(--surface-overlay)] text-muted-foreground hover:bg-[color:var(--surface-muted)]'
                }`}
              >
                <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">User Guide</span>
                <span className="sm:hidden">Guide</span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => setActiveSection('about')}
                className={`h-8 sm:h-10 px-2 sm:px-3 text-xs sm:text-sm rounded-xl transition-colors ${
                  activeSection === 'about' 
                    ? 'bg-gradient-primary text-primary-foreground shadow-lg hover:opacity-90 border border-transparent'
                    : 'border border-[color:var(--border-soft)] bg-[color:var(--surface-overlay)] text-muted-foreground hover:bg-[color:var(--surface-muted)]'
                }`}
              >
                <User className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">About Us</span>
                <span className="sm:hidden">About</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {activeSection === 'guide' ? (
          <div className="space-y-8">
            {/* Hero Section */}
            <div className="text-center space-y-3 sm:space-y-4">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold px-2">
                Welcome to TrackExp
              </h2>
              <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
                Your comprehensive personal finance management solution. 
                Track expenses, manage budgets, and gain insights into your spending habits.
              </p>
              <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mt-4 sm:mt-6 px-4">
                <Badge className={`${badgeClass} bg-green-500/15 text-green-500 border-green-500/20`}>
                  <Shield className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Secure & Private</span>
                  <span className="sm:hidden">Secure</span>
                </Badge>
                <Badge className={`${badgeClass} bg-blue-500/15 text-blue-500 border-blue-500/20`}>
                  <Smartphone className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Mobile Friendly</span>
                  <span className="sm:hidden">Mobile</span>
                </Badge>
                <Badge className={`${badgeClass} bg-purple-500/15 text-purple-500 border-purple-500/20`}>
                  <Zap className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Real-time Updates</span>
                  <span className="sm:hidden">Real-time</span>
                </Badge>
              </div>
            </div>

            {/* Getting Started Steps */}
            <Card className={sectionCardClass}>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-xl sm:text-2xl flex items-center gap-2 sm:gap-3">
                  <Star className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" />
                  Getting Started
                </CardTitle>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Follow these simple steps to set up your personal finance tracking
                </p>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {steps.map((step, index) => (
                    <div key={step.step} className="relative">
                      <div className={`${featureTileClass} flex items-start gap-3 sm:gap-4 p-3 sm:p-4`}>
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white">
                            <div className="w-5 h-5 sm:w-6 sm:h-6">
                              {step.icon}
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 sm:mb-2">
                            <span className="text-xs sm:text-sm font-medium text-primary">Step {step.step}</span>
                            {index < steps.length - 1 && (
                              <div className="hidden lg:block absolute top-5 sm:top-6 -right-3 w-6 h-px bg-gradient-to-r from-blue-500/60 to-transparent" />
                            )}
                          </div>
                          <h3 className="font-semibold mb-1 text-sm sm:text-base">{step.title}</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Key Features */}
            <Card className={sectionCardClass}>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-xl sm:text-2xl flex items-center gap-2 sm:gap-3">
                  <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" />
                  Key Features & How to Use Them
                </CardTitle>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Discover the powerful features that make TrackExp your perfect finance companion. Click on any feature to learn how to use it.
                </p>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {features.map((feature) => (
                    <Card
                      key={feature.id}
                      className={`${sectionCardClass} transition-colors hover:bg-[color:var(--surface-muted-hover)]`}
                    >
                      <CardHeader
                        className="cursor-pointer p-3 sm:p-4"
                        onClick={() => toggleFeature(feature.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                            <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white flex-shrink-0">
                              <div className="w-4 h-4 sm:w-5 sm:h-5">
                                {feature.icon}
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <CardTitle className="text-base sm:text-lg truncate">{feature.title}</CardTitle>
                              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{feature.description}</p>
                            </div>
                          </div>
                          <div className="flex-shrink-0 ml-2 text-muted-foreground">
                            {expandedFeatures.has(feature.id) ? (
                              <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5" />
                            ) : (
                              <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5" />
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      {expandedFeatures.has(feature.id) && (
                        <CardContent className="pt-0 p-3 sm:p-4">
                          <ul className="space-y-2 sm:space-y-3">
                            {feature.details.map((detail, index) => (
                              <li key={index} className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground">
                                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <span className="leading-relaxed">{detail}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Detailed Feature Usage Guide */}
            <Card className={sectionCardClass}>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-xl sm:text-2xl flex items-center gap-2 sm:gap-3">
                  <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
                  Detailed Feature Usage Guide
                </CardTitle>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Step-by-step instructions on how to use each feature effectively
                </p>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="space-y-6 sm:space-y-8">
                  {/* Expense Tracking */}
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="p-2 sm:p-3 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-white flex-shrink-0">
                        <DollarSign className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg sm:text-xl font-semibold">Expense Tracking</h3>
                        <p className="text-sm sm:text-base text-muted-foreground">How to add and manage your daily expenses</p>
                      </div>
                    </div>
                    <div className="rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-muted)] p-4 sm:p-6 space-y-3 sm:space-y-4">
                      <div>
                        <h4 className="text-base sm:text-lg font-medium mb-2">Adding a New Expense</h4>
                        <ol className="space-y-2 text-muted-foreground">
                          <li className="flex items-start gap-2">
                            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full mt-0.5 flex-shrink-0">1</span>
                            <span className="text-sm sm:text-base">Click the <strong className="text-foreground">"Add New Expense"</strong> button on your dashboard</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">2</span>
                            <span>Select your <strong className="text-foreground">payment method</strong> (Cash or Credit Card)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">3</span>
                            <span>Choose the appropriate <strong className="text-foreground">category</strong> from the dropdown</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">4</span>
                            <span>Enter the <strong className="text-foreground">amount</strong> spent</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">5</span>
                            <span>Add a brief <strong className="text-foreground">description</strong> (optional but recommended)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">6</span>
                            <span>Select the <strong className="text-foreground">date</strong> of the expense</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">7</span>
                            <span>Click <strong className="text-foreground">"Add Expense"</strong> to save</span>
                          </li>
                        </ol>
                      </div>
                      <div>
                        <h4 className="text-lg font-medium mb-2">Excel Import Feature</h4>
                        <ol className="space-y-2 text-muted-foreground">
                          <li className="flex items-start gap-2">
                            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">1</span>
                            <span>In the Add Expense modal, click <strong className="text-foreground">"Import from Excel"</strong></span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">2</span>
                            <span>Select your Excel file with columns: Date, Amount, Category, Description</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">3</span>
                            <span>Review the imported data and click <strong className="text-foreground">"Import All"</strong></span>
                          </li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  {/* Credit Card Management */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white">
                        <CreditCard className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">Credit Card Management</h3>
                        <p className="text-muted-foreground">Managing credit card expenses and payments</p>
                      </div>
                    </div>
                    <div className="rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-muted)] p-6 space-y-4">
                      <div>
                        <h4 className="text-lg font-medium mb-2">Adding Credit Card Expenses</h4>
                        <ol className="space-y-2 text-muted-foreground">
                          <li className="flex items-start gap-2">
                            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">1</span>
                            <span>When adding an expense, select <strong className="text-foreground">"Credit Card"</strong> as payment method</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">2</span>
                            <span>The expense will be automatically saved to your credit card records</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">3</span>
                            <span>View all credit card expenses in the <strong className="text-foreground">"Credit Card Expenses by Category"</strong> section</span>
                          </li>
                        </ol>
                      </div>
                      <div>
                        <h4 className="text-lg font-medium mb-2">Paying Credit Card Dues</h4>
                        <ol className="space-y-2 text-muted-foreground">
                          <li className="flex items-start gap-2">
                            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">1</span>
                            <span>Click <strong className="text-foreground">"View Credit Card Entries"</strong> button</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">2</span>
                            <span>Select individual expenses or use <strong className="text-foreground">"Select All"</strong> for bulk payment</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">3</span>
                            <span>Click <strong className="text-foreground">"Pay Due"</strong> or <strong className="text-foreground">"Pay Selected"</strong></span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">4</span>
                            <span>The paid expenses will be moved to your regular expense records</span>
                          </li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  {/* Budget Management */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                        <Target className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">Budget Management</h3>
                        <p className="text-muted-foreground">Setting up and managing monthly budgets</p>
                      </div>
                    </div>
                    <div className="rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-muted)] p-6 space-y-4">
                      <div>
                        <h4 className="text-lg font-medium mb-2">Creating Monthly Budgets</h4>
                        <ol className="space-y-2 text-muted-foreground">
                          <li className="flex items-start gap-2">
                            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">1</span>
                            <span>Click <strong className="text-foreground">"Manage Budget"</strong> in the dashboard</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">2</span>
                            <span>Select the month and year for your budget</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">3</span>
                            <span>Set budget amounts for each category</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">4</span>
                            <span>Enable <strong className="text-foreground">"Carryover"</strong> if you want unused budget to carry to next month</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">5</span>
                            <span>Click <strong className="text-foreground">"Save Budget"</strong> to apply</span>
                          </li>
                        </ol>
                      </div>
                      <div>
                        <h4 className="text-lg font-medium mb-2">Monitoring Budget Progress</h4>
                        <ul className="space-y-2 text-muted-foreground">
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>View real-time budget status in the <strong className="text-foreground">"Category Summary"</strong> section</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Get automatic warnings when approaching budget limits</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Track <strong className="text-foreground">"Remaining Balance"</strong> and <strong className="text-foreground">"Accumulated Balance"</strong></span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Analytics */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                        <BarChart3 className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">Analytics & Insights</h3>
                        <p className="text-muted-foreground">Understanding your spending patterns</p>
                      </div>
                    </div>
                    <div className="rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-muted)] p-6 space-y-4">
                      <div>
                        <h4 className="text-lg font-medium mb-2">Accessing Analytics</h4>
                        <ol className="space-y-2 text-muted-foreground">
                          <li className="flex items-start gap-2">
                            <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">1</span>
                            <span>Click <strong className="text-foreground">"Analytics"</strong> in the main navigation</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">2</span>
                            <span>Select the time period you want to analyze</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">3</span>
                            <span>View detailed charts and spending breakdowns</span>
                          </li>
                        </ol>
                      </div>
                      <div>
                        <h4 className="text-lg font-medium mb-2">Available Analytics</h4>
                        <ul className="space-y-2 text-muted-foreground">
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span><strong className="text-foreground">Monthly Comparison:</strong> Compare spending across different months</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span><strong className="text-foreground">Category Breakdown:</strong> See which categories consume most of your budget</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span><strong className="text-foreground">Trend Analysis:</strong> Track spending patterns over time</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Automation */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                        <Repeat className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">Expense Automation</h3>
                        <p className="text-muted-foreground">Setting up recurring expenses</p>
                      </div>
                    </div>
                    <div className="rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-muted)] p-6 space-y-4">
                      <div>
                        <h4 className="text-lg font-medium mb-2">Creating Recurring Expenses</h4>
                        <ol className="space-y-2 text-muted-foreground">
                          <li className="flex items-start gap-2">
                            <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">1</span>
                            <span>Go to <strong className="text-foreground">"Recurring Expenses"</strong> section in your dashboard</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">2</span>
                            <span>Click <strong className="text-foreground">"Add Recurring Expense"</strong></span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">3</span>
                            <span>Fill in the expense details (date, amount, category, description)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">4</span>
                            <span>Set the <strong className="text-foreground">frequency</strong> (daily, weekly, monthly)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">5</span>
                            <span>Choose the <strong className="text-foreground">start date</strong> and optional end date</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">6</span>
                            <span>Save the recurring expense - it will be automatically added on schedule</span>
                          </li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  {/* AI Agent */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
                        <Bot className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">AI Financial Assistant</h3>
                        <p className="text-muted-foreground">Get AI-powered insights and recommendations</p>
                      </div>
                    </div>
                    <div className="rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-muted)] p-6 space-y-4">
                      <div>
                        <h4 className="text-lg font-medium mb-2">Using the AI Agent</h4>
                        <ol className="space-y-2 text-muted-foreground">
                          <li className="flex items-start gap-2">
                            <span className="bg-indigo-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">1</span>
                            <span>Click <strong className="text-foreground">"AI Agent"</strong> in the main navigation</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-indigo-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">2</span>
                            <span>Type your financial questions or requests in natural language</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-indigo-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">3</span>
                            <span>Get personalized insights based on your spending data</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-indigo-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">4</span>
                            <span>Ask for budget recommendations, spending analysis, or financial tips</span>
                          </li>
                        </ol>
                      </div>
                      <div>
                        <h4 className="text-lg font-medium mb-2">Example AI Queries</h4>
                        <ul className="space-y-2 text-muted-foreground">
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span><strong className="text-foreground">"How much did I spend on food this month?"</strong></span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span><strong className="text-foreground">"What's my biggest expense category?"</strong></span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span><strong className="text-foreground">"Suggest a budget for next month"</strong></span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Credit Management */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
                        <Wallet className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">Credit Management</h3>
                        <p className="text-muted-foreground">Track and manage your income and credits</p>
                      </div>
                    </div>
                    <div className="rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-muted)] p-6 space-y-4">
                      <div>
                        <h4 className="text-lg font-medium mb-2">Adding Credits/Income</h4>
                        <ol className="space-y-2 text-muted-foreground">
                          <li className="flex items-start gap-2">
                            <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">1</span>
                            <span>Click <strong className="text-foreground">"Add Credit"</strong> button in the dashboard</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">2</span>
                            <span>Enter the <strong className="text-foreground">amount</strong> of credit/income received</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">3</span>
                            <span>Add a <strong className="text-foreground">description</strong> (e.g., "Salary", "Freelance Payment", "Refund")</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">4</span>
                            <span>Select the <strong className="text-foreground">date</strong> when the credit was received</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">5</span>
                            <span>Click <strong className="text-foreground">"Add Credit"</strong> to save the entry</span>
                          </li>
                        </ol>
                      </div>
                      <div>
                        <h4 className="text-lg font-medium mb-2">Managing Credits</h4>
                        <ul className="space-y-2 text-muted-foreground">
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>View all credits in the <strong className="text-foreground">"Recent Credits"</strong> section</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Edit credit entries by clicking the <strong className="text-foreground">edit</strong> button</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Delete incorrect entries using the <strong className="text-foreground">delete</strong> button</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Track <strong className="text-foreground">"Total Accumulated"</strong> credits in the dashboard</span>
                          </li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-lg font-medium mb-2">Unassigned Credits</h4>
                        <ul className="space-y-2 text-muted-foreground">
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>View <strong className="text-foreground">"Unassigned Credits"</strong> in the dashboard summary</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Credits that haven't been assigned to specific categories</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Use these for flexible spending or emergency funds</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Features */}
            <Card className={sectionCardClass}>
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-3">
                  <Settings className="h-6 w-6 text-slate-500" />
                  Additional Features & Management
                </CardTitle>
                <p className="text-muted-foreground">
                  Learn about other important features for managing your finances
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Transaction Management */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-gradient-to-r from-gray-500 to-gray-600 text-white">
                        <Trash className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">Transaction Management</h3>
                        <p className="text-muted-foreground">Edit, delete, and organize your financial records</p>
                      </div>
                    </div>
                    <div className="rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-muted)] p-6 space-y-4">
                      <div>
                        <h4 className="text-lg font-medium mb-2">Managing Your Transactions</h4>
                        <ol className="space-y-2 text-muted-foreground">
                          <li className="flex items-start gap-2">
                            <span className="bg-gray-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">1</span>
                            <span>Click <strong className="text-foreground">"Manage Transactions"</strong> button in the navbar</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-gray-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">2</span>
                            <span>View all your expense and credit transactions in one place</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-gray-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">3</span>
                            <span>Use the <strong className="text-foreground">edit</strong> button to modify transaction details</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-gray-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">4</span>
                            <span>Use the <strong className="text-foreground">delete</strong> button to remove incorrect entries</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-gray-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">5</span>
                            <span>Filter transactions by date, category, or amount</span>
                          </li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  {/* Category Management */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 text-white">
                        <Tag className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">Category Management</h3>
                        <p className="text-muted-foreground">Organize your expenses with custom categories</p>
                      </div>
                    </div>
                    <div className="rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-muted)] p-6 space-y-4">
                      <div>
                        <h4 className="text-lg font-medium mb-2">Creating and Managing Categories</h4>
                        <ol className="space-y-2 text-muted-foreground">
                          <li className="flex items-start gap-2">
                            <span className="bg-cyan-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">1</span>
                            <span>Go to <strong className="text-foreground">"Customize Category"</strong> in the mobile menu or settings</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-cyan-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">2</span>
                            <span>Click <strong className="text-foreground">"Add New Category"</strong> to create custom categories</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-cyan-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">3</span>
                            <span>Edit existing categories to better match your spending habits</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-cyan-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">4</span>
                            <span>Delete unused categories to keep your list organized</span>
                          </li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  {/* Monthly Income Management */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                        <Wallet className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">Monthly Income Management</h3>
                        <p className="text-muted-foreground">Track and manage your monthly income sources</p>
                      </div>
                    </div>
                    <div className="rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-muted)] p-6 space-y-4">
                      <div>
                        <h4 className="text-lg font-medium mb-2">Adding Monthly Income</h4>
                        <ol className="space-y-2 text-muted-foreground">
                          <li className="flex items-start gap-2">
                            <span className="bg-emerald-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">1</span>
                            <span>Click <strong className="text-foreground">"Add Monthly Income"</strong> in the lower navbar</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-emerald-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">2</span>
                            <span>Enter your monthly income amount</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-emerald-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">3</span>
                            <span>Select the month and year for the income</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-emerald-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">4</span>
                            <span>Add a description (e.g., "Salary", "Freelance", "Investment")</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-emerald-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">5</span>
                            <span>Save to track your income against expenses</span>
                          </li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  {/* Credit Management */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
                        <Wallet className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">Credit Management</h3>
                        <p className="text-muted-foreground">Track and manage your income and credits</p>
                      </div>
                    </div>
                    <div className="rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-muted)] p-6 space-y-4">
                      <div>
                        <h4 className="text-lg font-medium mb-2">Adding Credits/Income</h4>
                        <ol className="space-y-2 text-muted-foreground">
                          <li className="flex items-start gap-2">
                            <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">1</span>
                            <span>Click <strong className="text-foreground">"Add Credit"</strong> button in the dashboard</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">2</span>
                            <span>Enter the <strong className="text-foreground">amount</strong> of credit/income received</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">3</span>
                            <span>Add a <strong className="text-foreground">description</strong> (e.g., "Salary", "Freelance Payment", "Refund")</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">4</span>
                            <span>Select the <strong className="text-foreground">date</strong> when the credit was received</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">5</span>
                            <span>Click <strong className="text-foreground">"Add Credit"</strong> to save the entry</span>
                          </li>
                        </ol>
                      </div>
                      <div>
                        <h4 className="text-lg font-medium mb-2">Managing Credits</h4>
                        <ul className="space-y-2 text-muted-foreground">
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>View all credits in the <strong className="text-foreground">"Recent Credits"</strong> section</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Edit credit entries by clicking the <strong className="text-foreground">edit</strong> button</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Delete incorrect entries using the <strong className="text-foreground">delete</strong> button</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Track <strong className="text-foreground">"Total Accumulated"</strong> credits in the dashboard</span>
                          </li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-lg font-medium mb-2">Unassigned Credits</h4>
                        <ul className="space-y-2 text-muted-foreground">
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>View <strong className="text-foreground">"Unassigned Credits"</strong> in the dashboard summary</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Credits that haven't been assigned to specific categories</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Use these for flexible spending or emergency funds</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Profile Management */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-gradient-to-r from-pink-500 to-pink-600 text-white">
                        <User className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">Profile & Settings</h3>
                        <p className="text-muted-foreground">Customize your account and preferences</p>
                      </div>
                    </div>
                    <div className="rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-muted)] p-6 space-y-4">
                      <div>
                        <h4 className="text-lg font-medium mb-2">Managing Your Profile</h4>
                        <ol className="space-y-2 text-muted-foreground">
                          <li className="flex items-start gap-2">
                            <span className="bg-pink-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">1</span>
                            <span>Click <strong className="text-foreground">"Profile"</strong> in the upper navbar</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-pink-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">2</span>
                            <span>Update your personal information and preferences</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-pink-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">3</span>
                            <span>Change your password and security settings</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="bg-pink-500 text-white text-xs px-2 py-1 rounded-full mt-0.5">4</span>
                            <span>Export your data or manage account settings</span>
                          </li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tips & Best Practices */}
            <Card className={sectionCardClass}>
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-3">
                  <BookOpen className="h-6 w-6 text-emerald-500" />
                  Tips & Best Practices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Getting the Most Out of TrackExp</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                        <div>
                          <p className="font-medium">Set Realistic Budgets</p>
                          <p className="text-sm text-muted-foreground">Start with your current spending patterns and adjust gradually</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-400 mt-2 flex-shrink-0" />
                        <div>
                          <p className="font-medium">Track Daily</p>
                          <p className="text-sm text-muted-foreground">Make it a habit to log expenses as they happen</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                        <div>
                          <p className="font-medium">Use Categories Wisely</p>
                          <p className="text-sm text-muted-foreground">Create specific categories that match your lifestyle</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Advanced Features</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-yellow-400 mt-2 flex-shrink-0" />
                        <div>
                          <p className="font-medium">Excel Import</p>
                          <p className="text-sm text-muted-foreground">Bulk import expenses from spreadsheets</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                        <div>
                          <p className="font-medium">Credit Card Management</p>
                          <p className="text-sm text-muted-foreground">Separate tracking for credit card expenses</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                        <div>
                          <p className="font-medium">Recurring Expenses</p>
                          <p className="text-sm text-muted-foreground">Automate regular bill payments</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* About Us Section */
          <div className="space-y-8 text-foreground">
            {/* Hero Section */}
            <div className="text-center space-y-4 sm:space-y-6">
              <div className="relative inline-block">
                <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto rounded-full bg-gradient-to-r from-blue-500 to-purple-600 p-1">
                  <div className="w-full h-full rounded-full bg-[color:var(--surface-raised)] flex items-center justify-center">
                    <img 
                      src="/photo/me.png" 
                      alt="Arindam Gupta" 
                      className="w-full h-full rounded-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                        if (fallback) {
                          fallback.style.display = 'flex';
                        }
                      }}
                    />
                    <div className="w-full h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl sm:text-4xl font-bold" style={{display: 'none'}}>
                      AG
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 w-6 h-6 sm:w-8 sm:h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-white rounded-full"></div>
                </div>
              </div>
              
              <div className="px-4">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">Arindam Gupta</h2>
                <p className="text-lg sm:text-xl text-muted-foreground mb-3 sm:mb-4">Full Stack Developer & Finance Enthusiast</p>
                <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                  Passionate about creating innovative solutions that help people manage their finances better. 
                  TrackExp is my vision of making personal finance management accessible and intuitive for everyone.
                </p>
              </div>
            </div>

            {/* Contact Information */}
            <Card className="border border-[color:var(--border-soft)] bg-[color:var(--surface-overlay)] backdrop-blur-sm">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-xl sm:text-2xl flex items-center gap-2 sm:gap-3">
                  <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  Contact Information
                </CardTitle>
                <p className="text-sm text-muted-foreground">Reach out anytime - I'm always happy to connect.</p>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-muted)]">
                      <div className="p-2 sm:p-3 rounded-lg bg-[color:var(--surface-overlay)] text-primary flex-shrink-0">
                        <Phone className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm text-muted-foreground">Phone</p>
                        <p className="text-sm sm:text-base font-semibold break-all">+91-8017074226</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-muted)]">
                      <div className="p-3 rounded-lg bg-[color:var(--surface-overlay)] text-green-500">
                        <Mail className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-semibold">arindamgupta077@gmail.com</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-muted)]">
                      <div className="p-3 rounded-lg bg-[color:var(--surface-overlay)] text-purple-500">
                        <MapPin className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Location</p>
                        <p className="font-semibold">Kolkata, India</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-muted)]">
                      <div className="p-3 rounded-lg bg-[color:var(--surface-overlay)] text-primary">
                        <ExternalLink className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">LinkedIn</p>
                        <a 
                          href="https://www.linkedin.com/in/arindam-gupta-462240125/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-2"
                        >
                          Connect with me
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-muted)]">
                      <div className="p-3 rounded-lg bg-[color:var(--surface-overlay)] text-muted-foreground">
                        <Globe className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Availability</p>
                        <p className="font-semibold">Open for opportunities</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* About the Project */}
            <Card className="border border-[color:var(--border-soft)] bg-[color:var(--surface-overlay)] backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-3">
                  <BookOpen className="h-6 w-6 text-green-500" />
                  About TrackExp
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-3">The Vision</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        TrackExp was born from the need for a simple, yet powerful personal finance management tool. 
                        I believe that everyone should have access to tools that help them understand and control their finances, 
                        regardless of their technical background.
                      </p>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-3">The Technology</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        Built with modern web technologies including React, TypeScript, and Supabase, 
                        TrackExp provides a secure, fast, and intuitive experience. The application is designed 
                        to be responsive and accessible across all devices.
                      </p>
                    </div>
                  </div>
                  
                  <div className="rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-muted)] p-6">
                    <h3 className="text-lg font-semibold mb-3">Future Roadmap</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[color:var(--surface-overlay)] flex items-center justify-center text-primary">
                          <Smartphone className="h-6 w-6" />
                        </div>
                        <h4 className="font-medium mb-1">Mobile App</h4>
                        <p className="text-sm text-muted-foreground">Native mobile applications for iOS and Android</p>
                      </div>
                      <div>
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[color:var(--surface-overlay)] flex items-center justify-center text-green-500">
                          <Bot className="h-6 w-6" />
                        </div>
                        <h4 className="font-medium mb-1">AI Features</h4>
                        <p className="text-sm text-muted-foreground">Enhanced AI-powered insights and recommendations</p>
                      </div>
                      <div>
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[color:var(--surface-overlay)] flex items-center justify-center text-purple-500">
                          <Globe className="h-6 w-6" />
                        </div>
                        <h4 className="font-medium mb-1">Multi-currency</h4>
                        <p className="text-sm text-muted-foreground">Support for multiple currencies and international users</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Call to Action */}
            <div className="text-center space-y-3 sm:space-y-4 px-4">
              <h3 className="text-xl sm:text-2xl font-bold">Ready to Get Started?</h3>
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Join thousands of users who are already managing their finances better with TrackExp. 
                Start your journey towards financial freedom today.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                <Button
                  onClick={() => navigate('/')}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 sm:px-8 py-2 sm:py-3 text-sm sm:text-base"
                >
                  Get Started Now
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open('https://www.linkedin.com/in/arindam-gupta-462240125/', '_blank')}
                  className="border-[color:var(--border-soft)] text-foreground hover:bg-[color:var(--surface-muted)] px-6 sm:px-8 py-2 sm:py-3 text-sm sm:text-base"
                >
                  Connect on LinkedIn
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LearnMore;
