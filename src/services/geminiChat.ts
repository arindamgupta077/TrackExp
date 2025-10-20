import { model, testGeminiConnection, retryWithBackoff } from '@/integrations/gemini/client';
import { Expense } from '@/hooks/useExpenses';
import { FinancialAnalysisService, ChatMessage } from './financialAnalysis';
import { ExpenseAnalysisService, ExpenseAnalysisResult, MonthlyComparisonResult } from './expenseAnalysis';

export class GeminiChatService {
  // Test API connection
  static async testConnection(): Promise<{ success: boolean; message: string; error?: string }> {
    return await testGeminiConnection();
  }

  private static readonly SYSTEM_PROMPT = `You are a helpful financial advisor AI assistant. You help users understand their spending patterns, provide financial insights, and give personalized advice based on their expense data.

Key guidelines:
1. Always be encouraging and supportive
2. Provide specific, actionable advice
3. Use the user's actual expense data to give personalized insights
4. Suggest practical ways to save money
5. Help identify spending patterns and trends
6. Be conversational and friendly
7. If asked about data not available, politely explain what you can help with
8. Always format currency in Indian Rupees (₹)
9. Keep responses concise but informative
10. Focus on practical financial advice and budgeting tips

FORMATTING INSTRUCTIONS:
- Use **bold text** for important headings and key points
- Use different bullet points for organization:
  • Use solid bullet (•) for main points
  ◦ Use hollow bullet (◦) for sub-points
  ▪ Use square bullet (▪) for additional details
  ▫ Use small square (▫) for minor points
- Use numbered lists (1., 2., 3.) for step-by-step instructions
- Use line breaks to separate different sections
- Keep formatting clean and organized

SPECIAL RESPONSE TYPES:
- For SPENDING ANALYSIS requests: Provide detailed breakdown of spending patterns, top categories with percentages, spending trends, and insights about where money is being spent
- For SAVINGS TIPS requests: Give specific, actionable recommendations based on the user's actual spending data, including potential savings amounts and practical steps to reduce expenses
- For MONTHLY EXPENSE ANALYSIS requests: When users ask about specific months (e.g., "January 2025 expenses", "How much did I spend in March 2025?"), provide detailed monthly breakdowns including total amounts, category breakdowns, top expenses, and daily spending patterns
- For MONTHLY CALCULATION requests: When users ask for total spending in a specific month, provide the calculated total with transaction count and brief summary
- For MONTHLY COMPARISON requests: When users ask to compare two months (e.g., "Compare July 2025 and August 2025", "July vs August expenses"), provide detailed comparison including total differences, percentage changes, category-wise comparisons, and insights about spending trends between the months

PERSONALIZATION:
- Always address the user by their name when provided (e.g., "Hi John," or "Based on your data, Sarah,")
- Use a friendly, conversational tone as if speaking to a friend
- Make the conversation feel personal and tailored to their specific financial situation
- Use "you" and "your" to make it feel like a one-on-one conversation

You have access to the user's expense data and can analyze their spending patterns to provide personalized financial advice.`;

