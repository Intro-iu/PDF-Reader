import axios from 'axios'
import type { AIModel, ChatMessage } from '../types'

interface APIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface TranslateResult {
  translatedText: string
  error?: string
}

export class AIService {
  async sendChatMessage(
    model: AIModel, 
    message: string, 
    chatHistory: ChatMessage[], 
    chatPrompt?: string
  ): Promise<{ 
    message: string 
    error?: string 
  }> {
    try {
      // 构建消息数组，使用APIMessage格式
      const messages: APIMessage[] = []
      
      // 添加系统提示词（如果有且不为空）
      if (chatPrompt && chatPrompt.trim()) {
        messages.push({
          role: 'system',
          content: chatPrompt.trim()
        })
      }
      
      // 添加聊天历史，转换为API格式并过滤无效消息
      chatHistory.forEach(msg => {
        // 确保消息内容不为空
        if (msg.content && msg.content.trim()) {
          messages.push({
            role: msg.role as 'user' | 'assistant',
            content: msg.content.trim()
          })
        }
      })
      
      // 添加当前用户消息
      if (message && message.trim()) {
        messages.push({
          role: 'user',
          content: message.trim()
        })
      }

      const requestData = {
        model: model.modelId,
        messages: messages,
        max_tokens: 2000,
        temperature: 0.7
      }

      console.log('Sending chat request:', {
        endpoint: model.apiEndpoint,
        model: model.modelId,
        messagesCount: messages.length,
        messages: messages.map(m => ({ role: m.role, contentLength: m.content?.length || 0, contentPreview: m.content?.substring(0, 50) }))
      })

      // 验证所有消息都有有效内容
      const invalidMessages = messages.filter(m => !m.content || !m.content.trim())
      if (invalidMessages.length > 0) {
        console.error('Found invalid messages:', invalidMessages)
        return {
          message: '',
          error: '消息格式错误：包含空消息'
        }
      }

      const response = await axios.post(model.apiEndpoint, requestData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${model.apiKey}`
        },
        timeout: 60000
      })

      if (response.status === 200 && response.data.choices && response.data.choices.length > 0) {
        return {
          message: response.data.choices[0].message.content
        }
      } else {
        return {
          message: '',
          error: '响应格式不正确'
        }
      }
    } catch (error: any) {
      console.error('AI request error:', error)
      
      let errorMessage = 'AI请求失败: '
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMessage += '请求超时（60秒），请检查网络连接或API服务状态'
      } else if (error.response) {
        console.error('API response error:', error.response.data)
        if (error.response.status === 400) {
          errorMessage += `请求格式错误 (400): ${error.response.data?.error?.message || error.response.data?.message || '请检查API配置'}`
        } else if (error.response.status === 401) {
          errorMessage += 'API密钥无效'
        } else if (error.response.status === 429) {
          errorMessage += 'API调用次数超限'
        } else if (error.response.status >= 500) {
          errorMessage += 'API服务器错误'
        } else {
          errorMessage += `API错误 (${error.response.status})`
        }
      } else if (error.request) {
        errorMessage += '网络连接失败，请检查网络设置'
      } else {
        errorMessage += error.message || '未知错误'
      }

      return {
        message: '',
        error: errorMessage
      }
    }
  }

  async translateText(model: AIModel, text: string, targetLang: string = '中文', customPrompt?: string): Promise<TranslateResult> {
    try {
      // 处理自定义提示词中的占位符
      let prompt: string
      if (customPrompt) {
        prompt = customPrompt
          .replace(/\[SELECTED_TEXT\]/g, text)
          .replace(/\[TARGET_LANG\]/g, targetLang)
      } else {
        prompt = `请将以下文本翻译为${targetLang}，只返回翻译结果，不要添加任何解释或说明：\n\n${text}`
      }

      const requestData = {
        model: model.modelId,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      }

      const response = await axios.post(model.apiEndpoint, requestData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${model.apiKey}`
        },
        timeout: 60000
      })

      if (response.status === 200 && response.data.choices && response.data.choices.length > 0) {
        return {
          translatedText: response.data.choices[0].message.content.trim()
        }
      } else {
        return {
          translatedText: '',
          error: '翻译响应格式不正确'
        }
      }
    } catch (error: any) {
      console.error('Translation error:', error)
      
      let errorMessage = '翻译失败: '
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMessage += '请求超时（60秒），请检查网络连接或API服务状态'
      } else if (error.response) {
        if (error.response.status === 401) {
          errorMessage += 'API密钥无效'
        } else if (error.response.status === 429) {
          errorMessage += 'API调用次数超限'
        } else if (error.response.status >= 500) {
          errorMessage += 'API服务器错误'
        } else {
          errorMessage += `API错误 (${error.response.status})`
        }
      } else if (error.request) {
        errorMessage += '网络连接失败，请检查网络设置'
      } else {
        errorMessage += error.message || '未知错误'
      }

      return {
        translatedText: '',
        error: errorMessage
      }
    }
  }

  async translateTextStream(
    model: AIModel, 
    text: string, 
    targetLang: string = '中文', 
    customPrompt?: string,
    onChunk?: (chunk: string) => void
  ): Promise<TranslateResult> {
    try {
      // 处理自定义提示词中的占位符
      let prompt: string
      if (customPrompt) {
        prompt = customPrompt
          .replace(/\[SELECTED_TEXT\]/g, text)
          .replace(/\[TARGET_LANG\]/g, targetLang)
      } else {
        prompt = `请将以下文本翻译为${targetLang}，只返回翻译结果，不要添加任何解释或说明：\n\n${text}`
      }

      console.log('Translation stream prompt:', prompt)
      console.log('Target language:', targetLang)
      console.log('Selected text:', text)
      console.log('Custom prompt received:', customPrompt)

      const requestData = {
        model: model.modelId,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.3,
        stream: true
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
      }, 60000) // 60秒超时

      const response = await fetch(model.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${model.apiKey}`
        },
        body: JSON.stringify(requestData),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        let errorMessage = '翻译请求失败: '
        if (response.status === 401) {
          errorMessage += 'API密钥无效'
        } else if (response.status === 429) {
          errorMessage += 'API调用次数超限'
        } else if (response.status >= 500) {
          errorMessage += 'API服务器错误'
        } else {
          errorMessage += `API错误 (${response.status})`
        }
        
        return {
          translatedText: '',
          error: errorMessage
        }
      }

      const reader = response.body?.getReader()
      if (!reader) {
        return {
          translatedText: '',
          error: '无法读取响应流'
        }
      }

      const decoder = new TextDecoder()
      let translatedText = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim()
              if (data === '[DONE]') continue
              
              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices?.[0]?.delta?.content
                if (content) {
                  translatedText += content
                  onChunk?.(content)
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        }

        return {
          translatedText: translatedText.trim()
        }
      } finally {
        reader.releaseLock()
      }

    } catch (error: any) {
      console.error('Stream translation error:', error)
      
      let errorMessage = '翻译失败: '
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        errorMessage += '请求超时，请检查网络连接或API服务状态'
      } else if (error.message.includes('fetch')) {
        errorMessage += '网络连接失败，请检查网络设置'
      } else {
        errorMessage += error.message || '未知错误'
      }

      return {
        translatedText: '',
        error: errorMessage
      }
    }
  }
}

export const aiService = new AIService()
