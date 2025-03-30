import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/atom-one-dark.css';
import { useRef, useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';

interface BubbleProps {
  content: string;
  isUser: boolean;
  isStreaming?: boolean;
}

const CopyButton = ({ el }: { el: React.RefObject<HTMLElement> }) => {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      setCopied(true);
      console.log(el.current) // Keep original console.log for now

      const text = el.current?.innerText
      if (text) {
        await navigator.clipboard.writeText(text);
        setTimeout(() => setCopied(false), 1000);
      }
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  return (
    <button
      onClick={onCopy}
      className=" p-1 rounded bg-gray-700/50 hover:bg-gray-700 transition-colors"
      title="复制代码"
    >
      {copied ? (
        <Check size={16} className="text-green-400" />
      ) : (
        <Copy size={16} className="text-gray-300" />
      )}
    </button>
  );
};

// New component to handle code blocks with copy button correctly
const CodeBlockWithCopy = ({ node, className, children, ...props }: any) => {
  const codeRef = useRef<HTMLElement>(null);
  const match = /language-(\w+)/.exec(className || "");

  return match?.length ? (
    <div className="not-prose rounded-md border border-gray-700 my-2">
        <div className="rea flex h-1 p-4 items-center justify-between bg-gray-900 px-4">
          <div className="flex items-center gap-2">
            <Terminal size={18} className="text-gray-400" />
            <p className="text-sm text-gray-400">
              {node?.data?.meta || match[1]}
            </p>
          </div>
          <CopyButton el={codeRef} />
        </div>
      <div className="overflow-x-auto bg-gray-900">
        <pre className="not-prose text-white px-1">
          <code ref={codeRef} className={className} {...props}>
            {children}
          </code>
        </pre>
      </div>
    </div>
  ) : (
    <span className='bg-gray-500 text-white px-0.5 m-1 rounded-box'>{children}</span>
  )
};


export default function Bubble({ content, isUser, isStreaming = false }: BubbleProps) {
  const bubbleClasses = isUser
    ? "bg-blue-500 text-white self-end"
    : "bg-gray-200 text-gray-800 self-start";

  // Removed the console.log added for debugging previously

  return (
    <div className={`p-3 rounded-lg max-w-xl mb-2 relative ${bubbleClasses}`}>
      {isStreaming && (
        <div className="absolute -bottom-1 left-0 w-full h-1 bg-gray-300 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 animate-pulse" style={{width: '50%'}}></div>
         </div>
       )}
       {/* Restore ReactMarkdown */}
       <ReactMarkdown
         remarkPlugins={[remarkGfm]}
         rehypePlugins={[rehypeHighlight]}
        components={{
          code({node, inline, className, children, ...props}: any) {
            return !inline ? (
              <CodeBlockWithCopy node={node} className={className} {...props}>
                {children}
              </CodeBlockWithCopy>
            ) : (
              <code className="not-prose rounded bg-gray-100 px-1 dark:bg-gray-800">
                {children}
              </code>
            );
          }
         }}
       >
         {content}
       </ReactMarkdown>
     </div>
   );
}