  static async sendMessage(
    userMessage: string, 
    expenses: Expense[], 
    chatHistory: ChatMessage[] = [],
    userName?: string
  ): Promise<string> {
    try {
      // Check if this is a monthly comparison query first
      const comparisonAnalysis = await this.handleMonthlyComparisonQuery(userMessage, expenses);
      if (comparisonAnalysis) {
        return comparisonAnalysis;
      }

      const allMonthsCategoryAnalysis = await this.handleAllMonthsCategoryQuery(userMessage, expenses, userName);
      if (allMonthsCategoryAnalysis) {
        return allMonthsCategoryAnalysis;
      }

      // Check if this is a monthly expense query
      const monthlyAnalysis = this.handleMonthlyExpenseQuery(userMessage, expenses);
      if (monthlyAnalysis) {
        if (monthlyAnalysis.startsWith('MONTHLY_CATEGORY_ANALYSIS_REQUEST:')) {
          const [, month, year, encodedCategory, encodedMessage] = monthlyAnalysis.split(':');
          const monthNum = parseInt(month, 10);
          const yearNum = parseInt(year, 10);
          const category = decodeURIComponent(encodedCategory);
          const originalMessage = decodeURIComponent(encodedMessage);

          const analysis = ExpenseAnalysisService.analyzeMonthlyExpenses(expenses, monthNum, yearNum);

          if (!analysis.found || !analysis.data) {
            return `**${analysis.requestedMonth} ${analysis.requestedYear} Analysis**\n\n${analysis.message}`;
          }

          const categoryAnalysis = ExpenseAnalysisService.analyzeCategoryMonthlyExpenses(expenses, monthNum, yearNum, category);

          if (!categoryAnalysis.found || !categoryAnalysis.data) {
            return `**${categoryAnalysis.category} – ${analysis.requestedMonth} ${analysis.requestedYear}**\n\n${categoryAnalysis.message}`;
          }

          const monthlyData = ExpenseAnalysisService.formatMonthlyDataForAI(analysis);
          const categoryData = ExpenseAnalysisService.formatCategoryMonthlyDataForAI(analysis, categoryAnalysis);
          const rollingTrendSummary = ExpenseAnalysisService.formatRollingTrendForAI(
            ExpenseAnalysisService.getRollingTrend(expenses)
          );

          const insights = FinancialAnalysisService.analyzeExpenses(expenses);
          const recommendationsBlock = FinancialAnalysisService.formatRecommendationsForAI(insights);

          const userGreeting = userName ? `\n\nUser's Name: ${userName}` : '';
          const fullPrompt = `${this.SYSTEM_PROMPT}

${monthlyData}

${categoryData}

${rollingTrendSummary}

${recommendationsBlock}${userGreeting}

User's Question: ${originalMessage}

Please provide a detailed analysis focusing on the ${categoryAnalysis.category} spending for ${analysis.requestedMonth} ${analysis.requestedYear}. Include:
1. **Category Behaviour**: Describe how this category behaved within the month.
2. **Month Context**: Link the category performance back to the full-month picture.
3. **Trends & Forecast**: Reference the rolling trend data when relevant.
4. **Actionable Recommendations**: Tailor guidance using the provided recommendations.
5. **Next Steps**: Suggest what the user could monitor next month.

Use the formatting instructions above to keep the response organized and friendly.`;

          const result = await retryWithBackoff(async () => {
            return await model.generateContent(fullPrompt);
          });
          const response = await result.response;
          const text = response.text();

          return this.cleanMarkdownFormatting(text || "I'm sorry, I couldn't generate a response. Please try again.");
        }

        if (monthlyAnalysis.startsWith('MONTHLY_ANALYSIS_REQUEST:')) {
          const [, month, year, encodedMessage] = monthlyAnalysis.split(':');
          const monthNum = parseInt(month, 10);
          const yearNum = parseInt(year, 10);
          const originalMessage = decodeURIComponent(encodedMessage);
          
          // Get the monthly analysis data
          const analysis = ExpenseAnalysisService.analyzeMonthlyExpenses(expenses, monthNum, yearNum);
          
          if (analysis.found && analysis.data) {
            // Format the monthly data for LLM analysis
            const monthlyData = ExpenseAnalysisService.formatMonthlyDataForAI(analysis);
            const rollingTrendSummary = ExpenseAnalysisService.formatRollingTrendForAI(
              ExpenseAnalysisService.getRollingTrend(expenses)
            );
            const insights = FinancialAnalysisService.analyzeExpenses(expenses);
            const recommendationsBlock = FinancialAnalysisService.formatRecommendationsForAI(insights);
            
            // Create a specialized prompt for monthly analysis
            const userGreeting = userName ? `\n\nUser's Name: ${userName}` : '';
            const fullPrompt = `${this.SYSTEM_PROMPT}

${monthlyData}

${rollingTrendSummary}

${recommendationsBlock}${userGreeting}

User's Question: ${originalMessage}

Please provide a detailed analysis and insights about the user's ${analysis.requestedMonth} ${analysis.requestedYear} expenses. Focus on:
1. **Spending Patterns**: Analyze the spending behavior and patterns
2. **Category Insights**: Provide insights about spending categories and their significance
3. **Financial Health**: Assess the financial health based on this month's data
4. **Recommendations**: Give specific, actionable recommendations based on the data
5. **Trends**: Reference the rolling trend and forecast when relevant

Use the formatting instructions above to make your response well-organized with bold text, different bullet points, and clear structure.`;

            // Generate response using LLM with retry logic
            const result = await retryWithBackoff(async () => {
              return await model.generateContent(fullPrompt);
            });
            const response = await result.response;
            const text = response.text();

            // Clean up any markdown formatting that might still appear
            const cleanedText = this.cleanMarkdownFormatting(text || "I'm sorry, I couldn't generate a response. Please try again.");
            return cleanedText;
          } else {
            return `**${analysis.requestedMonth} ${analysis.requestedYear} Analysis**\n\n${analysis.message}`;
          }
        }

        // Return the direct response for calculation requests
        return monthlyAnalysis;
      }

      // Analyze expenses to get insights
      const insights = FinancialAnalysisService.analyzeExpenses(expenses);
      const expenseData = FinancialAnalysisService.formatExpenseDataForAI(expenses, insights);
      const recommendationsBlock = FinancialAnalysisService.formatRecommendationsForAI(insights);
      const rollingTrendSummary = ExpenseAnalysisService.formatRollingTrendForAI(
        ExpenseAnalysisService.getRollingTrend(expenses)
      );

      // Build conversation history
      const conversationHistory = chatHistory.slice(-10).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      // Create the full prompt
      const userGreeting = userName ? `\n\nUser's Name: ${userName}` : '';
  const fullPrompt = `${this.SYSTEM_PROMPT}

${expenseData}

${rollingTrendSummary}

${recommendationsBlock}${userGreeting}

User's Question: ${userMessage}

Please provide a helpful response based on the user's expense data and question. Use the formatting instructions above to make your response well-organized with bold text, different bullet points, and clear structure.`;

      // Generate response with retry logic
      const result = await retryWithBackoff(async () => {
        return await model.generateContent(fullPrompt);
      });
      const response = await result.response;
      const text = response.text();

      // Clean up any markdown formatting that might still appear
      const cleanedText = this.cleanMarkdownFormatting(text || "I'm sorry, I couldn't generate a response. Please try again.");

      return cleanedText;
    } catch (error: unknown) {
      console.error('Error generating Gemini response:', error);
      
      const message = error instanceof Error ? error.message : '';

      // Provide more specific error messages
      if (message.includes('API_KEY_INVALID')) {
        return "**❌ API Connection Issue**\n\nI'm unable to connect to the AI service because the API key is invalid or expired. Please contact support to resolve this issue.\n\n**What you can do:**\n• Check your internet connection\n• Try again in a few minutes\n• Contact support if the issue persists";
      } else if (message.includes('QUOTA_EXCEEDED')) {
        return "**⚠️ Service Temporarily Unavailable**\n\nI've reached the API usage limit. Please try again later or contact support.\n\n**What you can do:**\n• Wait a few minutes and try again\n• Contact support for assistance";
      } else if (message.includes('PERMISSION_DENIED')) {
        return "**🔒 Access Denied**\n\nI don't have the required permissions to access the AI service. Please contact support.\n\n**What you can do:**\n• Contact support to check API permissions\n• Try again later";
      } else if (message.includes('503') || message.includes('overloaded')) {
        return "**🔄 AI Service Busy**\n\nThe Gemini AI service is currently experiencing high demand and is temporarily overloaded. I've already tried multiple times to connect.\n\n**What you can do:**\n• **Wait 2-3 minutes** and try your question again\n• **Try a shorter question** to reduce processing time\n• **Avoid peak hours** (evening times are usually busier)\n• The service should be back to normal shortly\n\n**Note:** This is a temporary issue with Google's servers, not your connection.";
      } else if (message.includes('UNAVAILABLE')) {
        return "**🌐 Service Unavailable**\n\nThe AI service is temporarily unavailable. Please try again in a few minutes.\n\n**What you can do:**\n• Check your internet connection\n• Wait a few minutes and try again\n• Contact support if the issue persists";
      } else {
        return "**⚠️ Connection Issue**\n\nI'm having trouble connecting to the AI service. This could be due to:\n\n• **Internet connection issues**\n• **Temporary service outage**\n• **API configuration problems**\n\n**What you can do:**\n• Check your internet connection\n• Try again in a few minutes\n• Contact support if the issue persists";
      }
    }
  }

