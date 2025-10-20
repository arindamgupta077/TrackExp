# Application Testing Guide

## Overview

This guide provides comprehensive testing scenarios for the ExpenseByAG application, focusing on the recently implemented features:

1. **Salary Month Tracking System**
2. **Category Summary Accumulated Column Fix**
3. **Dashboard Total Consistency Fix**
4. **Monthly Remaining Balances Total Column Logic**

## 🚀 Starting the Application

### 1. Start Development Server
```bash
npm run dev
```

### 2. Access the Application
- Open your browser and navigate to `http://localhost:5173`
- Log in with your credentials

## 📋 Test Scenarios

### **Test 1: Dashboard Total Consistency**

#### **Objective**: Verify Dashboard and Analytics show identical Total values

#### **Steps**:
1. **Navigate to Dashboard**
   - Check the "Total Accumulated" value in the dashboard cards
   - Note the exact amount displayed

2. **Navigate to Analytics Page**
   - Go to Analytics → Monthly Remaining Balances table
   - Check the "Total" column value in the footer row
   - **Expected Result**: Should match Dashboard value exactly

3. **Cross-Verification**
   - Navigate back and forth between Dashboard and Analytics
   - **Expected Result**: Values should remain identical

#### **Success Criteria**:
- ✅ Dashboard Total = Analytics Total
- ✅ Values don't change when navigating between pages
- ✅ No discrepancies in accumulated totals

---

### **Test 2: Salary Month Addition**

#### **Objective**: Test adding salary for future months and verify Total calculation includes them

#### **Steps**:
1. **Add Monthly Salary**
   - Go to Dashboard → Click "Add Monthly Income"
   - Select a future month (e.g., if current month is September, select October)
   - Enter salary amount (e.g., ₹50,000)
   - Click "Add Salary"

2. **Verify Dashboard Update**
   - Check Dashboard "Total Accumulated" value
   - **Expected Result**: Should increase by the salary amount

3. **Verify Analytics Update**
   - Go to Analytics → Monthly Remaining Balances
   - Check "Total" column value
   - **Expected Result**: Should match Dashboard value

4. **Verify Future Month Column**
   - In Monthly Remaining Balances table
   - **Expected Result**: Future month column should appear with green highlighting
   - **Expected Result**: Column should show salary amount for Salary category

#### **Success Criteria**:
- ✅ Dashboard Total includes salary amount
- ✅ Analytics Total matches Dashboard Total
- ✅ Future month column appears in Monthly Remaining Balances
- ✅ Future month column shows green highlighting
- ✅ Salary category shows correct amount in future month

---

### **Test 3: Category Summary Accumulated Column**

#### **Objective**: Verify Category Summary "Accumulated" column matches Monthly Remaining Balances "Total"

#### **Steps**:
1. **Navigate to Analytics**
   - Go to Analytics page
   - Scroll to "Category Summary" section

2. **Check Individual Category Accumulated Values**
   - For each category in Category Summary table
   - Note the "Accumulated" column value
   - Compare with same category's "Total" value in Monthly Remaining Balances table
   - **Expected Result**: Values should match exactly

3. **Test Month Filtering**
   - Change the month filter in Category Summary
   - **Expected Result**: "Accumulated" values should remain constant (not change with filter)
   - **Expected Result**: Only "Budget", "Spent", "Remaining" should change

4. **Check Footer Row**
   - Compare Category Summary footer "Accumulated" total
   - Compare with Monthly Remaining Balances footer "Total"
   - **Expected Result**: Should match exactly

#### **Success Criteria**:
- ✅ Category Summary "Accumulated" = Monthly Remaining Balances "Total"
- ✅ "Accumulated" values don't change with month filtering
- ✅ Footer totals match between both tables
- ✅ Perfect consistency across all categories

---

### **Test 4: Salary Month Removal**

#### **Objective**: Test removing salary credits and verify Total calculation updates correctly

#### **Steps**:
1. **Remove Salary Credit**
   - Go to Dashboard → Credits section
   - Find the salary credit you added in Test 2
   - Delete the salary credit

2. **Verify Dashboard Update**
   - Check Dashboard "Total Accumulated" value
   - **Expected Result**: Should decrease by the removed salary amount

3. **Verify Analytics Update**
   - Go to Analytics → Monthly Remaining Balances
   - Check "Total" column value
   - **Expected Result**: Should match Dashboard value

4. **Verify Future Month Column Removal**
   - In Monthly Remaining Balances table
   - **Expected Result**: Future month column should disappear (if no other salary credits exist)
   - **Expected Result**: No green highlighting for that month

#### **Success Criteria**:
- ✅ Dashboard Total decreases by removed salary amount
- ✅ Analytics Total matches Dashboard Total
- ✅ Future month column disappears when salary is removed
- ✅ No double-counting in Total calculation

---

### **Test 5: Multiple Salary Months**

#### **Objective**: Test adding salary for multiple future months

#### **Steps**:
1. **Add Multiple Salary Credits**
   - Add salary for October 2025
   - Add salary for November 2025
   - Add salary for December 2025

