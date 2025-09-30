import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Bot } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Message } from './chatStore'

interface AIMessageProps {
  message: Message
}

function AIMessage({ message }: AIMessageProps) {
  return (
    <div className="flex gap-3 p-4 group min-w-0 overflow-hidden">
      {/* Avatar */}
      <Avatar className="h-8 w-8 flex-shrink-0 mt-1">
        <AvatarFallback className="bg-blue-500 text-white">
          <Bot className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {/* Header with name, timestamp and model */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <Badge variant="secondary" className="text-xs px-2 py-0.5 font-medium">
            Genome Speed
          </Badge>
          {message.model && (
            <Badge variant="outline" className="text-xs px-1 py-0">
              {message.model}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            }) : ''}
          </span>
        </div>

        {/* Message content with markdown */}
        <div className="min-w-0 overflow-hidden">
          <div className="prose prose-xs dark:prose-invert max-w-none min-w-0">
            <ReactMarkdown
              components={{
                code({ node, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  const inline = !match;
                  
                  return !inline ? (
                    <SyntaxHighlighter
                      style={oneDark as any}
                      language={match[1]}
                      PreTag="div"
                      className="rounded-md !mt-2 !mb-2 overflow-x-auto"
                      customStyle={{
                        fontSize: '0.75rem',
                        lineHeight: '1.25',
                        maxWidth: '100%',
                        margin: 0
                      }}
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code 
                      className="bg-muted/70 px-1 py-0.5 rounded text-xs font-mono break-all" 
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                p: ({ children }) => (
                  <p className="mb-1.5 last:mb-0 leading-relaxed text-xs text-justify break-words hyphens-auto">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="mb-1.5 last:mb-0 ml-3 space-y-0.5 text-xs">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-1.5 last:mb-0 ml-3 space-y-0.5 text-xs">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="text-xs text-justify break-words hyphens-auto">
                    {children}
                  </li>
                ),
                h1: ({ children }) => (
                  <h1 className="text-sm font-semibold mb-1.5 mt-2 first:mt-0 break-words">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-xs font-semibold mb-1.5 mt-2 first:mt-0 break-words">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-xs font-semibold mb-1 mt-1.5 first:mt-0 break-words">
                    {children}
                  </h3>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-muted-foreground/30 pl-2 italic mb-1.5 text-xs text-justify break-words hyphens-auto">
                    {children}
                  </blockquote>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto">
                    <table className="text-xs border-collapse border border-muted min-w-full">
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="text-xs border border-muted px-2 py-1 bg-muted/50 text-left">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="text-xs border border-muted px-2 py-1 break-words">
                    {children}
                  </td>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AIMessage