  static async getQuickInsights(expenses: Expense[], userName?: string): Promise<string> {
    const insights = FinancialAnalysisService.analyzeExpenses(expenses);
    
    const userGreeting = userName ? `\n\nUser's Name: ${userName}` : '';
    const prompt = `${this.SYSTEM_PROMPT}

${FinancialAnalysisService.formatExpenseDataForAI(expenses, insights)}${userGreeting}

Please provide a brief summary of the user's financial situation and 2-3 key insights or recommendations. Keep it concise and actionable. Use the formatting instructions above to make your response well-organized with bold text, different bullet points, and clear structure.`;

    try {
      const result = await retryWithBackoff(async () => {
        return await model.generateContent(prompt);
      });
      const response = await result.response;
      const text = response.text() || "Unable to generate insights at the moment.";
      return this.cleanMarkdownFormatting(text);
    } catch (error) {
      console.error('Error generating quick insights:', error);
      return "Unable to generate insights at the moment.";
    }
  }

  static async getWelcomeMessage(expenses: Expense[], userName?: string): Promise<string> {
    const insights = FinancialAnalysisService.analyzeExpenses(expenses);
    
    const userGreeting = userName ? `\n\nUser's Name: ${userName}` : '';
    const prompt = `${this.SYSTEM_PROMPT}

${FinancialAnalysisService.formatExpenseDataForAI(expenses, insights)}${userGreeting}

Please provide a warm welcome message for the user and briefly introduce what you can help them with based on their expense data. Keep it friendly and encouraging. Use the formatting instructions above to make your response well-organized with bold text, different bullet points, and clear structure.`;

    try {
      const result = await retryWithBackoff(async () => {
        return await model.generateContent(prompt);
      });
      const response = await result.response;
      const text = response.text() || "Hello! I'm your financial AI assistant. I can help you analyze your expenses and provide personalized financial advice. What would you like to know about your spending habits?";
      return this.cleanMarkdownFormatting(text);
    } catch (error) {
      console.error('Error generating welcome message:', error);
      return "Hello! I'm your financial AI assistant. I can help you analyze your expenses and provide personalized financial advice. What would you like to know about your spending habits?";
    }
  }

