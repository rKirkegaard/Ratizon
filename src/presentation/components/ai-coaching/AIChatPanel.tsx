import { useState, useRef, useEffect } from "react";
import { X, Plus, ChevronDown, MessageCircle } from "lucide-react";
import { useAthleteStore } from "@/application/stores/athleteStore";
import { useUiStore } from "@/application/stores/uiStore";
import { useChat } from "@/application/hooks/ai-coaching/useChat";
import { useConversations, useConversationMessages } from "@/application/hooks/ai-coaching/useConversations";
import ChatMessageBubble from "./ChatMessageBubble";
import TypingIndicator from "./TypingIndicator";
import ChatInput from "./ChatInput";

export default function AIChatPanel() {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);
  const setAiPanelOpen = useUiStore((s) => s.setAiPanelOpen);

  const { messages, conversationId, isLoading, error, sendMessage, loadConversation, removeMessage, clearChat } = useChat({ athleteId });
  const { data: conversations } = useConversations(athleteId);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loadingConvId, setLoadingConvId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Load conversation messages when switching
  const { data: convMessages } = useConversationMessages(loadingConvId);
  useEffect(() => {
    if (convMessages && loadingConvId) {
      loadConversation(loadingConvId, convMessages);
      setLoadingConvId(null);
    }
  }, [convMessages, loadingConvId, loadConversation]);

  function handleSwitchConversation(convId: string) {
    setLoadingConvId(convId);
    setDropdownOpen(false);
  }

  function handleNewChat() {
    clearChat();
    setDropdownOpen(false);
  }

  const activeTitle = conversations?.find((c) => c.id === conversationId)?.title ?? "Ny samtale";

  return (
    <aside
      data-testid="ai-chat-panel"
      className="flex h-full w-80 flex-col border-l border-border bg-card"
    >
      {/* Header with conversation dropdown */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <button
          data-testid="chat-new"
          onClick={handleNewChat}
          className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
        </button>

        <div className="relative min-w-0 flex-1">
          <button
            data-testid="chat-conversation-selector"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex w-full min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-sm text-foreground hover:bg-accent/50 truncate"
          >
            <span className="truncate">{activeTitle}</span>
            <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
          </button>

          {dropdownOpen && conversations && conversations.length > 0 && (
            <div className="absolute left-0 right-0 top-8 z-50 max-h-64 overflow-y-auto rounded-lg border border-border bg-card shadow-xl">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSwitchConversation(conv.id)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                    conv.id === conversationId
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  }`}
                >
                  <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{conv.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          data-testid="chat-close"
          onClick={() => setAiPanelOpen(false)}
          className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">Stil et spoergsmaal til din AI-coach</p>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessageBubble key={msg.id} msg={msg} onDelete={removeMessage} />
        ))}

        {isLoading && <TypingIndicator />}

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border px-3 py-2.5">
        <ChatInput onSend={sendMessage} disabled={isLoading || !athleteId} />
      </div>
    </aside>
  );
}
