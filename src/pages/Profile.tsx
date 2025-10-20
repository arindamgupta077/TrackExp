import { useState, useEffect, useRef } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Camera, User, Phone, Mail, Calendar, X, Settings, Lock, Eye, EyeOff, DollarSign, Trash2, AlertTriangle, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import heroImage from '@/assets/hero-bg.jpg';
import { useTheme } from '@/contexts/ThemeContext';

interface UserProfile {
  name: string;
  phone?: string;
  avatar_url?: string;
  initial_bank_balance?: number;
  has_set_initial_balance?: boolean;
}

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme, isDarkMode } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [removingPhoto, setRemovingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Account deletion state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const userMetadata = user?.user_metadata as Record<string, unknown> | undefined;
  const metadataFullName = typeof userMetadata?.full_name === 'string' ? userMetadata.full_name : undefined;
  const metadataName = typeof userMetadata?.name === 'string' ? userMetadata.name : undefined;
  const displayName = profile?.name || metadataFullName || metadataName || user?.email || 'there';

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) {
      console.log('No user found, skipping profile fetch');
      return;
    }
    
    console.log('Fetching profile for user:', user.id);
    
    try {
      // First try with all columns, if that fails, try with basic columns only
      const initialResult = await supabase
        .from('profiles')
        .select('name, phone, avatar_url, initial_bank_balance, has_set_initial_balance' as any)
        .eq('user_id', user.id)
        .single();

      let { data, error } = initialResult as { data: any; error: any };

      // If the query fails due to missing columns, try with basic columns only
      if (error && typeof error.message === 'string' && error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('New columns not found, fetching basic profile data only');
        const basicResult = await supabase
          .from('profiles')
          .select('name, phone, avatar_url' as any)
          .eq('user_id', user.id)
          .single();
        
        data = basicResult.data;
        error = basicResult.error;
        
        // Add default values for missing columns
        if (data) {
          data = {
            ...data,
            initial_bank_balance: 0,
            has_set_initial_balance: true,
          };
        }
      }

      console.log('Profile fetch result:', { data, error });

      if (error) {
        console.error('Profile fetch error:', error);
        throw error;
      }
      
      setProfile(data ?? null);
      console.log('Profile set successfully:', data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!user) {
      console.error('No user found for avatar upload');
      toast({
        title: "Authentication Error",
        description: "Please sign in to upload a profile photo",
        variant: "destructive",
      });
      return;
    }

    console.log('Starting avatar upload for user:', user.id);
    console.log('File details:', { name: file.name, size: file.size, type: file.type });

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPG, PNG, GIF, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Additional validation for supported image types
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      toast({
        title: "Unsupported file type",
        description: "Please select a JPG, PNG, GIF, or WebP image",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${user.id}/avatar.${fileExt}`;
      
      console.log('Uploading file as:', fileName);

      // First, try to delete existing avatar if it exists
      try {
        console.log('Attempting to remove existing avatar...');
        const { error: removeError } = await supabase.storage
          .from('avatars')
          .remove([fileName]);
        
        if (removeError) {
          console.log('No existing avatar to remove or error:', removeError.message);
        } else {
          console.log('Existing avatar removed successfully');
        }
      } catch (error) {
        // Ignore error if file doesn't exist
        console.log('No existing avatar to remove');
      }

      // Upload new avatar
      console.log('Starting upload to storage...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { 
          upsert: true,
          cacheControl: '3600',
          contentType: file.type
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }
      
      console.log('Upload successful:', uploadData);

      // Get the public URL with cache busting
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      // Add cache busting parameter to force refresh
      const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;
      console.log('Generated public URL:', publicUrl);
      console.log('Cache busted URL:', cacheBustedUrl);

      // Update profile in database with cache-busted URL
      console.log('Updating profile in database...');
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: cacheBustedUrl })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Database update error:', updateError);
        throw updateError;
      }
      
      console.log('Database update successful');

      // Update local state with cache-busted URL
      setProfile(prev => {
        const updated = prev ? { ...prev, avatar_url: cacheBustedUrl } : null;
        console.log('Updated profile state:', updated);
        return updated;
      });
      
      // Force a small delay to ensure the image is available
      setTimeout(() => {
        // Trigger a re-render by updating the profile state again
        setProfile(prev => {
          console.log('Triggering re-render, current profile:', prev);
          return prev ? { ...prev } : null;
        });
      }, 100);
      
      toast({
        title: "Profile photo updated!",
        description: "Your profile photo has been successfully updated.",
      });
    } catch (error: unknown) {
      console.error('Error uploading avatar:', error);
      
      let errorMessage = "Failed to upload profile photo";
      if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        const errorMsg = error.message.toLowerCase();
        if (errorMsg.includes('bucket')) {
          errorMessage = "Storage bucket not configured. Please contact support.";
        } else if (errorMsg.includes('permission') || errorMsg.includes('forbidden')) {
          errorMessage = "Permission denied. Please refresh the page and try again.";
        } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
          errorMessage = "Network error. Please check your connection and try again.";
        } else if (errorMsg.includes('size')) {
          errorMessage = "File is too large. Please select an image smaller than 5MB.";
        } else {
          errorMessage = `Upload failed: ${error.message}`;
        }
      }
      
      toast({
        title: "Upload Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const updateProfile = async (name: string, phone: string, initialBankBalance?: number) => {
    if (!user) return;

    try {
      const updateData: any = { name, phone };
      if (initialBankBalance !== undefined) {
        updateData.initial_bank_balance = initialBankBalance;
        updateData.has_set_initial_balance = true;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? { 
        ...prev, 
        name, 
        phone, 
        initial_bank_balance: initialBankBalance !== undefined ? initialBankBalance : prev.initial_bank_balance,
        has_set_initial_balance: initialBankBalance !== undefined ? true : prev.has_set_initial_balance
      } : null);
      setEditing(false);
      toast({
        title: "Profile updated!",
        description: "Your profile has been successfully updated.",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log('File selected:', file);
    
    if (file) {
      console.log('Calling uploadAvatar with file:', file.name);
      uploadAvatar(file);
    } else {
      console.log('No file selected');
    }
  };

  const removeAvatar = async () => {
    if (!user || !profile?.avatar_url) {
      console.log('Cannot remove avatar - no user or no avatar URL');
      return;
    }

    console.log('Starting avatar removal for user:', user.id);
    console.log('Current avatar URL:', profile.avatar_url);

    setRemovingPhoto(true);
    try {
      // Extract filename from URL
      const urlParts = profile.avatar_url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const fullPath = `${user.id}/${fileName}`;
      
      console.log('Attempting to remove file:', fullPath);

      // Remove from storage
      const { error: storageError } = await supabase.storage
        .from('avatars')
        .remove([fullPath]);

      if (storageError) {
        console.error('Storage error:', storageError);
        // Continue anyway to update the database
      } else {
        console.log('File removed from storage successfully');
      }

      // Update profile in database
      console.log('Updating profile to remove avatar URL...');
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Database update error:', updateError);
        throw updateError;
      }
      
      console.log('Database update successful');

      // Update local state
      setProfile(prev => prev ? { ...prev, avatar_url: undefined } : null);
      
      toast({
        title: "Profile photo removed!",
        description: "Your profile photo has been removed successfully.",
      });
    } catch (error: unknown) {
      console.error('Error removing avatar:', error);
      
      let errorMessage = "Failed to remove profile photo";
      if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        const errorMsg = error.message.toLowerCase();
        if (errorMsg.includes('permission') || errorMsg.includes('forbidden')) {
          errorMessage = "Permission denied. Please refresh the page and try again.";
        } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
          errorMessage = "Network error. Please check your connection and try again.";
        } else {
          errorMessage = `Remove failed: ${error.message}`;
        }
      }
      
      toast({
        title: "Remove Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setRemovingPhoto(false);
    }
  };

  // Password change functions
  const handlePasswordChange = (field: keyof typeof passwordData, value: string) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const validatePassword = (password: string) => {
    if (password.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    return null;
  };

  const changePassword = async () => {
    if (!user) return;

    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    const passwordError = validatePassword(passwordData.newPassword);
    if (passwordError) {
      toast({
        title: "Error",
        description: passwordError,
        variant: "destructive",
      });
      return;
    }

    setPasswordLoading(true);
    try {
      // Update password using Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      // Clear form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      toast({
        title: "Password updated!",
        description: "Your password has been changed successfully.",
      });
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Account deletion function
  const deleteAccount = async () => {
    if (!user) return;

    // Validate confirmation text
    if (deleteConfirmation.toLowerCase() !== 'delete my account') {
      toast({
        title: "Invalid confirmation",
        description: "Please type 'DELETE MY ACCOUNT' exactly as shown to confirm.",
        variant: "destructive",
      });
      return;
    }

    setDeleteLoading(true);
    try {
      // Delete user avatar from storage if it exists
      if (profile?.avatar_url) {
        try {
          const urlParts = profile.avatar_url.split('/');
          const fileName = urlParts[urlParts.length - 1];
          const fullPath = `${user.id}/${fileName}`;
          
          await supabase.storage
            .from('avatars')
            .remove([fullPath]);
        } catch (error) {
          console.error('Error deleting avatar:', error);
          // Continue with account deletion even if avatar deletion fails
        }
      }

      // Delete the user account using the database function
      // This will delete all user data from all tables and the auth user record
  const { error: deleteError } = await supabase.rpc('delete_user' as never);
      
      if (deleteError) {
        throw new Error(`Failed to delete account: ${deleteError.message}`);
      }

      toast({
        title: "Account deleted successfully",
        description: "Your account and all associated data have been permanently deleted.",
      });

      // Sign out and redirect to home page
      await signOut();
      navigate('/');
      
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete account. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(false);
      setShowDeleteDialog(false);
      setDeleteConfirmation('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background with hero image */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      
      {/* Glass overlay */}
      <div className="absolute inset-0 bg-gradient-surface" />
      
      {/* Content */}
      <div className="relative z-10 p-3 sm:p-6 max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-6 sm:mb-8 fade-in">
          <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className="glass-button"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold gradient-text">
            Welcome {displayName}!
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg mt-2">
            Manage your personal information and settings
          </p>
        </header>

        {/* Tabs */}
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="glass-button grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            {/* Profile Card */}
            <Card className="glass-card p-4 sm:p-6 md:p-8 slide-up">
              <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-8">
                {/* Avatar Section */}
                <div className="flex flex-col items-center space-y-4">
                  <Avatar className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-primary/20">
                    <AvatarImage 
                      src={profile?.avatar_url} 
                      alt="Profile photo"
                      key={profile?.avatar_url} // Force re-render when URL changes
                      onError={(e) => {
                        console.log('Avatar image failed to load:', profile?.avatar_url);
                        // Fallback to removing the src to show fallback
                        e.currentTarget.src = '';
                      }}
                      onLoad={() => {
                        console.log('Avatar image loaded successfully:', profile?.avatar_url);
                      }}
                    />
                    <AvatarFallback className="text-xl sm:text-2xl bg-gradient-primary text-white">
                      {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-2">
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                        ref={fileInputRef}
                      />
                      <Button 
                        variant="outline" 
                        className="glass-button cursor-pointer text-xs sm:text-sm"
                        disabled={uploading}
                        onClick={() => {
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                            fileInputRef.current.click();
                          }
                        }}
                      >
                        <Camera className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        {uploading ? 'Uploading...' : 'Change Photo'}
                      </Button>
                    </div>
                    
                    {profile?.avatar_url && (
                      <Button
                        variant="outline"
                        onClick={removeAvatar}
                        disabled={removingPhoto}
                        className="glass-button border-red-500/50 hover:bg-red-500/20 text-red-400 text-xs sm:text-sm"
                      >
                        <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        {removingPhoto ? 'Removing...' : 'Remove Photo'}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Profile Details */}
                <div className="flex-1 space-y-4 sm:space-y-6 w-full">
                  {editing ? (
                    <EditProfileForm
                      profile={profile}
                      onSave={updateProfile}
                      onCancel={() => setEditing(false)}
                    />
                  ) : (
                    <ViewProfile
                      profile={profile}
                      user={user}
                      onEdit={() => setEditing(true)}
                      onSignOut={async () => {
                        try {
                          await signOut();
                          navigate('/');
                        } catch (error) {
                          console.error('Error signing out:', error);
                          toast({
                            title: "Error",
                            description: "Failed to sign out. Please try again.",
                            variant: "destructive",
                          });
                        }
                      }}
                    />
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6">
            <Card className="glass-card p-4 sm:p-6 md:p-8 slide-up">
              <div className="space-y-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-lg">
                      <Settings className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg sm:text-xl font-heading font-semibold text-foreground">Appearance</h3>
                      <p className="text-sm text-muted-foreground max-w-xl">
                        Personalize TrackExp to match your visual preference. Theme changes apply instantly and persist on this device.
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-2 self-start rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-muted)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                    {isDarkMode ? 'Dark mode active' : 'Light mode active'}
                  </span>
                </div>

                <div className="flex flex-col gap-6 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-overlay)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Settings className="h-5 w-5 text-primary" />
                      <h4 className="text-base font-semibold text-foreground">Theme</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Toggle between Dark and Light mode. Your choice is saved locally, so the app remembers it every time you sign in.
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Moon className={`h-4 w-4 ${isDarkMode ? 'text-primary' : ''}`} />
                      <span>Dark</span>
                    </div>
                    <Switch
                      checked={!isDarkMode}
                      onCheckedChange={(checked) => setTheme(checked ? 'light' : 'dark')}
                      aria-label="Toggle application theme"
                    />
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Sun className={`h-4 w-4 ${!isDarkMode ? 'text-primary' : ''}`} />
                      <span>Light</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card className="glass-card p-4 sm:p-6 md:p-8 slide-up">
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-6">
                  <Lock className="h-5 w-5 text-primary" />
                  <h3 className="text-lg sm:text-xl font-heading font-semibold">Change Password</h3>
                </div>

                <div className="space-y-4">
                  {/* Current Password */}
                  <div className="space-y-2">
                    <Label htmlFor="current-password" className="text-sm font-medium text-white">
                      Current Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="current-password"
                        type={showPasswords.current ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                        className="bg-white/10 border-white/20 text-white pr-10"
                        placeholder="Enter your current password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => togglePasswordVisibility('current')}
                      >
                        {showPasswords.current ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="text-sm font-medium text-white">
                      New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showPasswords.new ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                        className="bg-white/10 border-white/20 text-white pr-10"
                        placeholder="Enter your new password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => togglePasswordVisibility('new')}
                      >
                        {showPasswords.new ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Password must be at least 6 characters long
                    </p>
                  </div>

                  {/* Confirm New Password */}
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-sm font-medium text-white">
                      Confirm New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showPasswords.confirm ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                        className="bg-white/10 border-white/20 text-white pr-10"
                        placeholder="Confirm your new password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => togglePasswordVisibility('confirm')}
                      >
                        {showPasswords.confirm ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Change Password Button */}
                  <div className="pt-4">
                    <Button
                      onClick={changePassword}
                      disabled={passwordLoading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                      className="glass-button bg-gradient-primary hover:bg-gradient-primary/80 w-full sm:w-auto"
                    >
                      {passwordLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Updating Password...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4" />
                          Change Password
                        </div>
                      )}
                    </Button>
                  </div>

                  {/* Security Tips */}
                  <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
                    <h4 className="text-sm font-medium text-white mb-2">Security Tips</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Use a strong, unique password</li>
                      <li>• Include a mix of letters, numbers, and symbols</li>
                      <li>• Avoid using personal information</li>
                      <li>• Consider using a password manager</li>
                    </ul>
                  </div>

                  {/* Delete Account Section */}
                    <div className="mt-8 pt-6 border-t border-white/10">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="h-5 w-5 rounded-full bg-red-500/20 flex items-center justify-center">
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </div>
                        <h3 className="text-lg font-heading font-semibold text-white">Danger Zone</h3>
                      </div>
                      
                      <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-white mb-1">Delete Account</h4>
                            <p className="text-xs text-red-300 mb-2">
                              Permanently delete your account and all associated data. This action cannot be undone.
                            </p>
                            <div className="text-xs text-red-200 space-y-1">
                              <p>• All expenses, credits, and financial data will be deleted</p>
                              <p>• Your profile and settings will be removed</p>
                              <p>• This action is irreversible</p>
                            </div>
                          </div>
                          <Button
                            onClick={() => setShowDeleteDialog(true)}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Account
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
            </Card>

            {/* Delete Account Confirmation Dialog */}
            {showDeleteDialog && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <Card className="w-full max-w-md glass-card border-red-500/20">
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">Delete Account</h3>
                        <p className="text-sm text-red-300">This action cannot be undone</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                        <p className="text-sm text-red-200 mb-2">
                          <strong>Warning:</strong> This will permanently delete:
                        </p>
                        <ul className="text-xs text-red-300 space-y-1 ml-4">
                          <li>• Your profile and personal information</li>
                          <li>• All expense and credit records</li>
                          <li>• Budget settings and financial data</li>
                          <li>• Profile photos and uploaded files</li>
                        </ul>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-white">
                          Type <span className="text-red-400 font-mono">DELETE MY ACCOUNT</span> to confirm:
                        </Label>
                        <Input
                          value={deleteConfirmation}
                          onChange={(e) => setDeleteConfirmation(e.target.value)}
                          className="bg-white/10 border-red-500/30 text-white placeholder:text-white/50"
                          placeholder="DELETE MY ACCOUNT"
                          autoComplete="off"
                        />
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-3 pt-4">
                        <Button
                          onClick={() => {
                            setShowDeleteDialog(false);
                            setDeleteConfirmation('');
                          }}
                          variant="outline"
                          className="flex-1 glass-button"
                          disabled={deleteLoading}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={deleteAccount}
                          disabled={deleteLoading || deleteConfirmation.toLowerCase() !== 'delete my account'}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                        >
                          {deleteLoading ? (
                            <div className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Deleting...
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Trash2 className="h-4 w-4" />
                              Delete Account
                            </div>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const ViewProfile = ({ profile, user, onEdit, onSignOut }: { 
  profile: UserProfile | null; 
  user: SupabaseUser | null; 
  onEdit: () => void;
  onSignOut: () => void;
}) => (
  <>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
      <div className="space-y-2">
        <Label className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
          <User className="h-3 w-3 sm:h-4 sm:w-4" />
          Full Name
        </Label>
        <p className="text-base sm:text-lg font-medium">{profile?.name || 'Not set'}</p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
          <Mail className="h-3 w-3 sm:h-4 sm:w-4" />
          Email Address
        </Label>
  <p className="text-base sm:text-lg font-medium break-all">{user?.email ?? 'Not available'}</p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
          <Phone className="h-3 w-3 sm:h-4 sm:w-4" />
          Phone Number
        </Label>
        <p className="text-base sm:text-lg font-medium">{profile?.phone || 'Not set'}</p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
          <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
          Member Since
        </Label>
        <p className="text-base sm:text-lg font-medium">
          {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Not available'}
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
          <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
          Initial Bank Balance
        </Label>
        <p className="text-base sm:text-lg font-medium">
          {profile?.initial_bank_balance !== undefined 
            ? `₹${profile.initial_bank_balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : 'Not set'
          }
        </p>
      </div>
    </div>

    <div className="flex flex-col sm:flex-row justify-end gap-3">
      <Button 
        onClick={onSignOut} 
        className="glass-button bg-red-600 hover:bg-red-700 text-white text-sm sm:text-base"
      >
        Sign Out
      </Button>
      <Button onClick={onEdit} className="glass-button bg-gradient-primary text-sm sm:text-base">
        Edit Profile
      </Button>
    </div>
  </>
);

const EditProfileForm = ({ profile, onSave, onCancel }: {
  profile: UserProfile | null;
  onSave: (name: string, phone: string, initialBankBalance?: number) => void;
  onCancel: () => void;
}) => {
  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [initialBankBalance, setInitialBankBalance] = useState(profile?.initial_bank_balance?.toString() || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const balance = initialBankBalance ? parseFloat(initialBankBalance) : undefined;
    onSave(name, phone, balance);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm sm:text-base">Full Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="glass-button h-10 sm:h-12 text-sm sm:text-base"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className="text-sm sm:text-base">Phone Number</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="glass-button h-10 sm:h-12 text-sm sm:text-base"
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bankBalance" className="text-sm sm:text-base">Initial Bank Balance</Label>
        <Input
          id="bankBalance"
          type="number"
          step="0.01"
          min="0"
          value={initialBankBalance}
          onChange={(e) => setInitialBankBalance(e.target.value)}
          className="glass-button h-10 sm:h-12 text-sm sm:text-base"
          placeholder="Enter your current bank balance"
        />
        <p className="text-xs text-muted-foreground">
          This helps us track your available funds and provide better budget recommendations.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
        <Button type="button" variant="outline" onClick={onCancel} className="glass-button text-sm sm:text-base">
          Cancel
        </Button>
        <Button type="submit" className="glass-button bg-gradient-primary text-sm sm:text-base">
          Save Changes
        </Button>
      </div>
    </form>
  );
};

export default Profile;