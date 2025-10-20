import { z } from 'zod';

export const signUpSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'),
  email: z.string()
    .email('Please enter a valid email address')
    .max(100, 'Email must be less than 100 characters'),
  phone: z.string()
    .optional()
    .refine((val) => !val || /^[+]?[\d\s\-()]{10,15}$/.test(val), {
      message: 'Please enter a valid phone number'
    }),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be less than 100 characters')
});

export const signInSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address'),
  password: z.string()
    .min(1, 'Password is required')
});

export const expenseSchema = z.object({
  category: z.string()
    .min(1, 'Category is required')
    .max(50, 'Category must be less than 50 characters'),
  amount: z.number()
    .positive('Amount must be greater than 0')
    .max(1000000, 'Amount must be less than 10,00,000'),
  description: z.string()
    .max(200, 'Description must be less than 200 characters')
    .optional(),
  date: z.string()
    .min(1, 'Date is required')
});

export type SignUpFormData = z.infer<typeof signUpSchema>;
export type SignInFormData = z.infer<typeof signInSchema>;
export type ExpenseFormData = z.infer<typeof expenseSchema>;