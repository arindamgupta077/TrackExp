import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini API configuration - using environment variable with fallback
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyCfVYuxoxWJszXVkyvhpiNO9a8wqXF0pMs";

// Validate API key format
const isValidApiKey = (key: string): boolean => {
  return key && key.length > 20 && key.startsWith('AIza');
};

// Initialize the Gemini AI client with error handling
let genAI: GoogleGenerativeAI;
let model: any;

try {
  if (!isValidApiKey(GEMINI_API_KEY)) {
    throw new Error('Invalid Gemini API key format');
  }
  
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  
  console.log('✅ Gemini AI client initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Gemini AI client:', error);
  
  // Create a mock client for development
  genAI = new GoogleGenerativeAI('mock-key');
  model = {
    generateContent: async () => {
      throw new Error('Gemini API key is invalid or not configured. Please check your environment variables.');
    }
  };
}

// Retry function with exponential backoff
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a retryable error
      const isRetryable = error.message?.includes('503') || 
                         error.message?.includes('overloaded') ||
                         error.message?.includes('UNAVAILABLE') ||
                         error.message?.includes('timeout');
      
      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`🔄 Retry attempt ${attempt + 1}/${maxRetries + 1} after ${delay}ms delay`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

// Export the client for direct use if needed
export { genAI, model, GoogleGenerativeAI, GEMINI_API_KEY, retryWithBackoff };

// Test function to validate API connection
export const testGeminiConnection = async (): Promise<{ success: boolean; message: string; error?: string }> => {
  try {
    if (!isValidApiKey(GEMINI_API_KEY)) {
      return {
        success: false,
        message: 'API key format is invalid',
        error: 'Invalid API key format'
      };
    }

    const testModel = new GoogleGenerativeAI(GEMINI_API_KEY).getGenerativeModel({ model: "gemini-2.5-flash" });
    
    // Use retry logic for the test
    const result = await retryWithBackoff(async () => {
      return await testModel.generateContent("Hello, this is a test message.");
    });
    
    const response = await result.response;
    const text = response.text();
    
    if (text && text.length > 0) {
      return {
        success: true,
        message: 'API connection successful! Gemini AI is working correctly.'
      };
    } else {
      return {
        success: false,
        message: 'API responded but with empty content',
        error: 'Empty response from API'
      };
    }
  } catch (error: any) {
    console.error('Gemini API test failed:', error);
    
    let errorMessage = 'Unknown error occurred';
    if (error.message?.includes('API_KEY_INVALID')) {
      errorMessage = 'API key is invalid or expired';
    } else if (error.message?.includes('QUOTA_EXCEEDED')) {
      errorMessage = 'API quota exceeded';
    } else if (error.message?.includes('PERMISSION_DENIED')) {
      errorMessage = 'API key does not have required permissions';
    } else if (error.message?.includes('503') || error.message?.includes('overloaded')) {
      errorMessage = 'Gemini API is currently overloaded. Please try again in a few minutes.';
    } else if (error.message?.includes('UNAVAILABLE')) {
      errorMessage = 'Gemini API service is temporarily unavailable';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      message: `API connection failed: ${errorMessage}`,
      error: errorMessage
    };
  }
};
