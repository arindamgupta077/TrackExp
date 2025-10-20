// Quick Application Test Script
// This script helps verify the key functionality of the ExpenseByAG application

console.log('🧪 ExpenseByAG Application Test Script');
console.log('=====================================');

// Test 1: Check if all required files exist
const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'src/components/Dashboard.tsx',
  'src/pages/Analytics.tsx',
  'src/hooks/useSalaryMonthsTracking.ts',
  'src/hooks/useMonthlyRemainingBalances.ts',
  'mark_salary_month_function.sql',
  'create_salary_months_tracking_table.sql'
];

console.log('\n📁 Checking Required Files:');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} - EXISTS`);
  } else {
    console.log(`❌ ${file} - MISSING`);
  }
});

// Test 2: Check for key functions in Dashboard.tsx
console.log('\n🔍 Checking Dashboard.tsx for Key Functions:');
try {
  const dashboardContent = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');
  
  const keyFunctions = [
    'getAccumulatedTotalForCategory',
    'useSalaryMonthsTracking',
    'totalAccumulatedBalance'
  ];
  
  keyFunctions.forEach(func => {
    if (dashboardContent.includes(func)) {
      console.log(`✅ ${func} - FOUND`);
    } else {
      console.log(`❌ ${func} - MISSING`);
    }
  });
} catch (error) {
  console.log('❌ Error reading Dashboard.tsx:', error.message);
}

// Test 3: Check for key functions in Analytics.tsx
console.log('\n🔍 Checking Analytics.tsx for Key Functions:');
try {
  const analyticsContent = fs.readFileSync('src/pages/Analytics.tsx', 'utf8');
  
  const keyFunctions = [
    'getAccumulatedTotalForCategory',
    'useSalaryMonthsTracking',
    'checkAndHandleSalaryRemoval'
  ];
  
  keyFunctions.forEach(func => {
    if (analyticsContent.includes(func)) {
      console.log(`✅ ${func} - FOUND`);
    } else {
      console.log(`❌ ${func} - MISSING`);
    }
  });
} catch (error) {
  console.log('❌ Error reading Analytics.tsx:', error.message);
}

// Test 4: Check for SQL functions
console.log('\n🔍 Checking SQL Functions:');
try {
  const sqlContent = fs.readFileSync('mark_salary_month_function.sql', 'utf8');
  
  const sqlFunctions = [
    'mark_salary_month_added',
    'unmark_salary_month_removed',
    'get_salary_months_for_user',
    'has_salary_for_month'
  ];
  
  sqlFunctions.forEach(func => {
    if (sqlContent.includes(func)) {
      console.log(`✅ ${func} - FOUND`);
    } else {
      console.log(`❌ ${func} - MISSING`);
    }
  });
} catch (error) {
  console.log('❌ Error reading SQL functions:', error.message);
}

// Test 5: Check package.json for required dependencies
console.log('\n📦 Checking Package Dependencies:');
try {
  const packageContent = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const dependencies = { ...packageContent.dependencies, ...packageContent.devDependencies };
  
  const requiredDeps = [
    'react',
    'typescript',
    '@supabase/supabase-js',
    'lucide-react'
  ];
  
  requiredDeps.forEach(dep => {
    if (dependencies[dep]) {
      console.log(`✅ ${dep} - INSTALLED (${dependencies[dep]})`);
    } else {
      console.log(`❌ ${dep} - MISSING`);
    }
  });
} catch (error) {
  console.log('❌ Error reading package.json:', error.message);
}

console.log('\n🎯 Test Summary:');
console.log('================');
console.log('If all items show ✅, your application is ready for testing!');
console.log('If any items show ❌, please address those issues first.');
console.log('\n📋 Next Steps:');
console.log('1. Run: npm run dev');
console.log('2. Open: http://localhost:5173');
console.log('3. Follow the APPLICATION_TESTING_GUIDE.md');
console.log('4. Test all scenarios listed in the guide');

console.log('\n🚀 Happy Testing!');
