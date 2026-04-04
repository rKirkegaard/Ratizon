import { useState, useRef, useEffect } from 'react';
import { useAIChat } from '@/application/hooks/ai-coaching/useAICoaching';
import { useAthleteStore } from '@/application/stores/athleteStore';
import { useUIStore } from '@/application/stores/uiStore';
import { Bot, X, Send, User, Loader2 } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function AIChatBar() {
  const { aiPanelOpen, setAIPanelOpen } = useUIStore();

  if (aiPanelOpen) return null;

  return (
    <button
      data-testid="ai-chat-bar"
      onClick={() => setAIPanelOpen(true)}
      className="fixed bottom-0 left-0 right-0 h-10 bg-card border-t border-border/50 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors z-40"
    >
      <Bot className="h-4 w-4" />
      Spørg din AI-coach...
    </button>
  );
}

export function AIChatPanel() {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);
  const { aiPanelOpen, setAIPanelOpen } = useUIStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const chatMutation = useAIChat(athleteId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!aiPanelOpen) return null;

  const handleSend = async () => {
    if (!input.trim() || chatMutation.isPending) return;
    const userMsg: ChatMessage = { role: 'user', content: input.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    try {
      const response = await chatMutation.mutateAsync({ message: userMsg.content, contextPage: window.location.pathname });
      const aiMsg: ChatMessage = { role: 'assistant', content: (response as any).reply || (response as any).content || 'Ingen svar', timestamp: new Date() };
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Kunne ikke få svar fra AI-coach. Prøv igen.', timestamp: new Date() }]);
    }
  };

  return (
    <div data-testid="ai-chat-panel" className="fixed bottom-0 right-0 w-full md:w-[420px] h-[500px] bg-card border border-border/50 rounded-t-xl shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">AI Coach</span>
        </div>
        <button onClick={() => setAIPanelOpen(false)} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
            <Bot className="h-8 w-8 mb-2 opacity-30" />
            <p>Stil et spørgsmål til din AI-coach</p>
            <p className="text-xs mt-1">F.eks. "Skal jeg træne hårdt i dag?"</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && <Bot className="h-5 w-5 text-primary mt-1 shrink-0" />}
            <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
              msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-foreground'
            }`}>
              {msg.content}
            </div>
            {msg.role === 'user' && <User className="h-5 w-5 text-muted-foreground mt-1 shrink-0" />}
          </div>
        ))}
        {chatMutation.isPending && (
          <div className="flex gap-2">
            <Bot className="h-5 w-5 text-primary mt-1" />
            <div className="bg-muted/50 rounded-lg px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border/50">
        <div className="flex gap-2">
          <input
            data-testid="ai-chat-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Skriv en besked..."
            className="flex-1 bg-muted/30 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            data-testid="ai-chat-send"
            onClick={handleSend}
            disabled={!input.trim() || chatMutation.isPending}
            className="px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
