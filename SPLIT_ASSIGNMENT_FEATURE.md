# Split Assignment Feature - Monthly Unassigned Credits

## 🎯 Feature Overview

The Split Assignment feature allows users to divide a single unassigned credit amount across multiple categories, providing flexible budget allocation capabilities.

### **Example Use Case:**
- **Unassigned Credit**: ₹5,000
- **Split Assignment**:
  - ₹2,000 → Food category
  - ₹1,000 → Education category  
  - ₹2,000 → Travel category
- **Total**: ₹5,000 (exactly matches the unassigned credit)

## ✨ Features Implemented

### **1. Split Button**
- **Location**: Monthly Unassigned Credits modal, beside existing buttons
- **Icon**: Split icon (blue theme)
- **Function**: Initiates split assignment process

### **2. Dynamic Split Assignment UI**
- **Add Categories**: "Add Category" button to add more split rows
- **Remove Categories**: Trash button to remove individual splits
- **Category Selection**: Dropdown with all available categories
- **Amount Input**: Number input for each category amount

### **3. Real-time Validation**
- **Total Calculation**: Shows total assigned amount in real-time
- **Remaining Amount**: Shows remaining unassigned amount
- **Color Coding**: 
  - Green: Amounts match perfectly
  - Red: Amount mismatch or over-assignment

### **4. Smart Validation**
- **Amount Validation**: Ensures total equals original unassigned credit
- **Category Validation**: Requires at least one valid category
- **Precision Handling**: Handles decimal amounts with 0.01 precision

## 🛠️ Technical Implementation

### **State Management**
```typescript
// Split assignment state
const [splittingCredit, setSplittingCredit] = useState<{year: number, month: number, amount: number} | null>(null);
const [splitAssignments, setSplitAssignments] = useState<Array<{category: string, amount: string}>>([]);
```

### **Key Functions**

#### **1. Initialize Split Assignment**
```typescript
const handleStartSplitAssignment = (year: number, month: number, amount: number) => {
  setSplittingCredit({ year, month, amount });
  setSplitAssignments([{ category: '', amount: '' }]); // Start with one empty assignment
};
```

#### **2. Add/Remove Split Rows**
```typescript
const addSplitAssignment = () => {
  setSplitAssignments(prev => [...prev, { category: '', amount: '' }]);
};

const removeSplitAssignment = (index: number) => {
  setSplitAssignments(prev => prev.filter((_, i) => i !== index));
};
```

#### **3. Update Split Assignment**
```typescript
const updateSplitAssignment = (index: number, field: 'category' | 'amount', value: string) => {
  setSplitAssignments(prev => prev.map((item, i) => 
    i === index ? { ...item, [field]: value } : item
  ));
};
```

#### **4. Submit Split Assignment**
```typescript
const handleSplitAssignment = async () => {
  // Validation logic
  // Create multiple credit records
  // Remove original unassigned credit
  // Update dashboard
};
```

## 🎨 User Interface

### **Split Assignment Modal**
- **Header**: "Split Credit Across Categories" with split icon
- **Credit Info**: Shows original amount and month/year
- **Split Rows**: Dynamic category and amount inputs
- **Total Display**: Real-time calculation with color coding
- **Action Buttons**: Split and Cancel buttons

### **Visual Design**
- **Theme**: Blue gradient (consistent with split functionality)
- **Layout**: Responsive grid layout for category/amount inputs
- **Feedback**: Color-coded validation (green/red)
- **Icons**: Split, Plus, Trash icons for clear actions

## 🔄 Workflow

### **Step 1: Initiate Split**
1. User clicks "Split" button on unassigned credit
2. Split assignment modal opens
3. One empty category row is pre-populated

### **Step 2: Configure Splits**
1. User selects categories from dropdown
2. User enters amounts for each category
3. User can add more categories with "Add Category" button
4. User can remove categories with trash button

### **Step 3: Validation**
1. System calculates total assigned amount
2. System shows remaining amount
3. Color coding indicates if amounts match

### **Step 4: Submit**
1. User clicks "Split Across X Categories" button
2. System validates all assignments
3. System creates individual credit records
4. System removes original unassigned credit
5. Dashboard updates in real-time

## ✅ Validation Rules

### **Amount Validation**
- Total assigned amount must equal original unassigned credit
- Precision: 0.01 (handles decimal amounts)
- No negative amounts allowed

### **Category Validation**
- At least one category must be selected
- Each category must have a valid amount > 0
- Categories can be duplicated (same category multiple times)

### **Business Logic**
- Original unassigned credit is completely consumed
- Each split creates a separate credit record
- All credits use current date (not month start date)
- Dashboard refreshes automatically

## 🎯 Benefits

### **For Users**
- **Flexibility**: Distribute large unassigned credits across multiple budgets
- **Precision**: Allocate exact amounts to specific categories
- **Efficiency**: Single operation instead of multiple individual assignments
- **Visual Feedback**: Real-time validation and calculation

### **For Budget Management**
- **Better Allocation**: More granular budget distribution
- **Accurate Tracking**: Each category gets precise credit amount
- **Audit Trail**: Clear description shows split origin
- **Real-time Updates**: Immediate dashboard refresh

## 🧪 Testing Scenarios

### **Valid Scenarios**
1. **Perfect Split**: ₹5,000 → ₹2,000 + ₹1,000 + ₹2,000
2. **Decimal Amounts**: ₹1,000.50 → ₹500.25 + ₹500.25
3. **Single Category**: ₹3,000 → ₹3,000 (one category)
4. **Multiple Categories**: ₹10,000 → 5 categories with various amounts

### **Invalid Scenarios**
1. **Amount Mismatch**: ₹5,000 → ₹2,000 + ₹1,000 (total: ₹3,000)
2. **Over Assignment**: ₹5,000 → ₹3,000 + ₹3,000 (total: ₹6,000)
3. **Empty Categories**: No categories selected
4. **Zero Amounts**: Categories with ₹0 amounts

## 🚀 Usage Example

### **Scenario**: User has ₹5,000 unassigned credit for January 2025

1. **Click Split Button**: Opens split assignment modal
2. **Add Categories**: 
   - Food: ₹2,000
   - Education: ₹1,000
   - Travel: ₹2,000
3. **Validation**: Total shows ₹5,000 (green - matches)
4. **Submit**: Creates 3 separate credit records
5. **Result**: 
   - Food budget: +₹2,000
   - Education budget: +₹1,000
   - Travel budget: +₹2,000
   - Unassigned credit: ₹0 (removed)

---
**Feature Status**: ✅ COMPLETED
**Implementation Date**: $(Get-Date)
**Testing Status**: Ready for user testing
