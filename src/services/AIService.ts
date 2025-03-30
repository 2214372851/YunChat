/**
 * AI模型服务基类，提供统一的模型调用接口
 */
export abstract class AIService {
  protected modelName: string;
  protected apiKey: string;
  
  constructor(modelName: string, apiKey: string) {
    this.modelName = modelName;
    this.apiKey = apiKey;
  }

  /**
   * 发送消息到AI模型
   * @param messages 聊天消息历史
   * @param options 模型特定选项
   * @param onStream 流式消息回调函数
   * @returns Promise<string> AI回复内容(完整内容)
   */
  abstract chat(
    messages: Array<{role: string, content: string}>, 
    options?: any,
    onStream?: (chunk: string) => void
  ): Promise<string>;

  /**
   * 获取模型支持的参数
   */
  abstract getModelOptions(): any;

  /**
   * 验证API密钥
   */
  abstract validateKey(): Promise<boolean>;

  /**
   * 获取当前模型名称
   */
  getModelName(): string {
    return this.modelName;
  }
}

/**
 * OpenAI服务实现
 */
export class OpenAIService extends AIService {
  private baseUrl: string;

  constructor(apiKey: string, modelName: string = 'gpt-3.5-turbo', baseUrl?: string) {
    super(modelName, apiKey);
    this.baseUrl = baseUrl || 'https://api.openai.com/v1';
  }

    async chat(
    messages: Array<{role: string, content: string}>, 
    options?: any,
    onStream?: (chunk: string) => void
  ): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.modelName,
          messages,
          stream: onStream !== undefined,
          ...options
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error) {
          throw new Error(`OpenAI API错误: ${errorData.error.message || errorData.error.code}`);
        }
        throw new Error(`OpenAI API错误: ${response.statusText}`);
      }

      if (onStream) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            if (line.startsWith('data: ') && !line.includes('[DONE]')) {
              try {
                const data = JSON.parse(line.substring(6));
                const content = data.choices[0]?.delta?.content || '';
                fullResponse += content;
                onStream(content);
              } catch (e) {
                console.error('Error parsing SSE data:', e);
              }
            }
          }
        }
        return fullResponse;
      } else {
        const data = await response.json();
        return data.choices[0]?.message?.content || '';
      }
    } catch (error) {
      console.error('OpenAI API调用失败:', error);
      throw error;
    }
  }

  getModelOptions() {
    return {
      temperature: 0.7,
      max_tokens: 1000,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    };
  }

  async validateKey(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Anthropic服务实现
 */
export class AnthropicService extends AIService {
  private baseUrl: string = 'https://api.anthropic.com/v1';

  constructor(apiKey: string, modelName: string = 'claude-3-opus') {
    super(modelName, apiKey);
  }

  async chat(
    messages: Array<{role: string, content: string}>, 
    options?: any,
    onStream?: (chunk: string) => void
  ): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'messages-2023-12-15'
        },
        body: JSON.stringify({
          model: this.modelName,
          messages,
          max_tokens: options?.max_tokens || 1000,
          stream: onStream !== undefined,
          ...options
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Anthropic API错误: ${errorData.error?.message || response.statusText}`);
      }

      if (onStream) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            if (line.startsWith('data: ') && !line.includes('[DONE]')) {
              try {
                const data = JSON.parse(line.substring(6));
                const content = data.content?.[0]?.text || '';
                fullResponse += content;
                onStream(content);
              } catch (e) {
                console.error('Error parsing SSE data:', e);
              }
            }
          }
        }
        return fullResponse;
      } else {
        const data = await response.json();
        return data.content[0]?.text || '';
      }
    } catch (error) {
      console.error('Anthropic API调用失败:', error);
      throw error;
    }
  }

  getModelOptions() {
    return {
      temperature: 0.7,
      max_tokens: 1000,
      top_p: 1,
      top_k: 50
    };
  }

  async validateKey(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'x-api-key': this.apiKey
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Google服务实现
 */
export class GoogleService extends AIService {
  private baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(apiKey: string, modelName: string = 'gemini-pro') {
    super(modelName, apiKey);
  }

  async chat(
    messages: Array<{role: string, content: string}>, 
    options?: any,
    onStream?: (chunk: string) => void
  ): Promise<string> {
    try {
      const url = `${this.baseUrl}/models/${this.modelName}:streamGenerateContent?key=${this.apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: messages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{text: m.content}]
          })),
          generationConfig: {
            temperature: options?.temperature,
            topP: options?.top_p,
            maxOutputTokens: options?.max_tokens
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Google API错误: ${errorData.error?.message || response.statusText}`);
      }

      if (onStream) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        let buffer = ''; // Buffer to accumulate the entire response
        while (reader) {
          const { done, value } = await reader.read();
          if (done) break; // Exit loop when stream is finished

          // Append decoded chunk to the buffer
          buffer += decoder.decode(value, { stream: true });
        }

        // --- Processing happens *after* the entire stream is read ---
        
        // Clean the buffer: Google stream might start with '[' and end with ']' 
        // and have commas between objects, but JSON.parse needs a valid JSON array string.
        // A simple approach is to assume it's mostly correct JSON array content.
        // More robust parsing might be needed for edge cases.
        const jsonArrayString = buffer.trim(); 

        try {
          // Parse the entire buffer as a JSON array
          const responseArray = JSON.parse(jsonArrayString); 

          if (Array.isArray(responseArray)) {
            // Iterate through the array of response objects
            for (const data of responseArray) {
              // Extract content from each object
              if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
                const content = data.candidates[0].content.parts[0].text;
                fullResponse += content; // Accumulate full response
                onStream(content);     // Call onStream for each content part
              }
            }
          } else {
             console.error("Google Service: Parsed response is not an array", responseArray);
             throw new Error("Google API 返回了非预期的格式");
          }
        } catch (e) {
          console.error("Google Service: Failed to parse the accumulated stream buffer:", e, "Buffer:", jsonArrayString);
          throw new Error("解析 Google API 响应失败");
        }

        return fullResponse; // Return the accumulated full response
      } else {
        // Handle non-streaming case (if generateContent endpoint is used)
        // Note: Google's generateContent (non-streaming) returns a slightly different structure.
        // It returns a single JSON object, not an array like streamGenerateContent.
        const data = await response.json();
        // Adjust path for non-streaming response structure
        return data.candidates?.[0]?.content?.parts?.[0]?.text || ''; 
      }
    } catch (error) {
      console.error('Google API调用失败:', error);
      throw error;
    }
  }

  getModelOptions() {
    return {
      temperature: 0.7,
      max_tokens: 1000,
      top_p: 1,
      top_k: 40
    };
  }

  async validateKey(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models?key=${this.apiKey}`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * 服务工厂，用于创建不同类型的AI服务
 */
export class AIServiceFactory {
  static createService(type: 'openai' | 'anthropic' | 'google', apiKey: string, modelName?: string, baseUrl?: string): AIService {
    switch (type.toLowerCase()) {
      case 'openai':
        return new OpenAIService(apiKey, modelName, baseUrl);
      case 'anthropic':
        return new AnthropicService(apiKey, modelName);
      case 'google':
        return new GoogleService(apiKey, modelName);
      default:
        throw new Error(`Unsupported AI service type: ${type}`);
    }
  }
}
