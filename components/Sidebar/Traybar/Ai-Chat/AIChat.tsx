import React from 'react';
import Appbar from './Appbar';
import Footer from './Footer';
import Image from 'next/image';

function EmptyState() {
  return (
    <div className="flex flex-col h-screen bg-background">
      <Appbar />
      <div className="flex-1 flex flex-col items-center justify-center">
        <Image
          src="/Charco-Education.png" // Place your PNG in the public/ directory
          alt="No conversations"
          width={400}
          height={400}
          className="w-40 h-40 mb-4 opacity-80"
        />
        <div className="text-lg text-muted-foreground font-semibold">
          No conversations yet
        </div>
        <div className="text-sm text-muted-foreground mt-2">
          Start a new conversation to see messages here!
        </div>
      </div>
      <div className='mb-6 mx-3 shadow-md'>
        <Footer />
      </div>
    </div>
  );
}

export default EmptyState;


// import React, { useState, useEffect, useRef } from 'react'
// import Appbar from './Appbar'
// import Footer from './Footer'
// import ReactMarkdown from 'react-markdown'
// import {
//   Accordion,
//   AccordionContent,
//   AccordionItem,
//   AccordionTrigger,
// } from "@/components/ui/accordion"
// import { host, port } from '@/config/server'
// type Message = {
//   role: 'user' | 'assistant'
//   content: string
// }

// function AIChat() {
//   const [messages, setMessages] = useState<Message[]>([])
//   const [isConnected, setIsConnected] = useState(false)
//   const [isGenerating, setIsGenerating] = useState(false)
//   const wsRef = useRef<WebSocket | null>(null)
//   const messagesEndRef = useRef<HTMLDivElement>(null)
  
//   // Function to process message content for thinking tags
//   const processMessageContent = (content: string) => {
//     // Split content by <think> tags and process each part
//     const parts = content.split(/(<think>.*?<\/think>)/gs)
//     return parts.map((part, index) => {
//       if (part.match(/<think>.*?<\/think>/s)) {
//         const thinkingText = part.replace(/<\/?think>/g, '')
//         return (
//           <Accordion key={index} type="single"  className="w-full mb-1">
//             <AccordionItem value="thinking" className="border-0">
//               <AccordionTrigger className="text-xs py-0.5 px-2 text-muted-foreground hover:no-underline rounded-t-sm">
//                 Thinking
//               </AccordionTrigger>
//               <AccordionContent className="pt-0">
//                 <div className="p-2 text-sm text-foreground">
//                   {thinkingText}
//                 </div>
//               </AccordionContent>
//             </AccordionItem>
//           </Accordion>
//         )
//       }
//       return part
//     })
//   }

//   // Connect to WebSocket
//   useEffect(() => {
//     const connectWs = () => {
//       const ws = new WebSocket(`ws://${host}:${port}/api/v1/ai-agent/ws/chat`)
      
//       ws.onopen = () => {
//         console.log('WebSocket connected')
//         setIsConnected(true)
//       }
      
//       ws.onclose = () => {
//         console.log('WebSocket disconnected')
//         setIsConnected(false)
//         // Try to reconnect after 2 seconds
//         setTimeout(connectWs, 2000)
//       }
      
//       ws.onerror = (error) => {
//         console.error('WebSocket error:', error)
//       }
      
//       ws.onmessage = (event) => {
//         try {
//           const data = JSON.parse(event.data)
          
//           if (data.type === 'thinking') {
//             setIsGenerating(true)
//           } 
//           else if (data.type === 'stream') {
//             setMessages(prevMessages => {
//               const newMessages = [...prevMessages]
//               const lastMessage = newMessages[newMessages.length - 1]
              
//               if (lastMessage && lastMessage.role === 'assistant') {
//                 // Append to existing assistant message
//                 return newMessages.map((msg, index) => 
//                   index === newMessages.length - 1 
//                     ? { ...msg, content: msg.content + data.content }
//                     : msg
//                 )
//               } else {
//                 // Create new assistant message
//                 return [...prevMessages, { role: 'assistant', content: data.content }]
//               }
//             })
//           } 
//           else if (data.type === 'done') {
//             setIsGenerating(false)
//           }
//         } catch (error) {
//           console.error('Error parsing WebSocket message:', error)
//         }
//       }
      
//       wsRef.current = ws
//     }
    
//     connectWs()
    
//     return () => {
//       if (wsRef.current) {
//         wsRef.current.close()
//       }
//     }
//   }, [])
  
//   // Auto-scroll to bottom when messages change
//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
//   }, [messages])
  
//   const handleSendMessage = (message: string) => {
//     if (!isConnected || !wsRef.current || !message.trim()) return
    
//     // Add user message
//     setMessages(prev => [...prev, { role: 'user', content: message }])
    
//     // Send to WebSocket
//     try {
//       wsRef.current.send(JSON.stringify({
//         content: message,
//         model: 'deepseek-r1:1.5b'
//       }))
//     } catch (error) {
//       console.error('Error sending message:', error)
//     }
//   }
  
//   return (
//     <div className='h-[calc(100vh-56px)] flex flex-col mx-4'>
//       <Appbar />
      
//       {/* AI chat content */}
//       <div className="flex-1 overflow-auto py-4 px-2">
//         {messages.map((message, index) => (
//           <div 
//             key={index} 
//             className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}
//           >
//             <div 
//               className={`inline-block max-w-[100%] rounded-lg px-4 py-2 ${
//                 message.role === 'user' 
//                   ? 'bg-primary text-primary-foreground' 
//                   : 'bg-muted'
//               }`}
//             >
//               {message.role === 'user' ? (
//                 message.content
//               ) : (
//                 <div className="prose prose-sm  max-w-none">
//                   {processMessageContent(message.content).map((part, idx) => {
//                     if (typeof part === 'string') {
//                       return (
//                         <ReactMarkdown
//                           key={idx}
//                           components={{
//                             pre: ({ children, ...props }) => (
//                               <Accordion type="single" collapsible className="w-full mb-1">
//                                 <AccordionItem value="code" className="border-0">
//                                   <AccordionTrigger className="text-xs py-0.5 px-2 font-mono hover:no-underline rounded-t-sm ">
//                                     Code
//                                   </AccordionTrigger>
//                                   <AccordionContent className="pt-0">
//                                     <pre {...props} className="p-2 text-sm overflow-auto">
//                                       {children}
//                                     </pre>
//                                   </AccordionContent>
//                                 </AccordionItem>
//                               </Accordion>
//                             ),
//                             code: ({ className, children, ...props }) => (
//                               <code className={`${className || ''} px-1 py-0.5 text-xs rounded`} {...props}>
//                                 {children}
//                               </code>
//                             ),
//                             p: ({ children }) => (
//                               <p className="mb-2 last:mb-0">
//                                 {children}
//                               </p>
//                             ),
//                           }}
//                         >
//                           {part}
//                         </ReactMarkdown>
//                       );
//                     }
//                     return part; // This is already a React element
//                   })}
//                 </div>
//               )}
//             </div>
//           </div>
//         ))}
//         {isGenerating && (
//           <div className="text-left mb-4">
//             <div className="inline-block max-w-[100%] rounded-lg px-4 py-2">
//               <div className="h-2 w-12 flex items-center gap-1">
//                 <div className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
//                 <div className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
//                 <div className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
//               </div>
//             </div>
//           </div>
//         )}
//         <div ref={messagesEndRef} />
//       </div>
      
//       <Footer onSendMessage={handleSendMessage} />
//     </div>
//   )
// }

// export default AIChat
