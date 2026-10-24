import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User as UserIcon, Sparkles, Wrench, X } from 'lucide-react';
import { aiApi } from '../../api/ai.api';
import { useAuth } from '../../hooks/useAuth';
import AiBadge from './AiBadge';
import Button from '../ui/Button';

export default function AiChatPanel({ isOpen, onClose }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: `Hello ${user?.email?.split('@')[0] || 'there'}! I am your HCM Lite AI Assistant. How can I help you today?`,
      toolCalls: []
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const isEmployee = user?.role === 'employee';

  const suggestions = isEmployee ? [
    "How many sick leaves do I have left this year?",
    "Need next Monday and Tuesday off for a wedding",
    "What are the official office hours and grace time?",
    "What is my colleague's salary?"
  ] : [
    "Who is on leave today?",
    "How many active employees are registered?",
    "Who came late most often this month?",
    "What is the company leave quota policy?"
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function handleSend(textToSend) {
    const prompt = textToSend || input;
    if (!prompt.trim() || loading) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: prompt
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await aiApi.chat(prompt);
      const botMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: res.data.response,
        toolCalls: res.data.tool_calls || []
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      const botMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: err.response?.data?.error || 'Sorry, I encountered an issue fetching that information. Please try again.',
        toolCalls: []
      };
      setMessages(prev => [...prev, botMsg]);
    } finally {
      setLoading(false);
    }
  }

  if (isOpen === false) return null;

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200/80 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">HCM Lite AI Assistant</h3>
            <p className="text-[11px] text-slate-400">Database connected &bull; RBAC verified</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AiBadge />
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'bot' && (
              <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
            )}
            <div className={`max-w-[85%] space-y-1.5`}>
              <div
                className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-teal-600 text-white rounded-tr-sm'
                    : 'bg-slate-100 text-slate-800 rounded-tl-sm'
                }`}
              >
                <div
                  className="whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: msg.text
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\n/g, '<br/>')
                  }}
                />
              </div>

              {/* Tool Execution Tags */}
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {msg.toolCalls.map((tc, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-md"
                    >
                      <Wrench className="w-3 h-3 text-slate-400" />
                      Executed: <code>{tc.tool}</code>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {msg.sender === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-slate-800 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                <UserIcon className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3 bg-slate-100 rounded-2xl rounded-tl-sm text-xs text-slate-500 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 animate-spin text-teal-600" />
              <span>Thinking & checking real data...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/40">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
          Suggested Questions:
        </p>
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((sug, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(sug)}
              className="text-[11px] text-slate-600 bg-white border border-slate-200 hover:border-teal-500 hover:text-teal-700 px-2.5 py-1 rounded-full transition-colors text-left"
            >
              {sug}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 border-t border-slate-100 bg-white flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask AI anything (or try Roman Urdu)..."
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
        />
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={!input.trim() || loading}
          icon={Send}
        >
          Send
        </Button>
      </form>
    </div>
  );
}