  /**
   * Handle monthly comparison queries specifically
   */
  private static async handleMonthlyComparisonQuery(userMessage: string, expenses: Expense[]): Promise<string | null> {
    const lowerMessage = userMessage.toLowerCase();
    
    // Check if this is a comparison query
    const comparisonKeywords = ['compare', 'comparison', 'vs', 'versus', 'between'];
    const hasComparisonKeyword = comparisonKeywords.some(keyword => lowerMessage.includes(keyword));
    
    if (!hasComparisonKeyword) {
      return null; // Not a comparison query
    }

    // Parse the comparison query
    const parseResult = ExpenseAnalysisService.parseComparisonQuery(userMessage);
    
    if (!parseResult.success) {
      return `**Unable to parse comparison request**\n\n${parseResult.message}`;
    }

    // Perform the comparison
    const comparison = ExpenseAnalysisService.compareMonthlyExpenses(
      expenses,
      parseResult.month1,
      parseResult.year1,
      parseResult.month2,
      parseResult.year2
    );

    // Format the response and send to LLM for analysis
    const formattedData = ExpenseAnalysisService.formatComparisonDataForAI(comparison);
    const insights = FinancialAnalysisService.analyzeExpenses(expenses);
    const recommendationsBlock = FinancialAnalysisService.formatRecommendationsForAI(insights);
    const rollingTrendSummary = ExpenseAnalysisService.formatRollingTrendForAI(
      ExpenseAnalysisService.getRollingTrend(expenses)
    );
    
    // Create a specialized prompt for comparison analysis
    const fullPrompt = `${this.SYSTEM_PROMPT}

${formattedData}

${rollingTrendSummary}

${recommendationsBlock}

User's Question: ${userMessage}

Please provide a detailed analysis and insights about the monthly comparison. Focus on:
1. **Comparison Insights**: Analyze the differences and what they mean
2. **Spending Trends**: Identify trends and patterns between the months
3. **Category Analysis**: Provide insights about category changes
4. **Financial Health**: Assess the financial implications of the changes
5. **Recommendations**: Give specific, actionable recommendations based on the comparison

Use the formatting instructions above to make your response well-organized with bold text, different bullet points, and clear structure.`;

    try {
      // Generate response using LLM with retry logic
      const result = await retryWithBackoff(async () => {
        return await model.generateContent(fullPrompt);
      });
      const response = await result.response;
      const text = response.text();

      // Clean up any markdown formatting that might still appear
      const cleanedText = this.cleanMarkdownFormatting(text || "I'm sorry, I couldn't generate a response. Please try again.");
      return cleanedText;
    } catch (error) {
      console.error('Error generating comparison analysis:', error);
      return `**${parseResult.message}**\n\n${formattedData}`;
    }
  }

