import type { AIModel } from '@/types';

export interface ChatResponse {
  content: string;
  error?: string;
}

export interface TranslationResponse {
  translatedText: string;
  error?: string;
}

export interface StreamChunk {
  content: string;
  done: boolean;
}

type EventCallback = (...args: any[]) => void;

export class AIService {
  private eventListeners: Record<string, EventCallback[]> = {};

  // 事件监听器方法
  on(event: string, callback: EventCallback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  off(event: string, callback: EventCallback) {
    if (!this.eventListeners[event]) return;
    const index = this.eventListeners[event].indexOf(callback);
    if (index > -1) {
      this.eventListeners[event].splice(index, 1);
    }
  }

  private emit(event: string, ...args: any[]) {
    if (!this.eventListeners[event]) return;
    this.eventListeners[event].forEach(callback => callback(...args));
  }
  private async makeRequest(
    model: AIModel, 
    messages: Array<{ role: string; content: string }>,
    systemPrompt?: string
  ): Promise<string> {
    const requestMessages = systemPrompt 
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages;

    try {
      const response = await fetch(model.apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${model.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model.modelId,
          messages: requestMessages,
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('API key is invalid or expired');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later');
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      const data = await response.json();
      
      if (data?.choices?.[0]?.message?.content) {
        return data.choices[0].message.content;
      } else {
        throw new Error('Invalid response format from AI service');
      }
    } catch (error: any) {
      console.error('AI request error:', error);
      throw error;
    }
  }

  private async makeStreamRequest(
    model: AIModel, 
    messages: Array<{ role: string; content: string }>,
    systemPrompt?: string,
    onChunk?: (chunk: StreamChunk) => void
  ): Promise<string> {
    const requestMessages = systemPrompt 
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages;

    try {
      const response = await fetch(model.apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${model.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model.modelId,
          messages: requestMessages,
          temperature: 0.7,
          max_tokens: 2000,
          stream: true
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('API key is invalid or expired');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later');
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response stream reader');
      }

      const decoder = new TextDecoder();
      let fullContent = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonData = line.slice(6).trim();
              
              if (jsonData === '[DONE]') {
                onChunk?.({ content: '', done: true });
                return fullContent;
              }
              
              try {
                const parsed = JSON.parse(jsonData);
                const content = parsed.choices?.[0]?.delta?.content || '';
                
                if (content) {
                  fullContent += content;
                  onChunk?.({ content, done: false });
                }
              } catch (e) {
                // 忽略解析错误的数据块
                console.warn('Failed to parse chunk:', jsonData);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      return fullContent;
    } catch (error: any) {
      console.error('AI stream request error:', error);
      throw error;
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

  async sendChatMessageStream(
    model: AIModel, 
    message: string, 
    chatHistory: Array<{ role: string; content: string }> = [],
    systemPrompt?: string
  ): Promise<void> {
    try {
      const messages = [
        ...chatHistory,
        { role: 'user', content: message }
      ];

      const messageId = `ai_${Date.now()}`;
      let fullContent = '';

      await this.makeStreamRequest(model, messages, systemPrompt, (chunk: StreamChunk) => {
        fullContent += chunk.content;
        // 发出流式消息事件
        this.emit('streamMessage', { id: messageId, content: fullContent });
        
        if (chunk.done) {
          // 流式输出完成
          this.emit('streamComplete', { id: messageId, content: fullContent });
        }
      });
    } catch (error: any) {
      // 发出错误事件
      this.emit('streamError', error.message);
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

  async translateTextStream(
    model: AIModel, 
    text: string, 
    targetLang: string = 'zh',
    customPrompt?: string
  ): Promise<void> {
    try {
      const defaultPrompt = `You are a professional translator. Translate the following text to ${targetLang === 'zh' ? 'Chinese' : targetLang}. Only return the translation, no explanations.`;
      const systemPrompt = customPrompt || defaultPrompt;
      
      const messages = [
        { role: 'user', content: text }
      ];

      const translationId = `translation_${Date.now()}`;
      let fullTranslation = '';

      await this.makeStreamRequest(model, messages, systemPrompt, (chunk: StreamChunk) => {
        fullTranslation += chunk.content;
        // 发出流式翻译事件
        this.emit('streamTranslation', { id: translationId, content: fullTranslation });
        
        if (chunk.done) {
          // 流式翻译完成
          this.emit('translationComplete', { id: translationId, content: fullTranslation });
        }
      });
    } catch (error: any) {
      // 发出翻译错误事件
      this.emit('translationError', error.message);
    }
  }
}

export const aiService = new AIService();
