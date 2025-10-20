import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Lock, ArrowLeft, AlertCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import heroImage from '@/assets/hero-bg.jpg';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isValidResetLink, setIsValidResetLink] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);

  useEffect(() => {
    // Check if this is a valid password reset link
    const checkResetLink = async () => {
      try {
        // Get the access_token and refresh_token from URL parameters
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        const type = searchParams.get('type');

        // Check if this is a password recovery link
        if (type === 'recovery' && accessToken && refreshToken) {
          // Set the session manually for password reset
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) {
            console.error('Error setting recovery session:', error);
            setError('Invalid or expired reset link. Please request a new one.');
            setIsValidResetLink(false);
          } else {
            setIsValidResetLink(true);
          }
        } else {
          // Check if we have an existing session
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setIsValidResetLink(true);
          } else {
            setError('Invalid reset link. Please request a new password reset.');
            setIsValidResetLink(false);
          }
        }
      } catch (error) {
        console.error('Error checking reset link:', error);
        setError('Invalid reset link. Please request a new password reset.');
        setIsValidResetLink(false);
      } finally {
        setCheckingLink(false);
      }
    };
    
    checkResetLink();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Enhanced password validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    if (password.length > 128) {
      setError('Password must be less than 128 characters');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Check for common weak passwords
    const weakPasswords = ['password', '123456', 'qwerty', 'abc123', 'password123'];
    if (weakPasswords.includes(password.toLowerCase())) {
      setError('Please choose a stronger password');
      setLoading(false);
      return;
    }

    try {
      // Update the user's password
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        let errorMessage = error.message;
        
        // Provide more user-friendly error messages
        if (error.message.includes('Password should be')) {
          errorMessage = 'Password does not meet security requirements. Please choose a stronger password.';
        } else if (error.message.includes('Invalid')) {
          errorMessage = 'Invalid password. Please try again.';
        }
        
        setError(errorMessage);
        setLoading(false);
        return;
      }

      // Sign out the user after password reset
      await supabase.auth.signOut();

      toast({
        title: "Password updated successfully!",
        description: "You can now sign in with your new password.",
      });

      // Redirect to login page
      navigate('/');
    } catch (error: unknown) {
      console.error('Error updating password:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking the reset link
  if (checkingLink) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-2 sm:p-4 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: `url(${heroImage})` }} />
        <div className="absolute inset-0 bg-gradient-surface" />
        <Card className="relative z-10 glass-card p-4 sm:p-6 md:p-8 w-full max-w-sm sm:max-w-md backdrop-blur-lg border-white/20 shadow-2xl">
          <CardContent className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white text-lg">Verifying reset link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state if the reset link is invalid
  if (!isValidResetLink) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-2 sm:p-4 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: `url(${heroImage})` }} />
        <div className="absolute inset-0 bg-gradient-surface" />
        <Card className="relative z-10 glass-card p-4 sm:p-6 md:p-8 w-full max-w-sm sm:max-w-md backdrop-blur-lg border-white/20 shadow-2xl">
          <CardHeader className="text-center pb-4">
            <div className="flex flex-col items-center gap-2 mb-2">
              <AlertCircle className="w-12 h-12 text-red-400" />
              <h1 className="text-xl sm:text-2xl font-heading font-bold text-white">Invalid Reset Link</h1>
            </div>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-white/80 text-sm sm:text-base mb-6">{error}</p>
            <Button
              onClick={() => navigate('/')}
              className="w-full h-12 bg-gradient-to-r from-white to-white/90 text-primary hover:from-white/90 hover:to-white/80 font-semibold"
            >
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show the password reset form if the link is valid
  return (
    <div className="min-h-screen relative flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      {/* Background with hero image */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      
      {/* Glass overlay */}
      <div className="absolute inset-0 bg-gradient-surface" />
      
      {/* Content */}
      <Card className="relative z-10 glass-card p-4 sm:p-6 md:p-8 w-full max-w-sm sm:max-w-md backdrop-blur-lg border-white/20 shadow-2xl">
        <CardHeader className="text-center pb-4 sm:pb-6">
          <div className="flex flex-col items-center gap-2 mb-2">
            <div className="flex items-center gap-1 sm:gap-2">
              <Lock className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              <h1 className="text-xl sm:text-2xl md:text-3xl font-heading font-bold gradient-text whitespace-nowrap">Reset Password</h1>
            </div>
          </div>
          <div className="h-px w-16 mx-auto bg-white/15 mb-3" />
          <CardTitle className="text-lg sm:text-xl text-white">Set New Password</CardTitle>
          <CardDescription className="text-white/90 text-sm sm:text-base">
            Enter your new password below
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white font-medium text-sm sm:text-base">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 sm:h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 pr-12 text-sm sm:text-base"
                  placeholder="Enter your new password"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-white/10"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-3 w-3 sm:h-4 sm:h-4 text-white/60" />
                  ) : (
                    <Eye className="h-3 w-3 sm:h-4 sm:h-4 text-white/60" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white font-medium text-sm sm:text-base">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-10 sm:h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 pr-12 text-sm sm:text-base"
                  placeholder="Confirm your new password"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-white/10"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-3 w-3 sm:h-4 sm:h-4 text-white/60" />
                  ) : (
                    <Eye className="h-3 w-3 sm:h-4 sm:h-4 text-white/60" />
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <div className="p-2 sm:p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                <p className="text-red-300 text-xs sm:text-sm">{error}</p>
              </div>
            )}

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-10 sm:h-12 bg-gradient-to-r from-white to-white/90 text-primary hover:from-white/90 hover:to-white/80 font-semibold disabled:opacity-50 text-sm sm:text-base"
            >
              {loading ? 'Updating Password...' : 'Update Password'}
            </Button>
          </form>

          <div className="mt-4 sm:mt-6 text-center">
            <Button
              variant="link"
              onClick={() => navigate('/')}
              className="text-white hover:text-white/80 p-0 h-auto font-semibold underline text-xs sm:text-sm"
            >
              <ArrowLeft className="w-3 h-3 mr-1" />
              Back to Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
