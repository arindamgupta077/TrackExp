// Comprehensive category icons data
export interface CategoryIcon {
  name: string;
  emoji: string;
  description: string;
}

export const categoryIcons: CategoryIcon[] = [
  // Food & Dining
  { name: 'Food', emoji: '🍽️', description: 'General food expenses' },
  { name: 'Living Cost - Food', emoji: '🥘', description: 'Daily food expenses' },
  { name: 'Dinning & Entertainment', emoji: '🍴', description: 'Dining out and entertainment' },
  
  // Education & Learning
  { name: 'Education', emoji: '📚', description: 'Educational expenses' },
  { name: 'Upkill Myself', emoji: '🎓', description: 'Self-improvement and skill development' },
  { name: 'Extra curriculum activity', emoji: '🎨', description: 'Extracurricular activities' },
  
  // Travel & Transportation
  { name: 'Travel', emoji: '✈️', description: 'Travel expenses' },
  { name: 'Travel Expense', emoji: '🧳', description: 'Travel-related costs' },
  { name: 'Transport', emoji: '🚌', description: 'Transportation costs' },
  { name: 'Petrol & Bike Maintenance', emoji: '🏍️', description: 'Bike fuel and maintenance' },
  { name: 'Petrol & Car Maintenance', emoji: '🚗', description: 'Car fuel and maintenance' },
  
  // Housing & Utilities
  { name: 'House Rent', emoji: '🏠', description: 'House rent payments' },
  { name: 'House Maintenance/Repair', emoji: '🔧', description: 'Home maintenance and repairs' },
  { name: 'Electric bill', emoji: '⚡', description: 'Electricity bills' },
  { name: 'Internet Bill', emoji: '🌐', description: 'Internet service bills' },
  { name: 'Utilities', emoji: '💡', description: 'General utility bills' },
  
  // Financial
  { name: 'Loan / EMI', emoji: '💰', description: 'Loan payments and EMIs' },
  { name: 'SIP', emoji: '📈', description: 'Systematic Investment Plans' },
  { name: 'Emergency Fund Savings', emoji: '🆘', description: 'Emergency fund contributions' },
  { name: 'Travel Saving', emoji: '✈️💰', description: 'Travel savings' },
  { name: 'E Fund Saving in Bank', emoji: '🏦', description: 'Emergency fund in bank' },
  { name: 'Mediclaim', emoji: '🏥', description: 'Medical insurance' },
  
  // Household & Essentials
  { name: 'Household Essentials', emoji: '🏡', description: 'Household items and essentials' },
  { name: 'Phone Recharge', emoji: '📱', description: 'Mobile phone recharges' },
  
  // Personal Care & Health
  { name: 'Salon/Grooming', emoji: '💇‍♂️', description: 'Salon and grooming expenses' },
  { name: 'Beauty & parlour', emoji: '💄', description: 'Beauty and parlour services' },
  { name: 'Medicine & Healthcare', emoji: '💊', description: 'Medical and healthcare expenses' },
  { name: 'Health', emoji: '🏥', description: 'Health-related expenses' },
  { name: 'Gym Subscription', emoji: '💪', description: 'Gym membership fees' },
  { name: 'Protein/Fitness needs', emoji: '🥤', description: 'Fitness supplements and needs' },
  
  // Subscriptions & Services
  { name: 'Subscription', emoji: '📺', description: 'Various subscriptions' },
  { name: 'Cloud', emoji: '☁️', description: 'Cloud service subscriptions' },
  
  // Family & Relationships
  { name: 'Parent Maintenance', emoji: '👨‍👩‍👧‍👦', description: 'Parent support and maintenance' },
  { name: 'Family', emoji: '👪', description: 'Family-related expenses' },
  { name: 'Child', emoji: '👶', description: 'Child-related expenses' },
  { name: 'Gifting Cost', emoji: '🎁', description: 'Gift expenses' },
  
  // Entertainment & Hobbies
  { name: 'Entertainment & Hobbies', emoji: '🎮', description: 'Entertainment and hobby expenses' },
  { name: 'Celebration expense', emoji: '🎉', description: 'Celebration and party expenses' },
  
  // Personal & Miscellaneous
  { name: 'Clothing', emoji: '👕', description: 'Clothing and apparel' },
  { name: 'Personal Expense', emoji: '👤', description: 'Personal miscellaneous expenses' },
  { name: 'Miscellaneous', emoji: '🔀', description: 'Other miscellaneous expenses' },
  
  // Additional categories from user's list
  { name: 'Dinning & Entertainment', emoji: '🍴', description: 'Dining out and entertainment' },
  { name: 'E Fund Saving in Bank', emoji: '🏦', description: 'Emergency fund savings in bank' },
  
  // Business & Professional
  { name: 'Technology', emoji: '💻', description: 'Technology and software expenses' },
  { name: 'Marketing', emoji: '📢', description: 'Marketing and advertising expenses' },
  { name: 'Business', emoji: '💼', description: 'Business-related expenses' },
];

