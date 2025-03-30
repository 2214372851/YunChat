import { useState } from 'react';

interface Provider {
  id: string;
  name: string;
}

interface ProviderConfig {
  apiKey: string;
  baseUrl: string;
  modelName: string;
  availableModels: string[];
}

interface ModelConfigTabProps {
  providers: Provider[];
  activeProvider: string;
  onProviderChange: (provider: string) => void;
  config: ProviderConfig;
  onConfigChange: (newConfig: ProviderConfig) => void;
}

export default function ModelConfigTab({
  providers,
  activeProvider,
  onProviderChange,
  config,
  onConfigChange
}: ModelConfigTabProps) {
  const [customModelName, setCustomModelName] = useState('');
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Removed useEffect for loading config based on activeProvider, as it's now handled in App.tsx

  const handleFetchModels = async () => {
    if (!config.apiKey) return;
    
    setIsLoadingModels(true);
    try {
      // 模拟API调用获取模型列表
      const mockModels = {
        openai: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'],
        anthropic: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
        google: ['gemini-pro', 'gemini-ultra']
      };
      
      onConfigChange({
        ...config,
        availableModels: mockModels[activeProvider as keyof typeof mockModels] || [],
      });
    } catch (error) {
      console.error('获取模型列表失败:', error);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleAddModel = () => {
    if (customModelName.trim()) {
      onConfigChange({
        ...config,
        availableModels: [...config.availableModels, customModelName.trim()],
        modelName: customModelName.trim()
      });
      setCustomModelName('');
    }
  };

  const handleRemoveModel = () => {
    if (config.modelName && config.availableModels.length > 1) {
      const newModels = config.availableModels.filter(m => m !== config.modelName);
      onConfigChange({
        ...config,
        availableModels: newModels,
        modelName: newModels[0]
      });
    }
  };

  return (
    <div className="flex h-[400px]">
      {/* 左侧服务商菜单 */}
      <div className="w-48 border-r border-gray-700 overflow-y-auto">
        <div className="p-2 space-y-1">
          {providers.map(provider => (
            <button
              key={provider.id}
              className={`text-white w-full text-left p-2 rounded text-sm ${
                activeProvider === provider.id ? 'bg-gray-700' : 'hover:bg-gray-700'
              }`}
              onClick={() => onProviderChange(provider.id)}
            >
              {provider.name}
            </button>
          ))}
        </div>
      </div>

      {/* 右侧配置面板 */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-300">API Key</label>
                    <button 
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      {showApiKey ? '隐藏' : '显示'}
                    </button>
                  </div>
                  <input
                    type={showApiKey ? "text" : "password"}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white"
                    value={config.apiKey}
                    onChange={(e) => onConfigChange({...config, apiKey: e.target.value})}
                  />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Base URL</label>
            <input
              type="text"
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white"
              value={config.baseUrl}
              onChange={(e) => onConfigChange({...config, baseUrl: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-1">模型名称</label>
                <select
                  value={config.modelName}
                  onChange={(e) => onConfigChange({...config, modelName: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white"
                >
                  {config.availableModels.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleFetchModels}
                disabled={!config.apiKey || isLoadingModels}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm disabled:opacity-50"
              >
                {isLoadingModels ? '获取中...' : '获取模型'}
              </button>
            </div>
            <div className="flex gap-2">
              <input
                value={customModelName}
                onChange={(e) => setCustomModelName(e.target.value)}
                className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white"
                placeholder="输入新模型名称"
              />
              <button
                onClick={handleAddModel}
                className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded text-sm"
              >
                添加
              </button>
              <button
                onClick={handleRemoveModel}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-sm"
                disabled={config.availableModels.length <= 1}
              >
                删除
              </button>
          </div>
          
          {/* 添加保存按钮 */}
          <div className="mt-6">
            <button 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm"
              onClick={() => {
                // 保存配置到本地存储，确保包含baseUrl
                localStorage.setItem(`aiConfig_${activeProvider}`, JSON.stringify({
                  ...config,
                  baseUrl: config.baseUrl
                }));
                // 通知父组件配置已保存
                alert('配置已保存');
              }}
            >
              保存配置
            </button>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
