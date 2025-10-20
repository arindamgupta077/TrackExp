# Application Testing Guide

## 🧪 **Manual Testing Checklist**

### **1. Authentication Testing**
- [ ] **Registration**: Create a new account with email/password
- [ ] **Google OAuth**: Sign in with Google account
- [ ] **Login**: Sign in with existing credentials
- [ ] **Password Reset**: Request password reset email
- [ ] **Session Persistence**: Refresh page and verify user stays logged in
- [ ] **Logout**: Sign out and verify redirect to login

### **2. Core Functionality Testing**
- [ ] **Dashboard Loading**: Verify dashboard loads with user data
- [ ] **Expense Addition**: Add a new expense with all fields
- [ ] **Expense Editing**: Modify an existing expense
- [ ] **Expense Deletion**: Remove an expense
- [ ] **Category Management**: Create/edit/delete categories
- [ ] **Data Persistence**: Verify data saves to database

### **3. Budget Management Testing**
- [ ] **Set Budget**: Create a monthly budget for a category
- [ ] **View Budgets**: Check existing budgets list
- [ ] **Edit Budget**: Modify budget amount
- [ ] **Delete Budget**: Remove a budget
- [ ] **Budget Alerts**: Verify alerts when over budget

### **4. Feature Flag Testing**
- [ ] **Preferences Access**: Go to Profile → Preferences
- [ ] **Toggle Feature**: Enable/disable past months feature
- [ ] **Persistence**: Navigate away and back, verify setting persists
- [ ] **UI Changes**: Check that past months options appear/disappear
- [ ] **Local Storage**: Clear browser data and verify fallback works

### **5. UI/UX Testing**
- [ ] **Responsive Design**: Test on different screen sizes
- [ ] **Loading States**: Verify loading indicators work
- [ ] **Error Messages**: Test error handling and user feedback
- [ ] **Navigation**: Test all navigation flows
- [ ] **Form Validation**: Verify input validation works

## 🔧 **Debugging Steps**

### **If Authentication Fails**
1. Check browser console for errors
2. Verify Supabase configuration
3. Check network tab for failed requests
4. Clear browser cache and try again

### **If Data Doesn't Load**
1. Check Supabase dashboard for RLS policies
2. Verify database tables exist
3. Check user permissions
4. Look for console errors

### **If Feature Flag Doesn't Work**
1. Check local storage in browser dev tools
2. Verify user preferences table exists
3. Check console for preference loading errors
4. Test with database disabled (should use local storage)

### **If UI Looks Broken**
1. Check CSS classes and Tailwind configuration
2. Verify all dependencies are installed
3. Check for JavaScript errors in console
4. Test in different browsers

## 🐛 **Common Issues & Solutions**

### **Issue: "Failed to load user preferences"**
**Solution**: Run the database setup script in Supabase SQL Editor
```sql
-- Copy contents of setup-user-preferences.sql and run in Supabase
```

### **Issue: Authentication redirects not working**
**Solution**: Check Supabase Auth settings for redirect URLs
- Add `http://localhost:8084/` to allowed redirect URLs
- Add `http://localhost:8084/reset-password` for password reset

### **Issue: Budget triggers blocking expense insertion**
**Solution**: Run the budget trigger fix script
```sql
-- Copy contents of test-and-fix-expense-insertion.sql and run
```

### **Issue: Feature flag not persisting**
**Solution**: Check browser console for local storage errors
- Verify localStorage is available
- Check for CORS issues
- Clear browser cache if needed

## 📊 **Performance Testing**

### **Load Testing**
- [ ] Test with 100+ expenses
- [ ] Test with multiple budgets
- [ ] Test with many categories
- [ ] Verify pagination works (if implemented)

### **Network Testing**
- [ ] Test with slow internet connection
- [ ] Test offline functionality
- [ ] Verify error handling for network failures
- [ ] Check retry mechanisms

## 🔒 **Security Testing**

### **Data Protection**
- [ ] Verify RLS policies work correctly
- [ ] Test user data isolation
- [ ] Check for SQL injection vulnerabilities
- [ ] Verify authentication tokens are secure

### **Input Validation**
- [ ] Test with malicious input
- [ ] Verify XSS protection
- [ ] Check CSRF protection
- [ ] Test file upload security (if applicable)

## 📱 **Browser Compatibility**

### **Test in Multiple Browsers**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers

### **Test Different Devices**
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

## 🎯 **Success Criteria**

### **Functional Requirements**
- [ ] All CRUD operations work correctly
- [ ] Authentication flows work properly
- [ ] Feature flags function as expected
- [ ] Data persists correctly
- [ ] Error handling works appropriately

### **Non-Functional Requirements**
- [ ] Application loads in under 3 seconds
- [ ] UI is responsive and accessible
- [ ] No console errors in production
- [ ] Works across all major browsers
- [ ] Handles network failures gracefully

## 📝 **Testing Notes**

### **Test Environment**
- **URL**: http://localhost:8084/
- **Database**: Supabase (production)
- **Browser**: Chrome DevTools open for debugging

### **Test Data**
- Create test categories: Food, Transportation, Entertainment
- Add test expenses with various amounts
- Set up test budgets for different months
- Test with both enabled and disabled feature flags

### **Reporting Issues**
When reporting issues, include:
1. Steps to reproduce
2. Expected vs actual behavior
3. Browser and version
4. Console errors (if any)
5. Network tab errors (if any)
6. Screenshots or screen recordings

## 🚀 **Next Steps**

After completing this testing:
1. Fix any critical issues found
2. Document any workarounds needed
3. Update user documentation
4. Plan for production deployment
5. Set up monitoring and analytics