  /**
   * Handle monthly expense queries specifically
   */
  private static handleMonthlyExpenseQuery(userMessage: string, expenses: Expense[]): string | null {
    const lowerMessage = userMessage.toLowerCase();
    
    // Check if this is a monthly expense query
    const monthlyKeywords = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december',
      'jan', 'feb', 'mar', 'apr', 'may', 'jun',
      'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
    ];
    
    const hasMonthKeyword = monthlyKeywords.some(keyword => lowerMessage.includes(keyword));
    const hasYearPattern = /\b(20\d{2})\b/.test(lowerMessage);
    
    if (hasMonthKeyword && hasYearPattern) {
      // Parse month and year from the message
      const parseResult = ExpenseAnalysisService.parseMonthYear(userMessage);
      
      if (parseResult.success) {
        const categoryMatch = this.detectCategoryFromMessage(userMessage, expenses);
        // Check if it's a simple calculation request or detailed analysis
        const isCalculationRequest = lowerMessage.includes('how much') || 
                                   lowerMessage.includes('total') || 
                                   lowerMessage.includes('spent') ||
                                   lowerMessage.includes('calculate');
        
        if (isCalculationRequest) {
          if (categoryMatch) {
            const categoryAnalysis = ExpenseAnalysisService.analyzeCategoryMonthlyExpenses(
              expenses,
              parseResult.month,
              parseResult.year,
              categoryMatch
            );

            if (categoryAnalysis.found && categoryAnalysis.data) {
              const data = categoryAnalysis.data;
              return `**${data.category} Spend – ${categoryAnalysis.requestedMonth} ${categoryAnalysis.requestedYear}**\n\n• Total: ₹${data.totalAmount.toLocaleString()}\n• Transactions: ${data.transactionCount}\n• Share of Month: ${data.percentageOfMonth.toFixed(1)}%\n• Average Transaction: ₹${data.averageTransaction.toFixed(2)}`;
            }

            return `**${categoryAnalysis.category} – ${categoryAnalysis.requestedMonth} ${categoryAnalysis.requestedYear}**\n\n${categoryAnalysis.message}`;
          }

          // Simple calculation response
          const calculation = ExpenseAnalysisService.calculateMonthlyTotal(
            expenses, 
            parseResult.month, 
            parseResult.year
          );
          
          if (calculation.found) {
            return `**${parseResult.message}**\n\n${calculation.message}`;
          }

          return `**${parseResult.message}**\n\n${calculation.message}`;
        } else {
          // For analysis requests, we'll let the LLM handle it with the monthly data
          // Return a special marker that indicates this should be processed by LLM
          if (categoryMatch) {
            return `MONTHLY_CATEGORY_ANALYSIS_REQUEST:${parseResult.month}:${parseResult.year}:${encodeURIComponent(categoryMatch)}:${encodeURIComponent(userMessage)}`;
          }

          return `MONTHLY_ANALYSIS_REQUEST:${parseResult.month}:${parseResult.year}:${encodeURIComponent(userMessage)}`;
        }
      } else {
        return `**Unable to parse your request**\n\n${parseResult.message}`;
      }
    }
    