// Additional common icons that users might want to use
export const additionalIcons: CategoryIcon[] = [
  // Daily Essentials
  { name: 'Shopping', emoji: '🛒', description: 'General shopping' },
  { name: 'Entertainment', emoji: '🎬', description: 'Movies and entertainment' },
  { name: 'Transportation', emoji: '🚇', description: 'Public transportation' },
  { name: 'Other', emoji: '📋', description: 'Other expenses' },
  { name: 'Coffee', emoji: '☕', description: 'Coffee and beverages' },
  { name: 'Books', emoji: '📖', description: 'Books and reading' },
  { name: 'Music', emoji: '🎵', description: 'Music and audio' },
  { name: 'Sports', emoji: '⚽', description: 'Sports and recreation' },
  { name: 'Gaming', emoji: '🎮', description: 'Gaming expenses' },
  { name: 'Photography', emoji: '📸', description: 'Photography equipment' },
  { name: 'Gardening', emoji: '🌱', description: 'Gardening supplies' },
  { name: 'Pets', emoji: '🐕', description: 'Pet expenses' },
  { name: 'Insurance', emoji: '🛡️', description: 'Insurance payments' },
  { name: 'Taxes', emoji: '🧾', description: 'Tax payments' },
  { name: 'Charity', emoji: '❤️', description: 'Charitable donations' },
  { name: 'Investment', emoji: '📊', description: 'Investment expenses' },
  { name: 'Retirement', emoji: '🏖️', description: 'Retirement savings' },
  { name: 'Wedding', emoji: '💒', description: 'Wedding expenses' },
  { name: 'Baby', emoji: '🍼', description: 'Baby expenses' },
  { name: 'Home Improvement', emoji: '🏗️', description: 'Home improvement projects' },
  
  // Food & Dining
  { name: 'Restaurant', emoji: '🍽️', description: 'Restaurant dining' },
  { name: 'Fast Food', emoji: '🍔', description: 'Fast food and quick meals' },
  { name: 'Groceries', emoji: '🛍️', description: 'Grocery shopping' },
  { name: 'Snacks', emoji: '🍿', description: 'Snacks and treats' },
  { name: 'Alcohol', emoji: '🍷', description: 'Alcoholic beverages' },
  { name: 'Tea', emoji: '🍵', description: 'Tea and hot beverages' },
  { name: 'Juice', emoji: '🧃', description: 'Juices and soft drinks' },
  { name: 'Water', emoji: '💧', description: 'Water and hydration' },
  { name: 'Breakfast', emoji: '🥞', description: 'Breakfast expenses' },
  { name: 'Lunch', emoji: '🥪', description: 'Lunch expenses' },
  { name: 'Dinner', emoji: '🍖', description: 'Dinner expenses' },
  
  // Transportation & Travel
  { name: 'Uber', emoji: '🚗', description: 'Ride sharing services' },
  { name: 'Taxi', emoji: '🚕', description: 'Taxi services' },
  { name: 'Bus', emoji: '🚌', description: 'Bus transportation' },
  { name: 'Train', emoji: '🚆', description: 'Train travel' },
  { name: 'Flight', emoji: '✈️', description: 'Air travel' },
  { name: 'Hotel', emoji: '🏨', description: 'Hotel accommodation' },
  { name: 'Parking', emoji: '🅿️', description: 'Parking fees' },
  { name: 'Toll', emoji: '🛣️', description: 'Toll charges' },
  { name: 'Gas', emoji: '⛽', description: 'Fuel expenses' },
  { name: 'Bike', emoji: '🚲', description: 'Bicycle expenses' },
  { name: 'Scooter', emoji: '🛵', description: 'Scooter expenses' },
  
  // Health & Wellness
  { name: 'Doctor', emoji: '👨‍⚕️', description: 'Doctor visits' },
  { name: 'Dentist', emoji: '🦷', description: 'Dental care' },
  { name: 'Pharmacy', emoji: '💊', description: 'Medicine and pharmacy' },
  { name: 'Hospital', emoji: '🏥', description: 'Hospital expenses' },
  { name: 'Yoga', emoji: '🧘', description: 'Yoga classes' },
  { name: 'Swimming', emoji: '🏊', description: 'Swimming activities' },
  { name: 'Running', emoji: '🏃', description: 'Running and jogging' },
  { name: 'Cycling', emoji: '🚴', description: 'Cycling activities' },
  { name: 'Massage', emoji: '💆', description: 'Massage therapy' },
  { name: 'Spa', emoji: '🧖', description: 'Spa treatments' },
  { name: 'Therapy', emoji: '🧠', description: 'Mental health therapy' },
  
  // Personal Care & Beauty
  { name: 'Haircut', emoji: '💇', description: 'Haircut and styling' },
  { name: 'Makeup', emoji: '💄', description: 'Makeup and cosmetics' },
  { name: 'Skincare', emoji: '🧴', description: 'Skincare products' },
  { name: 'Perfume', emoji: '🌸', description: 'Fragrances' },
  { name: 'Nails', emoji: '💅', description: 'Nail care' },
  { name: 'Tattoo', emoji: '🎨', description: 'Tattoo expenses' },
  { name: 'Jewelry', emoji: '💍', description: 'Jewelry purchases' },
  { name: 'Watch', emoji: '⌚', description: 'Watches and accessories' },
  
  // Technology & Electronics
  { name: 'Phone', emoji: '📱', description: 'Mobile phone expenses' },
  { name: 'Laptop', emoji: '💻', description: 'Laptop and computer' },
  { name: 'Tablet', emoji: '📲', description: 'Tablet expenses' },
  { name: 'Headphones', emoji: '🎧', description: 'Audio equipment' },
  { name: 'Camera', emoji: '📷', description: 'Camera equipment' },
  { name: 'Software', emoji: '💿', description: 'Software purchases' },
  { name: 'Apps', emoji: '📱', description: 'Mobile app purchases' },
  { name: 'Gaming Console', emoji: '🎮', description: 'Gaming console' },
  { name: 'VR', emoji: '🥽', description: 'Virtual reality equipment' },
  
  // Home & Living
  { name: 'Rent', emoji: '🏠', description: 'Rent payments' },
  { name: 'Mortgage', emoji: '🏡', description: 'Mortgage payments' },
  { name: 'Electricity', emoji: '⚡', description: 'Electricity bills' },
  { name: 'Water Bill', emoji: '💧', description: 'Water utility bills' },
  { name: 'Gas Bill', emoji: '🔥', description: 'Gas utility bills' },
  { name: 'Internet', emoji: '🌐', description: 'Internet service' },
  { name: 'Cable', emoji: '📺', description: 'Cable TV service' },
  { name: 'Cleaning', emoji: '🧹', description: 'Cleaning supplies' },
  { name: 'Laundry', emoji: '👕', description: 'Laundry expenses' },
  { name: 'Furniture', emoji: '🪑', description: 'Furniture purchases' },
  { name: 'Appliances', emoji: '🔌', description: 'Home appliances' },
  { name: 'Tools', emoji: '🔧', description: 'Tools and equipment' },
  
  // Education & Learning
  { name: 'School', emoji: '🎓', description: 'School expenses' },
  { name: 'University', emoji: '🏫', description: 'University expenses' },
  { name: 'Course', emoji: '📚', description: 'Online courses' },
  { name: 'Workshop', emoji: '🎯', description: 'Workshops and training' },
  { name: 'Certification', emoji: '📜', description: 'Certification fees' },
  { name: 'Language', emoji: '🗣️', description: 'Language learning' },
  { name: 'Music Lessons', emoji: '🎼', description: 'Music lessons' },
  { name: 'Art Classes', emoji: '🎨', description: 'Art classes' },
  
  // Work & Business
  { name: 'Office', emoji: '🏢', description: 'Office expenses' },
  { name: 'Meeting', emoji: '🤝', description: 'Business meetings' },
  { name: 'Conference', emoji: '🎤', description: 'Conferences and events' },
  { name: 'Networking', emoji: '👥', description: 'Networking events' },
  { name: 'Freelance', emoji: '💼', description: 'Freelance work' },
  { name: 'Client', emoji: '👤', description: 'Client expenses' },
  { name: 'Marketing', emoji: '📢', description: 'Marketing expenses' },
  { name: 'Advertising', emoji: '📺', description: 'Advertising costs' },
  
  // Hobbies & Recreation
  { name: 'Movies', emoji: '🎬', description: 'Movie tickets' },
  { name: 'Theater', emoji: '🎭', description: 'Theater shows' },
  { name: 'Concert', emoji: '🎵', description: 'Concert tickets' },
  { name: 'Museum', emoji: '🏛️', description: 'Museum visits' },
  { name: 'Zoo', emoji: '🦁', description: 'Zoo and aquarium' },
  { name: 'Park', emoji: '🌳', description: 'Park visits' },
  { name: 'Beach', emoji: '🏖️', description: 'Beach activities' },
  { name: 'Camping', emoji: '⛺', description: 'Camping trips' },
  { name: 'Hiking', emoji: '🥾', description: 'Hiking activities' },
  { name: 'Fishing', emoji: '🎣', description: 'Fishing trips' },
  { name: 'Painting', emoji: '🎨', description: 'Art supplies' },
  { name: 'Crafting', emoji: '✂️', description: 'Craft supplies' },
  
  // Special Occasions
  { name: 'Birthday', emoji: '🎂', description: 'Birthday celebrations' },
  { name: 'Anniversary', emoji: '💕', description: 'Anniversary celebrations' },
  { name: 'Holiday', emoji: '🎄', description: 'Holiday expenses' },
  { name: 'Valentine', emoji: '💘', description: 'Valentine\'s Day' },
  { name: 'Mother\'s Day', emoji: '👩', description: 'Mother\'s Day' },
  { name: 'Father\'s Day', emoji: '👨', description: 'Father\'s Day' },
  { name: 'Graduation', emoji: '🎓', description: 'Graduation expenses' },
  { name: 'Funeral', emoji: '🕊️', description: 'Funeral expenses' },
  
  // Financial & Legal
  { name: 'Bank', emoji: '🏦', description: 'Banking fees' },
  { name: 'ATM', emoji: '🏧', description: 'ATM fees' },
  { name: 'Transfer', emoji: '💸', description: 'Money transfers' },
  { name: 'Loan', emoji: '💰', description: 'Loan payments' },
  { name: 'Credit Card', emoji: '💳', description: 'Credit card fees' },
  { name: 'Legal', emoji: '⚖️', description: 'Legal fees' },
  { name: 'Notary', emoji: '📝', description: 'Notary services' },
  { name: 'Consultation', emoji: '💬', description: 'Professional consultation' },
  
  // Miscellaneous Daily Life
  { name: 'Gift', emoji: '🎁', description: 'Gifts and presents' },
  { name: 'Donation', emoji: '🤲', description: 'Charitable donations' },
  { name: 'Tips', emoji: '💡', description: 'Tips and gratuities' },
  { name: 'Repair', emoji: '🔨', description: 'Repair services' },
  { name: 'Delivery', emoji: '🚚', description: 'Delivery fees' },
  { name: 'Shipping', emoji: '📦', description: 'Shipping costs' },
  { name: 'Storage', emoji: '🏪', description: 'Storage fees' },
  { name: 'Membership', emoji: '🎫', description: 'Membership fees' },
  { name: 'Subscription', emoji: '📱', description: 'Subscription services' },
  { name: 'License', emoji: '📄', description: 'License fees' },
  { name: 'Permit', emoji: '📜', description: 'Permit fees' },
  { name: 'Fine', emoji: '⚠️', description: 'Fines and penalties' },
];

// Combined list of all available icons
export const allCategoryIcons = [...categoryIcons, ...additionalIcons];

// Function to get icon by category name
export const getIconByCategoryName = (categoryName: string): string => {
  // First check in main categoryIcons
  let icon = categoryIcons.find(icon => 
    icon.name.toLowerCase() === categoryName.toLowerCase()
  );
  
  // If not found, check in additionalIcons
  if (!icon) {
    icon = additionalIcons.find(icon => 
      icon.name.toLowerCase() === categoryName.toLowerCase()
    );
  }
  
  return icon ? icon.emoji : '📦'; // Default icon
};

// Function to get all available emojis for selection
export const getAllAvailableEmojis = (): string[] => {
  return allCategoryIcons.map(icon => icon.emoji);
};

// Function to search icons by name or description
export const searchIcons = (query: string): CategoryIcon[] => {
  const lowercaseQuery = query.toLowerCase();
  return allCategoryIcons.filter(icon => 
    icon.name.toLowerCase().includes(lowercaseQuery) ||
    icon.description.toLowerCase().includes(lowercaseQuery) ||
    icon.emoji.includes(query)
  );
};
