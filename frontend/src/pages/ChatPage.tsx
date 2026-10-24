import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  BotMessageSquare,
  Sparkles,
  ShieldAlert,
  Clock,
  RotateCcw,
  FileCheck,
  AlertCircle
} from 'lucide-react';
import { Case, ChatMessage } from '../services/types';
import { api } from '../services/api';
import { Badge } from '../components/ui/Badge';

interface ChatPageProps {
  activeCase: Case | null;
}

export const ChatPage: React.FC<ChatPageProps> = ({ activeCase }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeCase) {
      loadHistory();
    }
  }, [activeCase?.id, conversationId]);

  const loadHistory = async () => {
    if (!activeCase) return;
    try {
      const history = await api.getChatHistory(activeCase.id, conversationId || undefined);
      setMessages(history);
      scrollToBottom();
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || !activeCase || sending) return;

    setInputText('');
    setSending(true);

    try {
      const resp = await api.sendChatMessage(activeCase.id, text, conversationId || undefined);
      if (!conversationId && resp.conversation_id) {
        setConversationId(resp.conversation_id);
      }
      await loadHistory();
    } catch (err: any) {
      alert(`Chat error: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  const handleNewConversation = () => {
    setConversationId(`CONV-${Math.random().toString(36).substring(2, 9).toUpperCase()}`);
    setMessages([]);
  };

  const suggestedPrompts = [
    'Summarize all uploaded evidence and key observations.',
    'Were any weapons or edged threats confirmed in detections?',
    'What witness auditory statements corroborate video surveillance?',
    'Detail the chronological sequence between 0.0s and 6.0s.'
  ];

  if (!activeCase) {
    return (
      <div className="glass-panel p-12 text-center rounded-2xl border border-charcoal-700/60 max-w-xl mx-auto my-12">
        <BotMessageSquare className="w-12 h-12 text-slate-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white">No Investigation Selected</h3>
        <p className="text-xs text-slate-400 mt-1">
          Select an investigation from the header dropdown to converse with the evidence-grounded assistant.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8.5rem)] flex flex-col space-y-4">
      {/* Chat Header */}
      <div className="glass-panel p-4 rounded-2xl border border-charcoal-700/60 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center shadow-glow-cyan">
            <BotMessageSquare className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-sm font-bold text-white tracking-wide">
                Grounded Forensic Reasoner
              </h1>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/30 text-emerald-400">
                STRICT EVIDENCE GROUNDING
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Citing verified evidence IDs and timestamps for Case: <span className="text-cyan-300 font-mono">{activeCase.id}</span>
            </p>
          </div>
        </div>

        <button
          onClick={handleNewConversation}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-charcoal-800 hover:bg-charcoal-700 border border-charcoal-700 flex items-center space-x-1.5 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>New Session</span>
        </button>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 glass-panel p-6 rounded-2xl border border-charcoal-700/60 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4 py-8">
            <div className="p-4 rounded-full bg-charcoal-850 border border-charcoal-700">
              <Sparkles className="w-8 h-8 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Ask Anything About Case Evidence</h3>
              <p className="text-xs text-slate-400 mt-1">
                The reasoner answers using stored RT-DETR detections, Whisper transcripts, and fused timelines.
                Unsupported facts are clearly identified.
              </p>
            </div>

            {/* Suggested Starter Prompts */}
            <div className="w-full space-y-2 pt-2">
              {suggestedPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  className="w-full p-2.5 rounded-xl bg-charcoal-850 hover:bg-charcoal-800 border border-charcoal-700 text-left text-xs text-slate-300 hover:text-cyan-300 transition-all font-medium flex items-center justify-between group"
                >
                  <span>"{prompt}"</span>
                  <span className="text-slate-500 group-hover:text-cyan-400 font-mono text-xs">→</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
              >
                <div className="flex items-center space-x-1.5 text-[10px] font-mono text-slate-400">
                  <span>{isUser ? 'INVESTIGATOR' : 'CRIMEVISION REASONER'}</span>
                  <span>•</span>
                  <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <div
                  className={`p-4 rounded-2xl max-w-2xl text-xs leading-relaxed ${
                    isUser
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-none shadow-glow-cyan'
                      : 'bg-charcoal-850 border border-charcoal-700/80 text-slate-200 rounded-bl-none shadow-lg'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {/* Grounded Evidence Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-charcoal-700/60 flex flex-wrap gap-1.5">
                      <span className="text-[10px] font-mono text-slate-400 block w-full mb-1">
                        CITED EVIDENCE SOURCES:
                      </span>
                      {msg.citations.map((cite, cIdx) => (
                        <span
                          key={cIdx}
                          className="text-[9px] font-mono px-2 py-0.5 rounded bg-charcoal-950 border border-cyan-500/30 text-cyan-300 flex items-center space-x-1"
                        >
                          <FileCheck className="w-2.5 h-2.5" />
                          <span>[{cite.evidence_id || cite.item || 'EVD-REF'}]</span>
                          {cite.timestamp !== undefined && <span>@{cite.timestamp}s</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {sending && (
          <div className="flex items-center space-x-2 text-xs text-cyan-400 font-mono animate-pulse pl-2">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            <span>Consulting case evidence repository...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="glass-panel p-3 rounded-2xl border border-charcoal-700/60 flex items-center space-x-3 shrink-0">
        <input
          type="text"
          placeholder="Ask a question about the evidence, timeline timestamps, or witness audio..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={sending}
          className="flex-1 bg-transparent px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
        />
        <button
          onClick={() => handleSend()}
          disabled={sending || !inputText.trim()}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 transition-all flex items-center space-x-1.5 shadow-glow-cyan"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send Query</span>
        </button>
      </div>
    </div>
  );
};