2. **Verify All Months Appear**
   - Go to Analytics → Monthly Remaining Balances
   - **Expected Result**: October, November, December columns should all appear
   - **Expected Result**: All should have green highlighting

3. **Verify Total Calculation**
   - Check Dashboard "Total Accumulated"
   - Check Analytics "Total" column
   - **Expected Result**: Should include all three salary amounts

4. **Verify Category Summary**
   - Check Category Summary "Accumulated" values
   - **Expected Result**: Should match Monthly Remaining Balances "Total"

#### **Success Criteria**:
- ✅ All future month columns appear
- ✅ All columns show green highlighting
- ✅ Total includes all salary amounts
- ✅ Perfect consistency across all views

---

### **Test 6: Edge Cases**

#### **Objective**: Test edge cases and error handling

#### **Steps**:
1. **Test with No Data**
   - Create a new user account (if possible)
   - **Expected Result**: Should handle empty states gracefully

2. **Test with Zero Values**
   - Add salary with ₹0 amount
   - **Expected Result**: Should handle zero values correctly

3. **Test with Negative Values**
   - Add expense that exceeds budget
   - **Expected Result**: Should show negative values with red color coding

4. **Test Rapid Changes**
   - Add and remove salary credits quickly
   - **Expected Result**: Should update consistently without errors

#### **Success Criteria**:
- ✅ Handles empty states gracefully
- ✅ Handles zero values correctly
- ✅ Shows negative values with proper color coding
- ✅ No errors with rapid changes

---

## 🔍 Debugging Tips

### **Check Console Logs**
- Open browser Developer Tools (F12)
- Check Console tab for any errors
- Look for our debug logs with emojis (🔄, ✅, ❌)

### **Check Network Tab**
- Monitor API calls to Supabase
- Verify RPC function calls are successful
- Check for any failed requests

### **Check Database**
- Verify data in `salary_months_tracking` table
- Check `monthly_remaining_balances` table
- Verify `credits` table has correct data

## 📊 Expected Results Summary

### **Dashboard**
- ✅ Total Accumulated Balance shows correct value
- ✅ Value includes salary months
- ✅ Value matches Analytics page

### **Analytics - Monthly Remaining Balances**
- ✅ Total column shows correct accumulated value
- ✅ Future month columns appear when salary added
- ✅ Future month columns disappear when salary removed
- ✅ Green highlighting for salary months

### **Analytics - Category Summary**
- ✅ Accumulated column matches Monthly Remaining Balances Total
- ✅ Accumulated values don't change with month filtering
- ✅ Perfect consistency across all categories

### **Salary Month Tracking**
- ✅ Future months appear in table when salary added
- ✅ Future months disappear when salary removed
- ✅ No double-counting in Total calculation
- ✅ Consistent behavior across all views

## 🚨 Common Issues and Solutions

### **Issue 1: Dashboard and Analytics show different totals**
- **Solution**: Check if `getAccumulatedTotalForCategory` is being used in both places
- **Check**: Verify salary months are included in calculation

### **Issue 2: Future month columns don't appear**
- **Solution**: Check if salary was added correctly
- **Check**: Verify `salary_months_tracking` table has the record

### **Issue 3: Category Summary Accumulated changes with filtering**
- **Solution**: Ensure using `getAccumulatedTotalForCategory` instead of `summary.accumulated_remaining_balance`

### **Issue 4: Total doesn't update after salary addition/removal**
- **Solution**: Check if `updateAllBalances()` is being called
- **Check**: Verify database triggers are working

## ✅ Test Completion Checklist

- [ ] Dashboard Total = Analytics Total
- [ ] Salary addition updates Total correctly
- [ ] Salary removal updates Total correctly
- [ ] Future month columns appear/disappear correctly
- [ ] Category Summary Accumulated is filter-independent
- [ ] All views show consistent data
- [ ] No console errors
- [ ] No database errors
- [ ] UI updates smoothly
- [ ] Color coding works correctly

## 🎯 Success Criteria

Your application is working correctly if:

1. **Perfect Consistency**: Dashboard and Analytics show identical totals
2. **Salary Integration**: Salary months are properly included in calculations
3. **Dynamic Columns**: Future month columns appear/disappear based on salary data
4. **Filter Independence**: Category Summary Accumulated values don't change with filtering
5. **Real-time Updates**: All views update immediately when data changes
6. **Error-free Operation**: No console errors or database issues

## 📝 Test Results Template

```
Test Date: ___________
Tester: ___________

Test 1 - Dashboard Total Consistency: [ ] PASS [ ] FAIL
Test 2 - Salary Month Addition: [ ] PASS [ ] FAIL
Test 3 - Category Summary Accumulated: [ ] PASS [ ] FAIL
Test 4 - Salary Month Removal: [ ] PASS [ ] FAIL
Test 5 - Multiple Salary Months: [ ] PASS [ ] FAIL
Test 6 - Edge Cases: [ ] PASS [ ] FAIL

Overall Result: [ ] PASS [ ] FAIL

Notes:
_________________________________
_________________________________
_________________________________
```

---

**Happy Testing! 🚀**

If you encounter any issues during testing, please note them down and we can address them together. The application should now provide a seamless, consistent experience across all views with proper salary month integration!