    return null; // Not a monthly expense query
  }

  private static async handleAllMonthsCategoryQuery(
    userMessage: string,
    expenses: Expense[],
    userName?: string
  ): Promise<string | null> {
    const normalizedMessage = userMessage.toLowerCase();
    const keywords = ['overall', 'all months', 'across all months', 'entire period', 'all-time', 'lifetime'];
    const hasAllMonthsKeyword = keywords.some(keyword => normalizedMessage.includes(keyword));

    if (!hasAllMonthsKeyword) {
      return null;
    }

    const category = this.detectCategoryFromMessage(userMessage, expenses);
    if (!category) {
      return null;
    }

    const analysis = ExpenseAnalysisService.analyzeCategoryAcrossAllMonths(expenses, category);
    if (!analysis.found || !analysis.data) {
      return `**${analysis.category} – All Months Overview**\n\n${analysis.message}`;
    }

    const categoryData = ExpenseAnalysisService.formatCategoryAllMonthsForAI(analysis);
    const rollingTrendSummary = ExpenseAnalysisService.formatRollingTrendForAI(
      ExpenseAnalysisService.getRollingTrend(expenses)
    );
    const insights = FinancialAnalysisService.analyzeExpenses(expenses);
    const recommendationsBlock = FinancialAnalysisService.formatRecommendationsForAI(insights);
    const userGreeting = userName ? `\n\nUser's Name: ${userName}` : '';

    const fullPrompt = `${this.SYSTEM_PROMPT}

${categoryData}

${rollingTrendSummary}

${recommendationsBlock}${userGreeting}

User's Question: ${userMessage}

Please analyze the ${analysis.category} spending across the entire dataset. Focus on:
1. **Long-Term Trends**: Highlight how this category evolved over the months.
2. **Seasonality**: Mention any months where spending consistently spikes or drops.
3. **Contribution**: Discuss how this category impacts overall spending.
4. **Actionable Guidance**: Provide recommendations using the supplied context.
5. **Forward Look**: Suggest what to monitor going forward.

Use the formatting instructions above to keep the response structured and encouraging.`;

    try {
      const result = await retryWithBackoff(async () => {
        return await model.generateContent(fullPrompt);
      });
      const response = await result.response;
      const text = response.text();
      return this.cleanMarkdownFormatting(text || "I'm sorry, I couldn't generate a response. Please try again.");
    } catch (error) {
      console.error('Error generating all-month category analysis:', error);
      return categoryData;
    }
  }

  // Helper function to clean and format markdown
  private static detectCategoryFromMessage(userMessage: string, expenses: Expense[]): string | null {
    if (!expenses || expenses.length === 0) {
      return null;
    }

    const normalizedMessage = userMessage.toLowerCase();
    const sanitizedMessage = normalizedMessage.replace(/[^a-z0-9\s]/g, ' ');
    const messageTokens = new Set(sanitizedMessage.split(/\s+/).filter(Boolean));

    const categories = Array.from(new Set(expenses.map(expense => expense.category))).filter(Boolean);

    for (const category of categories) {
      const normalizedCategory = category.toLowerCase();
      if (normalizedCategory && normalizedMessage.includes(normalizedCategory)) {
        return category;
      }

      const categoryTokens = normalizedCategory.split(/[^a-z0-9]+/).filter(token => token.length > 2);
      for (const token of categoryTokens) {
        if (messageTokens.has(token)) {
          return category;
        }
      }
    }

    return null;
  }

  private static cleanMarkdownFormatting(text: string): string {
    return text
      // Keep bold formatting but ensure it's properly formatted
      .replace(/\*\*(.*?)\*\*/g, '**$1**')
      // Remove italic formatting (we only want bold)
      .replace(/\*(.*?)\*/g, '$1')
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      // Remove inline code
      .replace(/`(.*?)`/g, '$1')
      // Convert headers to bold text
      .replace(/^#{1,6}\s+(.*)$/gm, '**$1**')
      // Standardize different bullet points
      .replace(/^[\s]*[-*+]\s+/gm, '• ')
      // Keep numbered lists but ensure proper formatting
      .replace(/^[\s]*(\d+)\.\s+/gm, '$1. ')
      // Clean up extra whitespace
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();
  }
}
