import { useState } from 'react';

interface ThemeConfig {
  theme: 'dark' | 'light';
  language: 'zh' | 'en';
}

export default function ThemeConfigTab() {
  const [config, setConfig] = useState<ThemeConfig>(() => {
    const saved = localStorage.getItem('themeConfig');
    return saved ? JSON.parse(saved) : {
      theme: 'dark',
      language: 'zh'
    };
  });

  const handleSave = () => {
    localStorage.setItem('themeConfig', JSON.stringify(config));
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-2">主题</h3>
        <div className="flex space-x-2">
          <button 
            className={`px-3 py-1 rounded text-sm ${config.theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-gray-700'}`}
            onClick={() => setConfig({...config, theme: 'dark'})}
          >
            深色
          </button>
          <button 
            className={`px-3 py-1 rounded text-sm ${config.theme === 'light' ? 'bg-blue-600 text-white' : 'bg-gray-700'}`}
            onClick={() => setConfig({...config, theme: 'light'})}
          >
            浅色
          </button>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-2">语言</h3>
        <select 
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
          value={config.language}
          onChange={(e) => setConfig({...config, language: e.target.value as 'zh' | 'en'})}
        >
          <option value="zh">简体中文</option>
          <option value="en">English</option>
        </select>
      </div>
      <button 
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm"
        onClick={handleSave}
      >
        保存配置
      </button>
    </div>
  );
}
