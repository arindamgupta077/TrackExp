import { GeminiChatService } from '@/services/geminiChat';

export const testGeminiAPIKey = async (): Promise<{ success: boolean; message: string; error?: string }> => {
  try {
    const result = await GeminiChatService.testConnection();
    return result;
  } catch (error: any) {
    console.error('API key test failed:', error);
    return {
      success: false,
      message: 'Failed to test API connection',
      error: error.message || 'Unknown error'
    };
  }
};
