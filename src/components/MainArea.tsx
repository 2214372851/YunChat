import { useParams } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { Store } from '@tauri-apps/plugin-store';
import Bubble from './Bubble';
import { AIServiceFactory } from '../services/AIService';

// Store 会在 JavaScript 绑定时自动加载。
const store = await Store.load('store.bin');

interface Provider {
  name: string;
  models: string[];
}

interface ProviderConfig {
  apiKey: string;
  baseUrl: string;
  modelName: string;
  availableModels: string[];
}

interface MainAreaProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  providers: Provider[];
  providerConfigs: {
    openai: ProviderConfig;
    anthropic: ProviderConfig;
    google: ProviderConfig;
  };
  // Update the return type to Promise<string> to match App.tsx
  onFirstMessage: (title: string) => Promise<string>; 
}

export default function MainArea({ isSidebarOpen, toggleSidebar, providers, providerConfigs, onFirstMessage }: MainAreaProps) {
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { itemId } = useParams<{ itemId: string }>();

  const [messages, setMessages] = useState<
    Array<{
      id: string; // Add id property
      role: "user" | "assistant";
      content: string;
    }>
  >([]);
  const [isConfigSidebarOpen, setIsConfigSidebarOpen] = useState(false);
  const [aiConfig, setAiConfig] = useState({
    temperature: 0.7,
    max_tokens: 1000,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  });
  const [selectedProvider, setSelectedProvider] = useState(providers[0].name);
  const [selectedModel, setSelectedModel] = useState(providers[0].models[0]);

  // Load chat data from store
  useEffect(() => {
    const loadChatData = async () => {
      try {
        // Clear messages when itemId changes to avoid showing old chat
        setMessages([]);
        const savedChatData = await store.get(itemId || "default"); // Use "default" or a specific key if itemId is undefined
        if (savedChatData && itemId) { // Only load if itemId exists and data was found
          const {
            messages: savedMessages,
            aiConfig: savedAiConfig,
            selectedProvider: savedSelectedProvider,
            selectedModel: savedSelectedModel,
          } = JSON.parse(savedChatData as string);

          setMessages(savedMessages || []); // Ensure messages is an array
          setAiConfig(savedAiConfig || { temperature: 0.7, max_tokens: 1000, top_p: 1, frequency_penalty: 0, presence_penalty: 0 });
          setSelectedProvider(savedSelectedProvider || providers[0].name);
          setSelectedModel(savedSelectedModel || providers[0].models[0]);
        } else {
          // Reset to defaults if no saved data for this itemId or if itemId is undefined (new chat)
          setMessages([]);
          setAiConfig({ temperature: 0.7, max_tokens: 1000, top_p: 1, frequency_penalty: 0, presence_penalty: 0 });
          setSelectedProvider(providers[0].name);
          setSelectedModel(providers[0].models[0]);
        }
      } catch (error) {
        console.error("Failed to load chat data from store for itemId:", itemId, error);
         // Reset to defaults on error
         setMessages([]);
         setAiConfig({ temperature: 0.7, max_tokens: 1000, top_p: 1, frequency_penalty: 0, presence_penalty: 0 });
         setSelectedProvider(providers[0].name);
         setSelectedModel(providers[0].models[0]);
      }
    };

    loadChatData();
  }, [itemId, providers]); // Rerun when itemId changes

  // Save chat data to store when data changes
  useEffect(() => {
    const saveChatData = async () => {
      // Only save if there's an itemId and messages exist
      if (itemId && messages.length > 0) {
        try {
          const chatData = {
            messages,
            aiConfig,
            selectedProvider,
            selectedModel,
          };
          await store.set(itemId, JSON.stringify(chatData));
          await store.save();
        } catch (error) {
          console.error("Failed to save chat data to store for itemId:", itemId, error);
        }
      }
    };
    // Debounce or throttle might be better, but save on change for now.
    saveChatData();

  }, [itemId, messages, aiConfig, selectedProvider, selectedModel]); // Save when these change

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messageIdCounter = useRef(0); // Simple counter for unique IDs

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    // If it's the first message and there's no itemId (meaning it's a new chat started from '/')
    if (messages.length === 0 && !itemId) {
      setIsLoading(true);
      try {
        // First create the history item and wait for it to complete
        await onFirstMessage(inputMessage);
        // Clear the input after successfully initiating the new chat
        setInputMessage('');
        setIsLoading(false)
        // Now proceed with sending the message with the new itemId
        return; // Recursively call with the new itemId context
      } catch (error) {
        console.error("Error handling first message:", error);
        setIsLoading(false);
        return; // Stop execution if creating history item failed
      }
    }

    // Proceed with sending message for existing chats OR for the first message of a new chat

    // Generate unique IDs for the new messages
    const userId = `user-${messageIdCounter.current++}`;
    const assistantId = `assistant-${messageIdCounter.current++}`;

    const currentUserMessage = {
      id: userId, // Add id
      role: 'user' as const,
      content: inputMessage
    };
    const assistantMessagePlaceholder = {
      id: assistantId, // Add id
      role: 'assistant' as const,
      content: ''
    };

    // Prepare messages to send to AI. 
    // If it was the first message of a new chat, 'messages' state was empty, 
    // so messagesToSendToAI will correctly contain only the currentUserMessage.
    const messagesToSendToAI = [...messages, currentUserMessage]; 

    // Update UI state: add user message and placeholder
    setMessages(prev => [...prev, currentUserMessage, assistantMessagePlaceholder]);

    // Clear input and set loading state immediately *after* scheduling state update
    setInputMessage('');
    setIsLoading(true);


    // --- Call AI service *after* scheduling the state update ---
    (async () => {
      try {
        const currentProvider = providers.find(p => p.name === selectedProvider);
        if (!currentProvider) {
           console.error("Selected provider not found!");
           setMessages(latestMessages => latestMessages.map(msg =>
             msg.id === assistantId ? { ...msg, content: '错误：未找到提供者配置。' } : msg
           ));
           setIsLoading(false);
           return;
        }

        const providerName = currentProvider.name.toLowerCase() as 'openai'|'anthropic'|'google';
        const config = providerConfigs[providerName];

        // Ensure API key exists
        if (!config.apiKey || config.apiKey.trim() === '') {
          console.error(`API key for ${providerName} is missing!`);
          setMessages(latestMessages => latestMessages.map(msg =>
            msg.id === assistantId ? { ...msg, content: `错误：${providerName} 的 API Key 未配置。请在设置中添加。` } : msg
          ));
          setIsLoading(false);
          return;
        }

        const aiService = AIServiceFactory.createService(
          providerName, config.apiKey, selectedModel, config.baseUrl
        );

        // Filter options based on the provider
        let apiOptions: any = {};
        if (providerName === 'openai') {
          apiOptions = {
            temperature: aiConfig.temperature,
            max_tokens: aiConfig.max_tokens,
            top_p: aiConfig.top_p,
            frequency_penalty: aiConfig.frequency_penalty,
            presence_penalty: aiConfig.presence_penalty,
          };
        } else if (providerName === 'anthropic') {
           apiOptions = {
            temperature: aiConfig.temperature,
            max_tokens: aiConfig.max_tokens, // Anthropic uses max_tokens
            top_p: aiConfig.top_p,
            // top_k: aiConfig.top_k // Assuming top_k might be in aiConfig later
          };
        } else if (providerName === 'google') {
           apiOptions = {
            temperature: aiConfig.temperature,
            topP: aiConfig.top_p, // Google uses topP
            maxOutputTokens: aiConfig.max_tokens, // Google uses maxOutputTokens
            // topK: aiConfig.top_k // Google uses topK
          };
           // Remove undefined values for Google as its API might be stricter
           Object.keys(apiOptions).forEach(key => apiOptions[key] === undefined && delete apiOptions[key]);
        }


        // Use the messages prepared *before* the UI update
        await aiService.chat(
          messagesToSendToAI.map(m => ({ role: m.role, content: m.content })), // Use the captured state
          apiOptions, // Pass filtered options
          (chunk) => {
            if (chunk && chunk.trim() !== '') {
              setMessages(latestMessages =>
                latestMessages.map(msg =>
                  msg.id === assistantId ? { ...msg, content: msg.content + chunk } : msg
                )
              );
            }
          }
        );
      } catch (error) {
        console.error('AI聊天错误:', error);
        setMessages(latestMessages => latestMessages.map(msg =>
          msg.id === assistantId ? { ...msg, content: '抱歉，发生错误: ' + (error instanceof Error ? error.message : String(error)) } : msg
        ));
      } finally {
        setIsLoading(false);
      }
    })(); // Immediately invoke the async function
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Top Bar */}
      <div className="h-14 border-b border-gray-200 flex items-center px-4 flex-shrink-0">
        {/* Left side: Buttons shown when sidebar is closed */}
        {!isSidebarOpen && (
          <div className="flex items-center space-x-2">
            <button
              className="p-1 rounded hover:bg-gray-100 text-gray-500"
              title="打开侧边栏"
              onClick={toggleSidebar}
            >
              → {/* Icon for opening */}
            </button>
            <button className="p-1 rounded hover:bg-gray-100 text-gray-500" title="新建聊天">
              ➕
            </button>
          </div>
        )}

        {/* ChatGPT Dropdown - Always left-aligned */}
        <div className="flex items-center ml-2 relative">
          <button
            className="text-lg font-semibold hover:bg-gray-100 p-1 rounded flex items-center"
            onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
          >
            {selectedModel} <span className="text-gray-500 ml-1">▼</span>
          </button>
          {isModelDropdownOpen && (
            <div
              className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg py-1 z-20"
              ref={dropdownRef}
            >
            <div className="px-4 py-2 text-sm font-medium text-gray-700 border-b border-gray-200">
              选择模型
            </div>
            {/* Filter providers to only show those with an API key configured */}
            {providers
              .filter(provider => {
                const providerId = provider.name.toLowerCase() as keyof typeof providerConfigs;
                return providerConfigs[providerId]?.apiKey?.trim() !== '';
              })
              .map((provider) => (
              <div key={provider.name}>
                <div className="px-4 py-2 text-sm font-medium text-gray-500">
                  {provider.name}
                </div>
                {provider.models.map((model) => (
                  <button
                    key={model}
                    className={`block w-full text-left px-6 py-2 text-sm ${model === selectedModel ? 'bg-gray-100 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                    onClick={() => {
                      setSelectedProvider(provider.name);
                      setSelectedModel(model);
                      setIsModelDropdownOpen(false); // Close dropdown on selection
                    }}
                  >
                    {model}
                    {model === selectedModel && <span className="float-right">✓</span>}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
        </div>

        {/* Right side: Share and Avatar */}
        <div className="flex items-center space-x-3 ml-auto">
          <button
            className="flex items-center text-sm border border-gray-300 rounded px-3 py-1 hover:bg-gray-50 ml-2"
            onClick={() => setIsConfigSidebarOpen(!isConfigSidebarOpen)}
          >
            <span className="mr-1">⚙️</span> 配置
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-6 overflow-y-auto bg-white flex flex-col">
      <div className="flex flex-col space-y-4">
        {messages.map((message) => { // No need for index if using message.id as key
          const isLastAssistant = message.id === messages[messages.length - 1]?.id && message.role === 'assistant';
          return (
            <Bubble
              key={message.id} // Use stable message.id as key
              content={message.content}
              isUser={message.role === 'user'}
              isStreaming={isLastAssistant && isLoading || undefined} // Optional: for visual indicator
            />
          );
        })}
        {/* Removed the separate loading bubble logic */}
      </div>
    </div>

      {/* Config Sidebar */}
      {isConfigSidebarOpen && (
        <div className="fixed right-0 top-0 h-full w-64 bg-white border-l border-gray-200 shadow-lg z-10">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold">模型配置</h3>
            <button
              className="absolute top-2 right-2 p-1 rounded hover:bg-gray-100"
              onClick={() => setIsConfigSidebarOpen(false)}
            >
              ×
            </button>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">温度 (Temperature)</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={aiConfig.temperature}
                onChange={(e) => setAiConfig({...aiConfig, temperature: parseFloat(e.target.value)})}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>精确</span>
                <span>平衡</span>
                <span>创意</span>
              </div>
              <div className="text-xs text-gray-500 text-center mt-1">
                当前值: {aiConfig.temperature}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">最大长度 (Max Tokens)</label>
              <input
                type="number"
                min="1"
                max="4000" // Consider adjusting based on model limits
                value={aiConfig.max_tokens}
                onChange={(e) => setAiConfig({...aiConfig, max_tokens: parseInt(e.target.value)})}
                className="w-full border border-gray-300 rounded px-2 py-1"
              />
              <div className="text-xs text-gray-500 text-center mt-1">
                当前值: {aiConfig.max_tokens}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Top P</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={aiConfig.top_p}
                onChange={(e) => setAiConfig({...aiConfig, top_p: parseFloat(e.target.value)})}
                className="w-full"
              />
              <div className="text-xs text-gray-500 text-center mt-1">
                当前值: {aiConfig.top_p}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">频率惩罚 (Frequency Penalty)</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={aiConfig.frequency_penalty}
                onChange={(e) => setAiConfig({...aiConfig, frequency_penalty: parseFloat(e.target.value)})}
                className="w-full"
              />
              <div className="text-xs text-gray-500 text-center mt-1">
                当前值: {aiConfig.frequency_penalty}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">存在惩罚 (Presence Penalty)</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={aiConfig.presence_penalty}
                onChange={(e) => setAiConfig({...aiConfig, presence_penalty: parseFloat(e.target.value)})}
                className="w-full"
              />
              <div className="text-xs text-gray-500 text-center mt-1">
                当前值: {aiConfig.presence_penalty}
              </div>
            </div>
            {/* Removed the save button as config is saved on change via useEffect */}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 flex-shrink-0">
        <div className="relative">
          <textarea
            className="w-full border border-gray-300 rounded-lg p-3 pr-20 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            rows={1}
            placeholder="询问任何问题..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          ></textarea>
          <div className="absolute bottom-2 right-3 flex items-center space-x-2">
            <button className="p-1 rounded-full hover:bg-gray-100 text-gray-500">➕</button>
            <button className="p-1 rounded-full hover:bg-gray-100 text-gray-500">🔍</button>
            <button className="p-1 rounded-full hover:bg-gray-100 text-gray-500">💡</button>
            <button className="p-1 rounded-full hover:bg-gray-100 text-gray-500">...</button>
            <button
              className={`w-8 h-8 rounded-full flex items-center justify-center ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-black text-white hover:bg-gray-800'}`}
              onClick={handleSendMessage}
              disabled={isLoading}
            >
              {isLoading ? '...' : '▲'} {/* Send icon or loading indicator */}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
