import axios from 'axios';
import type { AIModel } from '@/types';

export interface ChatResponse {
  content: string;
  error?: string;
}

export interface TranslationResponse {
  translatedText: string;
  error?: string;
}

export class AIService {
  private async makeRequest(
    model: AIModel, 
    messages: Array<{ role: string; content: string }>,
    systemPrompt?: string
  ): Promise<string> {
    const requestMessages = systemPrompt 
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages;

    try {
      const response = await axios.post(
        model.apiEndpoint,
        {
          model: model.modelId,
          messages: requestMessages,
          temperature: 0.7,
          max_tokens: 2000
        },
        {
          headers: {
            'Authorization': `Bearer ${model.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      if (response.data?.choices?.[0]?.message?.content) {
        return response.data.choices[0].message.content;
      } else {
        throw new Error('Invalid response format from AI service');
      }
    } catch (error: any) {
      console.error('AI request error:', error);
      
      if (error.response?.status === 401) {
        throw new Error('API key is invalid or expired');
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout. Please try again');
      } else {
        throw new Error(`AI service error: ${error.message || 'Unknown error'}`);
      }
    }
  }

  async sendChatMessage(
    model: AIModel, 
    message: string, 
    chatHistory: Array<{ role: string; content: string }> = [],
    systemPrompt?: string
  ): Promise<ChatResponse> {
    try {
      const messages = [
        ...chatHistory,
        { role: 'user', content: message }
      ];

      const content = await this.makeRequest(model, messages, systemPrompt);
      
      return { content };
    } catch (error: any) {
      return { content: '', error: error.message };
    }
  }

  async translateText(
    model: AIModel, 
    text: string, 
    targetLang: string = 'zh',
    customPrompt?: string
  ): Promise<TranslationResponse> {
    try {
      const defaultPrompt = `You are a professional translator. Translate the following text to ${targetLang === 'zh' ? 'Chinese' : targetLang}. Only return the translation, no explanations.`;
      const systemPrompt = customPrompt || defaultPrompt;
      
      const messages = [
        { role: 'user', content: text }
      ];

      const translatedText = await this.makeRequest(model, messages, systemPrompt);
      
      return { translatedText };
    } catch (error: any) {
      return { translatedText: '', error: error.message };
    }
  }
}

export const aiService = new AIService();
