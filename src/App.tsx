import { useState, useEffect } from 'react';
import { Store } from '@tauri-apps/plugin-store';
import { v4 as uuidv4 } from 'uuid';
import { Routes, Route, Link, useNavigate } from 'react-router-dom'; // Removed BrowserRouter as Router
import MainArea from './components/MainArea';
import ModelConfigTab from './components/ModelConfigTab';
import ThemeConfigTab from './components/ThemeConfigTab';

// Store 会在 JavaScript 绑定时自动加载.
const store = await Store.load('history.bin');

function App() {
  const [historyItems, setHistoryItems] = useState<Array<{
    id: string;
    icon: string;
    text: string;
  }>>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const loadHistoryItems = async () => {
      try {
        const savedHistoryItems = await store.get('historyItems');
        if (savedHistoryItems) {
          setHistoryItems(JSON.parse(savedHistoryItems as string));
        }
      } catch (error) {
        console.error("Failed to load history items from store", error);
      }
    };

    loadHistoryItems();
  }, []);

  useEffect(() => {
    const saveHistoryItems = async () => {
      try {
        await store.set('historyItems', JSON.stringify(historyItems));
      } catch (error) {
        console.error("Failed to save history items to store", error);
      }
    };

    saveHistoryItems();
  }, [historyItems]);


  // Update function signature to return Promise<string>
  const handleFirstMessage = async (firstMessage: string): Promise<string> => { 
    const newId = uuidv4();
    const newItem = {
      id: newId,
      icon: "💬", 
      text: firstMessage
    };
    setHistoryItems(prev => [newItem, ...prev]);
    navigate(`/item/${newId}`);
    // Return the new ID
    return newId; 
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Start expanded
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('model');
  const [providers, _] = useState([
    { id: 'openai', name: 'OpenAI' },
    { id: 'anthropic', name: 'Anthropic' },
    { id: 'google', name: 'Google' }
  ]);
  interface ProviderConfig {
    apiKey: string;
    baseUrl: string;
    modelName: string;
    availableModels: string[];
  }

  const [activeProvider, setActiveProvider] = useState<'openai' | 'anthropic' | 'google'>('openai');
  const [providerConfigs, setProviderConfigs] = useState<{
    openai: ProviderConfig;
    anthropic: ProviderConfig;
    google: ProviderConfig;
  }>({
    openai: {
      apiKey: '',
      baseUrl: 'https://api.openai.com/v1',
      modelName: 'gpt-3.5-turbo',
      availableModels: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo']
    },
    anthropic: {
      apiKey: '',
      baseUrl: 'https://api.anthropic.com/v1',
      modelName: 'claude-3-opus',
      availableModels: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku']
    },
    google: {
      apiKey: '',
      baseUrl: 'https://generativelanguage.googleapis.com/v1',
      modelName: 'gemini-pro',
      availableModels: ['gemini-pro', 'gemini-ultra']
    }
  });

  useEffect(() => {
    // 自动展开侧边栏当窗口宽度大于1024px
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsSidebarOpen(e.matches);
    };

    // 初始检查
    setIsSidebarOpen(mediaQuery.matches);
    
    // 添加监听器
    mediaQuery.addEventListener('change', handleMediaChange);
    
    // 清理函数
    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  }, []);

  // Load all provider configs from localStorage on initial mount
  useEffect(() => {
    const loadedConfigs = { ...providerConfigs }; // Start with defaults

    const loadConfigs = async () => {
      let loadedConfigsMutable = { ...loadedConfigs };
      let needsUpdateMutable = false;
      for (const provider of providers) {
        const savedConfigStr = await store.get(`aiConfig_${provider.id}`);
        if (savedConfigStr) {
          try {
            const savedConfig = JSON.parse(savedConfigStr as string) as Partial<ProviderConfig>;
            // Merge saved config into the default config for this provider
            loadedConfigsMutable[provider.id as keyof typeof loadedConfigs] = {
              ...loadedConfigsMutable[provider.id as keyof typeof loadedConfigs], // Keep defaults
              ...savedConfig // Overwrite with saved values
            };
            needsUpdateMutable = true;
          } catch (error) {
            console.error(`解析 ${provider.name} 的保存配置失败:`, error);
          }
        }
      }
      if (needsUpdateMutable) {
        setProviderConfigs(loadedConfigsMutable);
      }
    };

    loadConfigs();
  }, [providers]);


  const toggleSidebar = () => {
    console.log('当前状态:', isSidebarOpen);
    setIsSidebarOpen(prev => {
      const newState = !prev;
      console.log('新状态:', newState);
      return newState;
    });
  };

  return (
    <div className="flex h-screen bg-white text-gray-800 overflow-hidden">
      {/* Sidebar - Conditionally hidden */}
      <div className={`bg-gray-900 text-gray-300 flex flex-col transition-all duration-300 ease-in-out fixed relative z-10 h-full ${isSidebarOpen ? 'w-64' : 'w-0'} overflow-hidden`}>
        {/* Top Control Bar */}
        <div className="flex items-center p-3 h-14 border-b border-gray-700 flex-shrink-0">
           {/* Left Toggle Button (to close) */}
           <button onClick={toggleSidebar} className="p-1 rounded hover:bg-gray-700 text-gray-400" title="关闭侧边栏">
             ← {/* Icon for closing */}
           </button>
           {/* Right Buttons */}
           <div className="flex space-x-1 ml-auto">
             <button className="p-1 rounded hover:bg-gray-700 text-gray-400" title="搜索">
               🔍
             </button>
             <Link to="/" onClick={() => navigate('/')} className="p-1 rounded hover:bg-gray-700 text-gray-400" title="新建聊天">
               ➕
             </Link>
             <button 
               className="p-1 rounded hover:bg-gray-700 text-gray-400" 
               title="设置"
               onClick={() => setIsSettingsModalOpen(true)}
             >
               ⚙️
             </button>
           </div>
        </div>

        {/* Main Sidebar Content */}
        <div className="flex flex-col h-full">
          {/* Fixed Top Options */}
          <div className="flex-shrink-0 p-3">
            <div className="space-y-1">
              <button className="flex items-center w-full p-2 rounded hover:bg-gray-700 text-sm">
                <span className="mr-2">💬</span> ChatGPT
              </button>
              <button className="flex items-center w-full p-2 rounded hover:bg-gray-700 text-sm">
                <span className="mr-2">✍️</span> Write For Me
              </button>
              <button className="flex items-center w-full p-2 rounded hover:bg-gray-700 text-sm">
                <span className="mr-2">🧩</span> 探索 GPT
              </button>
            </div>
          </div>

          {/* Scrollable History Items */}
          <div className="overflow-y-auto p-3 pt-0" style={{ 
            maxHeight: 'calc(100vh - 200px)',
            minHeight: '200px'
          }}>
            <div className="space-y-1">
              {historyItems.map((item) => (
                <div key={item.id} className="group relative">
                  <button 
                    onClick={() => navigate(`/item/${item.id}`)}
                    className="flex items-center w-full p-2 rounded hover:bg-gray-700 text-sm text-gray-300 text-left"
                  >
                    <span className="mr-2">{item.icon}</span>
                    <span className="truncate">{item.text}</span> 
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setHistoryItems(prev => prev.filter(i => i.id !== item.id));
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="删除"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      <Routes>
        <Route 
          path="/item/:itemId" 
          element={
            <MainArea 
              isSidebarOpen={isSidebarOpen} 
              toggleSidebar={toggleSidebar}
              providers={providers.map(p => ({
                name: p.name,
                models: providerConfigs[p.id as 'openai'|'anthropic'|'google'].availableModels
              }))}
              providerConfigs={providerConfigs}
              onFirstMessage={handleFirstMessage}
            />}
        />
        <Route 
          path="/" 
          element={
            <MainArea 
              isSidebarOpen={isSidebarOpen} 
              toggleSidebar={toggleSidebar}
              providers={providers.map(p => ({
                name: p.name,
                models: providerConfigs[p.id as 'openai'|'anthropic'|'google'].availableModels
              }))}
              providerConfigs={providerConfigs}
              onFirstMessage={handleFirstMessage}
            />}
        />
      </Routes>

      {/* Settings Modal */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 bg-gray-900/80 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-1/2">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">设置</h2>
              <button 
                onClick={() => setIsSettingsModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            {/* Tab Navigation */}
            <div className="flex border-b border-gray-700">
              <button 
                className={`px-4 py-2 text-sm font-medium ${activeTab === 'model' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}
                onClick={() => setActiveTab('model')}
              >
                模型配置
              </button>
              <button 
                className={`px-4 py-2 text-sm font-medium ${activeTab === 'theme' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}
                onClick={() => setActiveTab('theme')}
              >
                主题
              </button>
            </div>

            {/* Tab Content */}
            <div className="py-4">
              {activeTab === 'model' && (
                <ModelConfigTab 
                  providers={providers}
                  activeProvider={activeProvider}
                  onProviderChange={(provider) => setActiveProvider(provider as 'openai' | 'anthropic' | 'google')}
                  config={providerConfigs[activeProvider]}
                  onConfigChange={async (newConfig: ProviderConfig) => {
                    const newProviderConfigs = {
                      ...providerConfigs,
                      [activeProvider]: newConfig
                    };
                    setProviderConfigs(newProviderConfigs);
                    await store.set(`aiConfig_${activeProvider}`, JSON.stringify(newConfig));
                    await store.save();
                  }}
                />
              )}
              {activeTab === 'theme' && <ThemeConfigTab />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
