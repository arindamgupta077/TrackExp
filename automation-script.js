// =====================================================
// EXTERNAL AUTOMATION SCRIPT FOR RECURRING EXPENSES
// =====================================================

// This script can be run on any server or cloud service
// to automatically process recurring expenses

const { createClient } = require('@supabase/supabase-js');

// Configuration - Replace with your Supabase details
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function processRecurringExpenses() {
  try {
    console.log('🔄 Processing recurring expenses...');
    
    // Call the webhook function
    const { data, error } = await supabase.rpc('webhook_trigger_automation');
    
    if (error) {
      console.error('❌ Error processing recurring expenses:', error);
      return;
    }
    
    console.log('✅ Recurring expenses processed successfully:', data);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the function
processRecurringExpenses();

// Export for use in other scripts
module.exports = { processRecurringExpenses };



