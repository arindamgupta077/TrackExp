# Feature Flag System - Past Months Budget Control

## Overview

The Past Months Budget feature is now controlled by a feature flag system that allows users to opt-in to access advanced budget management capabilities. This ensures that only users who explicitly enable this feature can access the "Past 6 Months" and "Past 12 Months" options.

## How It Works

### 1. **Default State**
- **New Users**: Past months feature is **disabled by default**
- **Existing Users**: Past months feature is **disabled by default**
- **Access**: Users can only set budgets for current and future months

### 2. **Feature Enablement**
- Users must explicitly enable the feature in **Profile → Preferences**
- Once enabled, users gain access to:
  - "Past 6 Months" option in Budget Manager
  - "Past 12 Months" option in Budget Manager
  - Individual past month selections (12 months back)

### 3. **User Experience**

#### **When Feature is Disabled:**
- Month dropdown shows only:
  - "ALL - All Months" (current + next 12 months)
  - Current month
  - Next 6 months
- Shows a blue info box with upgrade prompt
- No access to past months functionality

#### **When Feature is Enabled:**
- Month dropdown shows:
  - "ALL - All Months"
  - "Past 6 Months" (new)
  - "Past 12 Months" (new)
  - Past 12 individual months
  - Current month
  - Next 6 months
- Full access to all budget management features

## Technical Implementation

### Database Schema
```sql
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enable_past_months_budget BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
```

### Key Components

#### 1. **useUserPreferences Hook**
- Manages user preference state
- Provides `isPastMonthsEnabled` boolean
- Handles preference updates with toast notifications

#### 2. **UserPreferences Component**
- Located in Profile → Preferences tab
- Toggle switch for enabling/disabling feature
- Clear feature description and benefits

#### 3. **BudgetManager Component**
- Conditionally renders past months options
- Shows upgrade prompt when feature is disabled
- Uses `isPastMonthsEnabled` to control dropdown options

## User Journey

### **Step 1: Discover the Feature**
1. User opens Budget Manager
2. Sees blue info box about Past Months Feature
3. Clicks on "Profile → Preferences" link

### **Step 2: Enable the Feature**
1. User navigates to Profile page
2. Switches to "Preferences" tab
3. Toggles "Past Months Budget Setting" to ON
4. Sees confirmation toast

### **Step 3: Use the Feature**
1. Returns to Budget Manager
2. Month dropdown now shows past months options
3. Can set budgets for past 6 or 12 months
4. Can select individual past months

## Benefits

### **For Users:**
1. **Choice**: Users can opt-in to advanced features
2. **Simplicity**: Default experience is clean and simple
3. **Control**: Users decide when they need advanced functionality
4. **Learning**: Gradual feature discovery and adoption

### **For System:**
1. **Performance**: Reduced complexity for basic users
2. **Scalability**: Easy to add more feature flags
3. **Analytics**: Track feature adoption rates
4. **Maintenance**: Easier to manage and update features

## Future Enhancements

### **Potential Feature Flags:**
1. **Advanced Analytics**: Detailed spending insights
2. **Budget Templates**: Predefined budget categories
3. **Export Features**: Data export capabilities
4. **Notifications**: Budget alerts and reminders
5. **Multi-Currency**: Support for different currencies

### **Admin Features:**
1. **Global Feature Toggles**: Admin can enable/disable features globally
2. **User Groups**: Enable features for specific user segments
3. **A/B Testing**: Test features with different user groups
4. **Usage Analytics**: Track which features are most popular

## Migration Strategy

### **For Existing Users:**
- Feature is disabled by default
- No data loss or changes to existing budgets
- Users can enable at their own pace
- Clear upgrade path with helpful prompts

### **For New Users:**
- Clean, simple onboarding experience
- Progressive feature discovery
- No overwhelming options initially

## Security & Privacy

### **Data Protection:**
- User preferences are stored securely
- Row Level Security (RLS) policies protect user data
- Only users can modify their own preferences

### **Access Control:**
- Feature flags are user-specific
- No cross-user data access
- Secure preference management

## Troubleshooting

### **Common Issues:**

1. **Feature not showing after enabling:**
   - Refresh the page
   - Check if preferences were saved successfully
   - Verify user authentication

2. **Preferences not loading:**
   - Check network connection
   - Verify database connectivity
   - Check browser console for errors

3. **Feature toggle not working:**
   - Ensure user is authenticated
   - Check if user has proper permissions
   - Verify database policies are correct

### **Support:**
- Users can contact support if they have issues
- Admin can manually enable features if needed
- Clear error messages guide users to solutions
