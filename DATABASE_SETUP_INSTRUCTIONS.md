# Database Setup Instructions

## Fix for "Failed to load user preferences" Error

The error occurs because the `user_preferences` table hasn't been created in your Supabase database yet. Here's how to fix it:

### Option 1: Manual Setup (Recommended)

1. **Go to your Supabase Dashboard**
   - Open your Supabase project
   - Navigate to the **SQL Editor** section

2. **Run the Setup Script**
   - Copy the contents of `setup-user-preferences.sql`
   - Paste it into the SQL Editor
   - Click **Run** to execute the script

3. **Verify Setup**
   - You should see: "User preferences table and function created successfully!"
   - Check the **Table Editor** to confirm `user_preferences` table exists

### Option 2: Using Supabase CLI (If Available)

If you have Supabase CLI installed:

```bash
# Navigate to your project directory
cd /path/to/your/project

# Push the migration
supabase db push
```

### What the Script Creates

1. **user_preferences table** with:
   - `user_id` (UUID, references auth.users)
   - `enable_past_months_budget` (BOOLEAN, default false)
   - `created_at` and `updated_at` timestamps

2. **Row Level Security (RLS)** policies:
   - Users can only access their own preferences
   - Secure data isolation

3. **get_user_preferences function**:
   - Returns user preferences or default values
   - Handles missing preferences gracefully

### Fallback Behavior

The application has been updated with fallback behavior:

- **If database table doesn't exist**: Uses default preferences locally
- **If database is unavailable**: Saves preferences in memory
- **No more error messages**: Graceful degradation

### Testing the Fix

After running the setup script:

1. **Refresh your application**
2. **Go to Profile → Preferences**
3. **Toggle the "Past Months Budget Setting"**
4. **Check Budget Manager** to see if past months options appear

### Troubleshooting

If you still see issues:

1. **Check Supabase Dashboard**:
   - Verify `user_preferences` table exists
   - Check RLS policies are enabled
   - Ensure function `get_user_preferences` exists

2. **Check Browser Console**:
   - Look for any remaining error messages
   - Verify network requests to Supabase

3. **Clear Browser Cache**:
   - Hard refresh the page (Ctrl+F5)
   - Clear local storage if needed

### Next Steps

Once the database is set up:

1. **Feature will work normally**
2. **Users can enable/disable past months feature**
3. **Preferences will persist across sessions**
4. **Budget Manager will show/hide past months options**

The application is now robust and will work even if the database setup is delayed!
