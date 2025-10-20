import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Sparkles, UserPlus, LogIn, Mail, AtSign, Lock, User, Phone, Loader2, Info, BookOpen } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { signUpSchema, signInSchema } from '@/lib/validations';

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  general?: string;
}

const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signInLoading, setSignInLoading] = useState(false);
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [googleSignInLoading, setGoogleSignInLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [activeSection, setActiveSection] = useState<'auth' | 'aboutUs' | 'learnMore'>('auth');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  
  const { signIn, signUp, resetPassword, signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const loginModalRef = useRef<HTMLDivElement>(null);
  const learnMoreRef = useRef<HTMLDivElement>(null);
  const aboutUsRef = useRef<HTMLDivElement>(null);
  const previousThemeRef = useRef<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    previousThemeRef.current = root.getAttribute('data-theme');
    root.setAttribute('data-theme', 'dark');

    return () => {
      if (previousThemeRef.current) {
        root.setAttribute('data-theme', previousThemeRef.current);
      } else {
        root.removeAttribute('data-theme');
      }
    };
  }, []);

  const scrollToLoginModal = () => {
    if (loginModalRef.current) {
      loginModalRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const scrollToLearnMore = () => {
    if (learnMoreRef.current) {
      learnMoreRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollToAboutUs = () => {
    if (aboutUsRef.current) {
      aboutUsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const validateForm = () => {
    const newErrors: FormErrors = {};
    const schema = isLogin ? signInSchema : signUpSchema;
    
    try {
      schema.parse(formData);
    } catch (error: any) {
      error.errors?.forEach((err: any) => {
        newErrors[err.path[0] as keyof FormErrors] = err.message;
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    if (isLogin) {
      setSignInLoading(true);
    } else {
      setSignUpLoading(true);
    }
    setErrors({});

    try {
      if (isLogin) {
        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          setErrors({ general: error.message });
        }
      } else {
        const { data, error } = await signUp(formData.email, formData.password, formData.name, formData.phone);
        if (error) {
          setErrors({ general: error.message });
        } else {
          // Success - show email verification message
          const needsEmailConfirmation = data?.user && !data?.session;
          if (needsEmailConfirmation) {
            toast({
              title: "Account created successfully!",
              description: "Please check your email and click the verification link to activate your account.",
            });
          } else {
            toast({
              title: "Account created successfully!",
              description: "Welcome! You can now sign in to your account.",
            });
          }
          // Clear form and switch to login
          setFormData({ name: '', email: '', phone: '', password: '' });
          setIsLogin(true);
        }
      }
    } catch (error: any) {
      setErrors({ general: error.message });
    } finally {
      if (isLogin) {
        setSignInLoading(false);
      } else {
        setSignUpLoading(false);
      }
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!forgotPasswordEmail) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotPasswordEmail)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setForgotPasswordLoading(true);
    
    try {
      const { error } = await resetPassword(forgotPasswordEmail);
      
      if (error) {
        // Handle specific error cases
        let errorMessage = error.message;
        
        if (error.message.includes('Invalid email')) {
          errorMessage = "Please enter a valid email address";
        } else if (error.message.includes('User not found')) {
          // For security, we don't reveal if an email exists or not
          errorMessage = "If an account with this email exists, you will receive a password reset link";
        } else if (error.message.includes('Email not confirmed') || error.message.includes('Email not confirmed')) {
          errorMessage = "Please check your email and confirm your account first";
        } else if (error.message.includes('OAuth')) {
          errorMessage = "This account uses Google sign-in. Please use the 'Sign in with Google' button instead";
        }
        
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        // Always show success message for security (don't reveal if email exists)
        toast({
          title: "Password reset email sent",
          description: "If an account with this email exists, you will receive instructions to reset your password",
        });
        setShowForgotPassword(false);
        setForgotPasswordEmail('');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to send password reset email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleSignInLoading(true);
    setErrors({});

    try {
      const { error } = await signInWithGoogle();
      
      if (error) {
        setErrors({ general: error.message });
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setErrors({ general: error.message });
      toast({
        title: "Error",
        description: "Failed to sign in with Google",
        variant: "destructive",
      });
    } finally {
      setGoogleSignInLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Premium Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-slate-900 to-black" />
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/30 via-transparent to-violet-900/30" />
      <div className="absolute inset-0 bg-gradient-to-bl from-transparent via-green-900/20 to-transparent" />
      
      {/* Animated Gradient Mesh Background */}
      <div className="absolute inset-0 premium-gradient-mesh" />
      
      {/* Animated Grid Pattern */}
      <div className="absolute inset-0 premium-grid-pattern" />
      
      {/* SEO Content - Hidden but accessible to search engines */}
      <div className="sr-only">
        <h1>TrackExp - Best Expense Tracker Application for Personal Finance Management</h1>
        <h2>Free Expense Tracking App with Budget Management and Financial Analytics</h2>
        <p>TrackExp is the leading expense tracker application that helps you manage your personal finances with AI-powered insights, real-time budget tracking, and comprehensive financial analytics. Our expense tracking app offers advanced features including credit card expense management, monthly budget planning, and automated expense categorization.</p>
        
        <h3>Track Expense with Advanced Automation</h3>
        <p>TrackExp provides intelligent expense automation that simplifies your financial management. Our expense automation system automatically categorizes transactions, tracks recurring expenses, and provides smart insights to help you save money and manage your budget effectively.</p>
        
        <h4>Key Features of TrackExp Expense Tracker:</h4>
        <ul>
          <li>Advanced expense tracking and categorization system</li>
          <li>AI-powered financial insights and spending recommendations</li>
          <li>Real-time budget management and budget tracking tools</li>
          <li>Credit card expense tracking and debt management</li>
          <li>Monthly and yearly financial analytics dashboard</li>
          <li>Automated expense processing and smart categorization</li>
          <li>Secure and private financial data management</li>
          <li>Mobile-responsive expense tracking interface</li>
          <li>Multi-currency support for international users</li>
          <li>Bank account integration and transaction sync</li>
          <li>Expense automation for recurring bills and subscriptions</li>
          <li>Smart expense categorization with machine learning</li>
        </ul>
        
        <h5>Advanced Expense Management Features:</h5>
        <ul>
          <li>Smart expense categorization with machine learning</li>
          <li>Recurring expense and subscription tracking</li>
          <li>Bill reminder and payment notifications</li>
          <li>Financial goal setting and progress tracking</li>
          <li>Expense report generation and export</li>
          <li>Tax preparation and deduction tracking</li>
          <li>Investment portfolio integration</li>
          <li>Savings goal tracking and achievement</li>
          <li>Expense automation for seamless financial management</li>
        </ul>
        
        <h6>Expense Tracker Application Benefits:</h6>
        <p>TrackExp expense tracker application provides comprehensive financial management tools that help you track expenses, manage budgets, and achieve your financial goals. Our expense automation features make it easy to stay on top of your spending patterns and optimize your financial health.</p>
        
        <p>Join thousands of users who trust TrackExp as their go-to expense tracker application for personal finance management. Start tracking your expenses today and take control of your financial future with our comprehensive expense tracking solution. Download TrackExp expense tracker app now and experience the best personal finance management tools available.</p>
        
  <p><strong>Popular Search Terms:</strong></p>
        <p>expense tracker, expense tracking app, track expense, expense automation, personal finance app, budget tracker, financial management software, expense manager, budget planner, money tracker, spending tracker, finance tracker, expense report, budget app, personal finance tracker, expense tracking software, financial planning app, expense tracker application, automated expense tracking, smart expense management</p>
        
  <p><strong>Target Keywords for SEO:</strong></p>
        <p>expense tracker application, track expense, expense automation, personal finance management, budget tracking app, financial analytics, expense categorization, automated expense processing, expense management software, financial planning tools, expense tracking automation, smart expense tracker, budget management app, financial insights, expense reporting, expense analytics dashboard</p>
              </div>
      
      {/* Premium Particle System */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large Premium Floating Orbs */}
        <div className="premium-orb premium-orb-1" />
        <div className="premium-orb premium-orb-2" />
        <div className="premium-orb premium-orb-3" />
        <div className="premium-orb premium-orb-4" />
        <div className="premium-orb premium-orb-5" />
        <div className="premium-orb premium-orb-6" />
        
        {/* Medium Floating Elements */}
        <div className="premium-floating-element premium-floating-1" />
        <div className="premium-floating-element premium-floating-2" />
        <div className="premium-floating-element premium-floating-3" />
        <div className="premium-floating-element premium-floating-4" />
        
        {/* Small Particle System */}
        <div className="premium-particle premium-particle-1" />
        <div className="premium-particle premium-particle-2" />
        <div className="premium-particle premium-particle-3" />
        <div className="premium-particle premium-particle-4" />
        <div className="premium-particle premium-particle-5" />
        <div className="premium-particle premium-particle-6" />
        <div className="premium-particle premium-particle-7" />
        <div className="premium-particle premium-particle-8" />
        
        {/* Geometric Shapes */}
        <div className="premium-geometric premium-geometric-1" />
        <div className="premium-geometric premium-geometric-2" />
        <div className="premium-geometric premium-geometric-3" />
        <div className="premium-geometric premium-geometric-4" />
        
        {/* Light Rays */}
        <div className="premium-light-ray premium-light-ray-1" />
        <div className="premium-light-ray premium-light-ray-2" />
        <div className="premium-light-ray premium-light-ray-3" />
      </div>

      {/* Header */}
      <header className={`relative z-20 w-full pt-2 pb-6 px-6 sm:pt-4 sm:pb-8 sm:px-8 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            {/* Left side - Enhanced Branding */}
            <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
                <div className="relative hidden md:block">
                  <img 
                    src="/icons/icon-192x192.png" 
                    alt="TrackExp Logo" 
                    className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 drop-shadow-2xl"
                  />
                </div>
          <div>
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white drop-shadow-2xl mb-1" style={{
                    background: 'linear-gradient(135deg, #00BFFF, #00FF7F, #8A2BE2, #00BFFF)',
                    backgroundSize: '300% 300%',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    animation: 'gradient-shift 4s ease-in-out infinite'
                  }}>
                    TrackExp
                  </h1>
                  <p className="text-sm uppercase tracking-widest text-white/60 font-medium">
                    Premium Finance Management
                  </p>
                </div>
              </div>
              <div className="max-w-2xl mx-auto lg:mx-0">
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-sm text-white/70">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span>AI-Powered Insights</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                    <span>Real-time Analytics</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
                    <span>Secure & Private</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Buttons - Right Side, Vertically Centered */}
            <div className="flex items-center justify-end gap-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setActiveSection('learnMore');
                  setTimeout(() => {
                    scrollToLearnMore();
                  }, 100);
                }}
                className={`premium-nav-button ${activeSection === 'learnMore' ? 'premium-nav-button-active' : ''}`}
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Learn More
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setActiveSection('aboutUs');
                  setTimeout(() => {
                    scrollToAboutUs();
                  }, 100);
                }}
                className={`premium-nav-button ${activeSection === 'aboutUs' ? 'premium-nav-button-active' : ''}`}
              >
                <Info className="w-4 h-4 mr-2" />
                About Us
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 px-4 sm:px-6 pb-6">
        <div className="max-w-7xl mx-auto">
          {/* Main Login Page Content */}
          <div className={`mb-8 transition-all duration-1000 delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="flex flex-col lg:flex-row items-start gap-8 lg:gap-12">
              {/* Photo - Left Side */}
              <div className="relative flex-shrink-0 w-full sm:w-auto">
                <img 
                  src="/photo/Web.png" 
                  alt="TrackExp" 
                  className="w-full max-w-sm h-64 sm:w-80 sm:h-96 md:w-[28rem] md:h-[32rem] lg:w-[32rem] lg:h-[36rem] rounded-lg object-cover object-center border-4 border-white/20 shadow-2xl bg-white/5 backdrop-blur-sm mx-auto"
                  style={{
                    objectPosition: 'center 20%'
                  }}
                />
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 animate-pulse"></div>
          </div>

              {/* Main Text - Right Side */}
              <div className="flex-1 text-center lg:text-left flex flex-col justify-start">
                {/* Main Heading */}
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight" style={{
                  background: 'linear-gradient(135deg, #00BFFF, #00FF7F, #8A2BE2, #00BFFF)',
                  backgroundSize: '300% 300%',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  animation: 'gradient-shift 4s ease-in-out infinite'
                }}>
                  TrackExp
                </h2>
                <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold text-white/90 mb-8 leading-relaxed">
                  Your Personal Finance Manager
                </h3>
                
                {/* Description Text */}
                <p className="text-white/90 text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl leading-relaxed mb-6 sm:mb-8">
                  Transform your relationship with money. TrackExp doesn't just track expenses - it helps you understand your spending, set meaningful budgets, and achieve your financial goals with confidence.
                </p>
                
                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsLogin(true);
                      setActiveSection('auth');
                      // Scroll to login modal
                      setTimeout(() => {
                        scrollToLoginModal();
                      }, 100);
                    }}
                    className="premium-auth-button group w-full sm:min-w-[200px] px-6 py-3 sm:px-8 sm:py-4 text-base sm:text-lg"
                  >
                    <LogIn className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" />
                    <span className="relative z-10">Sign In</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </Button>
                  <Button
                    onClick={() => {
                      setIsLogin(false);
                      setActiveSection('auth');
                      // Scroll to login modal
                      setTimeout(() => {
                        scrollToLoginModal();
                      }, 100);
                    }}
                    className="premium-auth-button-primary group w-full sm:min-w-[200px] px-6 py-3 sm:px-8 sm:py-4 text-base sm:text-lg"
                  >
                    <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" />
                    <span className="relative z-10">Get Started</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-white/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </Button>
              </div>
              </div>
            </div>
          </div>

          {/* Features Section */}
          <div className={`mb-12 transition-all duration-1000 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="flex flex-col lg:flex-row items-start gap-8 lg:gap-12">
              {/* Features Text - Left Side */}
              <div className="flex-1 text-center lg:text-left">
                
                <p className="text-white/90 text-lg sm:text-xl md:text-2xl leading-relaxed mb-8">
                  TrackExp helps you track expenses, manage budgets, and achieve financial goals with ease. Built with React, TypeScript, and Supabase, it offers a modern, intuitive interface for complete money management.
                </p>
                
                <div className="space-y-6">
                  <h3 className="text-2xl sm:text-3xl font-semibold text-white/90 mb-4">Core Features</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm sm:text-base">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <strong className="text-white">Expense Management:</strong>
                          <span className="text-white/80"> Full CRUD, category-based tracking, payment methods, date filters, CSV import, validations.</span>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <strong className="text-white">Budgets:</strong>
                          <span className="text-white/80"> Set/carry over budgets, real-time alerts, overage tracking, monthly analysis.</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <strong className="text-white">Credit Cards:</strong>
                          <span className="text-white/80"> Track purchases, due dates, payments, balances.</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <strong className="text-white">Income & Credits:</strong>
                          <span className="text-white/80"> Record salaries/income, refunds, unassigned credits, recurring income.</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <strong className="text-white">Analytics & Reports:</strong>
                          <span className="text-white/80"> Charts, comparisons, category summaries, CSV export, dashboards.</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <strong className="text-white">AI Insights:</strong>
                          <span className="text-white/80"> Gemini AI for smart recommendations, spending analysis, goal planning, chat assistant.</span>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-pink-400 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <strong className="text-white">User Management:</strong>
                          <span className="text-white/80"> Secure login, profiles, preferences, photo upload, password reset.</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-indigo-400 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <strong className="text-white">Bank Balance:</strong>
                          <span className="text-white/80"> Track balances, reconcile transactions, view history.</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-orange-400 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <strong className="text-white">Recurring Expenses:</strong>
                          <span className="text-white/80"> Automate bills & subscriptions.</span>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-teal-400 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <strong className="text-white">Mobile-First Design:</strong>
                          <span className="text-white/80"> Responsive UI, PWA support, offline-ready.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Features Image - Right Side */}
              <div className="relative flex-shrink-0 w-full sm:w-auto">
                <img 
                  src="/photo/New.png" 
                  alt="TrackExp Features" 
                  className="w-full max-w-sm h-64 sm:w-80 sm:h-96 md:w-[28rem] md:h-[32rem] lg:w-[32rem] lg:h-[36rem] rounded-lg object-cover object-center border-4 border-white/20 shadow-2xl bg-white/5 backdrop-blur-sm mx-auto"
                />
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 animate-pulse"></div>
              </div>
            </div>
          </div>
          
          {/* About Us Section */}
          {activeSection === 'aboutUs' && (
            <div ref={aboutUsRef} className={`mb-12 transition-all duration-1000 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                  <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight" style={{
                    background: 'linear-gradient(135deg, #00BFFF, #00FF7F, #8A2BE2, #00BFFF)',
                    backgroundSize: '300% 300%',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    animation: 'gradient-shift 4s ease-in-out infinite'
                  }}>
                    About Us
                  </h2>
                  <p className="text-white/80 text-lg sm:text-xl max-w-3xl mx-auto leading-relaxed">
                    Meet the developer behind TrackExp - your comprehensive personal finance management solution
                  </p>
          </div>

                {/* Developer Profile Card */}
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 sm:p-12 shadow-2xl">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                    {/* Profile Photo */}
                    <div className="flex justify-center lg:justify-start">
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                        <img 
                          src="/photo/me.png" 
                          alt="Arindam Gupta" 
                          className="relative w-48 h-48 sm:w-56 sm:h-56 lg:w-64 lg:h-64 rounded-full object-cover border-4 border-white/20 shadow-2xl group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              </div>

                    {/* Developer Info */}
                    <div className="lg:col-span-2 space-y-6">
              <div>
                        <h3 className="text-3xl sm:text-4xl font-bold text-white mb-2">Arindam Gupta</h3>
                        <p className="text-xl text-blue-400 font-semibold mb-4">Database Administrator & Full-Stack Developer</p>
                        <p className="text-white/80 text-lg leading-relaxed">
                          Professional database administrator with expertise in modern web technologies. 
                          Passionate about creating efficient, user-friendly applications that solve real-world problems.
                        </p>
              </div>

                      {/* Contact Information Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-300 group">
                          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center group-hover:bg-blue-500/30 transition-colors duration-300">
                            <User className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                            <p className="text-white/60 text-sm">Name</p>
                            <p className="text-white font-semibold">Arindam Gupta</p>
            </div>
          </div>

                        <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-300 group">
                          <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center group-hover:bg-green-500/30 transition-colors duration-300">
                            <Phone className="w-5 h-5 text-green-400" />
              </div>
              <div>
                            <p className="text-white/60 text-sm">Phone</p>
                            <p className="text-white font-semibold">+91-8017074226</p>
              </div>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-300 group">
                          <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center group-hover:bg-purple-500/30 transition-colors duration-300">
                            <Mail className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                            <p className="text-white/60 text-sm">Email</p>
                            <p className="text-white font-semibold">arindamgupta077@gmail.com</p>
            </div>
          </div>

                        <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-300 group">
                          <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center group-hover:bg-orange-500/30 transition-colors duration-300">
                            <AtSign className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                            <p className="text-white/60 text-sm">Location</p>
                            <p className="text-white font-semibold">Kolkata, India</p>
              </div>
              </div>
              </div>

                      {/* LinkedIn Button */}
                      <div className="pt-4">
                        <a 
                          href="https://www.linkedin.com/in/arindam-gupta-462240125/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-3 px-6 py-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 hover:border-blue-500/50 rounded-xl text-blue-400 hover:text-blue-300 font-semibold transition-all duration-300 group"
                        >
                          <div className="w-6 h-6 bg-blue-500/20 rounded-lg flex items-center justify-center group-hover:bg-blue-500/30 transition-colors duration-300">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                            </svg>
              </div>
                          Connect on LinkedIn
                          <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
            </div>
          </div>
        </div>
      </div>

                {/* Professional Background */}
                <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 shadow-2xl">
                    <h4 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                        </svg>
            </div>
                      Professional Background
                    </h4>
                    <p className="text-white/80 leading-relaxed">
                      As a professional Database Administrator, I bring deep expertise in data management, 
                      system optimization, and database architecture. This technical foundation enables me to 
                      create robust, scalable applications with efficient data handling and performance optimization.
                    </p>
          </div>

                  <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 shadow-2xl">
                    <h4 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
              </div>
                      TrackExp Vision
                    </h4>
                    <p className="text-white/80 leading-relaxed">
                      TrackExp was born from the need for a comprehensive, user-friendly personal finance 
                      management solution. Combining my database expertise with modern web technologies, 
                      I've created a platform that makes financial management accessible and intuitive for everyone.
                    </p>
              </div>
            </div>

                {/* Back to Login Button */}
                <div className="text-center mt-12">
                  <Button
                    onClick={() => setActiveSection('auth')}
                    className="premium-auth-button-primary group min-w-[200px]"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    <span className="relative z-10">Back to Login</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-white/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </Button>
          </div>
              </div>
            </div>
          )}
          
          {/* Learn More Section */}
          {activeSection === 'learnMore' && (
            <div ref={learnMoreRef} className={`mb-12 transition-all duration-1000 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                  <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight" style={{
                    background: 'linear-gradient(135deg, #00BFFF, #00FF7F, #8A2BE2, #00BFFF)',
                    backgroundSize: '300% 300%',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    animation: 'gradient-shift 4s ease-in-out infinite'
                  }}>
                    Learn More
                  </h2>
                  <p className="text-white/80 text-lg sm:text-xl max-w-4xl mx-auto leading-relaxed">
                    Discover the comprehensive features and capabilities of TrackExp - your AI-powered personal finance management solution
            </p>
          </div>

                {/* Introduction Card */}
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 sm:p-12 shadow-2xl mb-12">
          <div className="text-center">
                    <h3 className="text-3xl sm:text-4xl font-bold text-white mb-6">TrackExp - Your Personal Finance Manager</h3>
                    <p className="text-white/80 text-lg sm:text-xl leading-relaxed max-w-4xl mx-auto">
                      TrackExp is a comprehensive, AI-powered personal finance management application that helps users track expenses, 
                      manage budgets, and achieve their financial goals with confidence. Built with modern technologies including 
                      React, TypeScript, and Supabase, it provides a beautiful, intuitive interface for complete financial control.
                    </p>
            </div>
          </div>

                {/* Core Features Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                  {/* Expense Management */}
                  <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 shadow-2xl hover:bg-white/15 transition-all duration-300">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
            </div>
                      <h4 className="text-2xl font-bold text-white">Expense Management</h4>
          </div>
                    <ul className="space-y-3 text-white/80">
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                        <span>Complete CRUD operations for expense tracking</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                        <span>8 default categories with smart organization</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                        <span>Payment method tracking (Cash, Credit Card, etc.)</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                        <span>CSV bulk import for expense entry</span>
                      </li>
                    </ul>
        </div>

                  {/* Budget Management */}
                  <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 shadow-2xl hover:bg-white/15 transition-all duration-300">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
      </div>
                      <h4 className="text-2xl font-bold text-white">Budget Management</h4>
    </div>
                    <ul className="space-y-3 text-white/80">
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                        <span>Smart monthly budgets for each category</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                        <span>Budget carryover to next month</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                        <span>Real-time budget warnings and alerts</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                        <span>Monthly budget performance analysis</span>
                      </li>
                    </ul>
                  </div>

                  {/* Credit Card Management */}
                  <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 shadow-2xl hover:bg-white/15 transition-all duration-300">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      </div>
                      <h4 className="text-2xl font-bold text-white">Credit Card Management</h4>
                    </div>
                    <ul className="space-y-3 text-white/80">
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                        <span>Separate tracking for credit card purchases</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                        <span>Due date management and tracking</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                        <span>Bulk payment processing</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                        <span>Outstanding balance monitoring</span>
                      </li>
                    </ul>
        </div>
        
                  {/* AI-Powered Insights */}
                  <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 shadow-2xl hover:bg-white/15 transition-all duration-300">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <h4 className="text-2xl font-bold text-white">AI-Powered Insights</h4>
                    </div>
                    <ul className="space-y-3 text-white/80">
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 flex-shrink-0"></div>
                        <span>Gemini AI integration for smart analysis</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 flex-shrink-0"></div>
                        <span>Personalized financial recommendations</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 flex-shrink-0"></div>
                        <span>Interactive AI chat assistant</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 flex-shrink-0"></div>
                        <span>AI-assisted goal planning</span>
                      </li>
                    </ul>
        </div>
      </div>
      
                {/* User Guide Section */}
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 sm:p-12 shadow-2xl mb-12">
                  <h3 className="text-3xl font-bold text-white mb-8 text-center">How to Use TrackExp</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                      <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mb-4">
                        <span className="text-2xl font-bold text-green-400">1</span>
                </div>
                      <h4 className="text-xl font-semibold text-white mb-3">Create Account</h4>
                      <p className="text-white/80">Sign up with your email and create a secure password to get started with TrackExp.</p>
                </div>
                    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                      <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4">
                        <span className="text-2xl font-bold text-blue-400">2</span>
              </div>
                      <h4 className="text-xl font-semibold text-white mb-3">Set Up Profile</h4>
                      <p className="text-white/80">Complete your profile with personal information and upload a profile photo.</p>
                  </div>
                    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                      <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">
                        <span className="text-2xl font-bold text-purple-400">3</span>
                  </div>
                      <h4 className="text-xl font-semibold text-white mb-3">Add Expenses</h4>
                      <p className="text-white/80">Start tracking your expenses by adding them with categories and payment methods.</p>
                  </div>
                    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                      <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center mb-4">
                        <span className="text-2xl font-bold text-orange-400">4</span>
                </div>
                      <h4 className="text-xl font-semibold text-white mb-3">Set Budgets</h4>
                      <p className="text-white/80">Create monthly budgets for different categories to control your spending.</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                      <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center mb-4">
                        <span className="text-2xl font-bold text-cyan-400">5</span>
                      </div>
                      <h4 className="text-xl font-semibold text-white mb-3">View Analytics</h4>
                      <p className="text-white/80">Analyze your spending patterns with interactive charts and reports.</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                      <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center mb-4">
                        <span className="text-2xl font-bold text-pink-400">6</span>
                      </div>
                      <h4 className="text-xl font-semibold text-white mb-3">Get AI Insights</h4>
                      <p className="text-white/80">Use the AI assistant for personalized financial advice and recommendations.</p>
                    </div>
              </div>
            </div>
            
                {/* Back to Login Button */}
                <div className="text-center">
              <Button
                    onClick={() => setActiveSection('auth')}
                    className="premium-auth-button-primary group min-w-[200px]"
              >
                <LogIn className="w-4 h-4 mr-2" />
                    <span className="relative z-10">Back to Login</span>
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-white/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Button>
            </div>
          </div>
        </div>
          )}
          
          {activeSection === 'auth' && (
            <div ref={loginModalRef} className={`flex justify-center px-2 sm:px-4 md:px-6 py-4 sm:py-6 transition-all duration-1000 delay-300 ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
              <div className="premium-auth-container group w-full max-w-sm sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl">
                <div className="premium-auth-card">
                  <div className="premium-auth-header">
                    <div className="flex flex-col items-center gap-0 mb-4 sm:mb-6">
                      <div className="relative -mb-8 sm:-mb-10 md:-mb-8 lg:-mb-10 xl:-mb-12">
                        <div className="premium-logo-container">
                          <img 
                            src="/icons/icon-512x512.png" 
                            alt="TrackExp Logo" 
                            className="w-32 h-32 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 xl:w-56 xl:h-56"
                          />
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-xs sm:text-xs uppercase tracking-widest text-white/60 font-medium">
                          Premium Finance Management
                        </p>
                        <p className="text-xs sm:text-xs uppercase tracking-wider text-white/50 text-center mt-1 sm:mt-2">
                          By Arindam Gupta Production
                        </p>
                      </div>
                      </div>
                    </div>
                    
                  <div className="premium-auth-content">
                    {isLogin ? (
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-center mb-4 sm:mb-6 text-white">Welcome Back</h2>
                        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                          <div>
                            <Label htmlFor="email" className="text-white/90">Email</Label>
                            <Input
                              id="email"
                              type="email"
                              value={formData.email}
                              onChange={(e) => updateField('email', e.target.value)}
                              className="premium-input"
                              placeholder="Enter your email"
                            />
                            {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
                          </div>
                          
                          <div>
                            <Label htmlFor="password" className="text-white/90">Password</Label>
                            <div className="relative">
                              <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                value={formData.password}
                                onChange={(e) => updateField('password', e.target.value)}
                                className="premium-input pr-10"
                                placeholder="Enter your password"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white/80"
                              >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                    </div>
                            {errors.password && <p className="text-red-400 text-sm mt-1">{errors.password}</p>}
                  </div>

                          {/* General error display */}
                          {errors.general && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                              <p className="text-red-400 text-sm text-center">{errors.general}</p>
                            </div>
                          )}

                          <Button
                            type="submit"
                            className="w-full premium-auth-button-primary"
                            disabled={signInLoading}
                          >
                            {signInLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogIn className="w-4 h-4 mr-2" />}
                            Sign In
                          </Button>
                        </form>

                        {/* Divider */}
                        <div className="relative my-6">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/20"></div>
                          </div>
                          <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-transparent text-white/60">Or continue with</span>
                          </div>
                        </div>

                        {/* Google Sign In Button */}
                        <Button
                          onClick={handleGoogleSignIn}
                          className="w-full premium-google-button group text-sm sm:text-base"
                          disabled={loading}
                        >
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          {googleSignInLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          <span className="hidden sm:inline">Continue with Google</span>
                          <span className="sm:hidden">Google</span>
                        </Button>
                        
                        <div className="mt-4 text-center">
                          <button
                            onClick={() => setShowForgotPassword(true)}
                            className="text-sm text-white/70 hover:text-white/90 transition-colors"
                          >
                            Forgot your password?
                          </button>
                        </div>

                        {/* Forgot Password Form */}
                        {showForgotPassword && (
                          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-white/5 rounded-lg border border-white/10">
                            <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Reset Password</h3>
                            <form onSubmit={handleForgotPassword} className="space-y-3 sm:space-y-4">
                              <div>
                                <Label htmlFor="forgot-email" className="text-white/90 text-sm sm:text-base">Email</Label>
                                <Input
                                  id="forgot-email"
                                  type="email"
                                  value={forgotPasswordEmail}
                                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                                  className="premium-input"
                                  placeholder="Enter your email address"
                                  required
                                />
                              </div>
                              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                <Button
                                  type="submit"
                                  className="flex-1 premium-auth-button-primary text-sm sm:text-base"
                                  disabled={forgotPasswordLoading}
                                >
                                  {forgotPasswordLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
                                  <span className="hidden sm:inline">Send Reset Email</span>
                                  <span className="sm:hidden">Send Email</span>
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    setShowForgotPassword(false);
                                    setForgotPasswordEmail('');
                                  }}
                                  className="premium-auth-button text-sm sm:text-base"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </form>
                          </div>
                        )}
                        
                        <div className="mt-6 text-center">
                          <p className="text-white/70 text-sm">
                            Don't have an account?{' '}
                            <button
                              onClick={() => setIsLogin(false)}
                              className="text-white hover:text-white/80 font-medium transition-colors"
                            >
                              Sign up
                            </button>
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-center mb-4 sm:mb-6 text-white">Create Account</h2>
                        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                          <div>
                            <Label htmlFor="name" className="text-white/90">Full Name</Label>
                            <Input
                              id="name"
                              type="text"
                              value={formData.name}
                              onChange={(e) => updateField('name', e.target.value)}
                              className="premium-input"
                              placeholder="Enter your full name"
                            />
                            {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
                          </div>
                          
                          <div>
                            <Label htmlFor="email" className="text-white/90">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => updateField('email', e.target.value)}
                              className="premium-input"
                              placeholder="Enter your email"
                          />
                            {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
                      </div>

                          <div>
                            <Label htmlFor="phone" className="text-white/90">Phone (Optional)</Label>
                            <Input
                              id="phone"
                              type="tel"
                              value={formData.phone}
                              onChange={(e) => updateField('phone', e.target.value)}
                              className="premium-input"
                              placeholder="Enter your phone number"
                            />
                            {errors.phone && <p className="text-red-400 text-sm mt-1">{errors.phone}</p>}
                          </div>
                          
                          <div>
                            <Label htmlFor="password" className="text-white/90">Password</Label>
                            <div className="relative">
                            <Input
                              id="password"
                                type={showPassword ? "text" : "password"}
                              value={formData.password}
                              onChange={(e) => updateField('password', e.target.value)}
                                className="premium-input pr-10"
                                placeholder="Create a password"
                            />
                              <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white/80"
                              >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                          </div>
                            {errors.password && <p className="text-red-400 text-sm mt-1">{errors.password}</p>}
                        </div>

                        {/* General error display */}
                        {errors.general && (
                          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <p className="text-red-400 text-sm text-center">{errors.general}</p>
                          </div>
                        )}

                        {/* Email verification notice */}
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                          <p className="text-blue-400 text-sm text-center">
                            📧 You'll receive a verification email after creating your account
                          </p>
                        </div>

                      <Button 
                        type="submit" 
                            className="w-full premium-auth-button-primary"
                        disabled={signUpLoading}
                          >
                            {signUpLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                              Create Account
                      </Button>
                    </form>

                        <div className="mt-6 text-center">
                          <p className="text-white/70 text-sm">
                            Already have an account?{' '}
                            <button
                              onClick={() => setIsLogin(true)}
                              className="text-white hover:text-white/80 font-medium transition-colors"
                            >
                              Sign in
                            </button>
                          </p>
                        </div>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export { AuthForm };