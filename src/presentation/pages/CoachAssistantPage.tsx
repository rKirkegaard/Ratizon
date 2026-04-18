import { useState, useRef, useEffect, useMemo } from "react";
import { Bot, Plus, Trash2, Pencil, Loader2 } from "lucide-react";
import { useAthleteStore } from "@/application/stores/athleteStore";
import { useChat } from "@/application/hooks/ai-coaching/useChat";
import {
  useConversations,
  useConversationMessages,
  useUpdateConversationTitle,
  useDeleteConversation,
} from "@/application/hooks/ai-coaching/useConversations";
import { useLLMEffectiveConfig } from "@/application/hooks/llm/useLLMSettings";
import ChatMessageBubble from "@/presentation/components/ai-coaching/ChatMessageBubble";
import TypingIndicator from "@/presentation/components/ai-coaching/TypingIndicator";
import ChatInput from "@/presentation/components/ai-coaching/ChatInput";
import ChatContextPanel from "@/presentation/components/ai-coaching/ChatContextPanel";
import ConfirmDialog from "@/presentation/components/shared/ConfirmDialog";
import type { ChatConversation } from "@/domain/types/ai-coaching.types";

function truncateTitle(title: string, maxLength = 40): string {
  if (!title) return "";
  if (title.length <= maxLength) return title;
  return title.slice(0, maxLength - 3).trimEnd() + "...";
}

function groupConversationsByDate(conversations: ChatConversation[]): { label: string; conversations: ChatConversation[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const thisWeekStart = new Date(today); thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay() + (thisWeekStart.getDay() === 0 ? -6 : 1));
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const groups: Record<string, ChatConversation[]> = {
    "I dag": [],
    "I gaar": [],
    "Denne uge": [],
    "Denne maaned": [],
    "Aeldre": [],
  };

  for (const conv of conversations) {
    const d = new Date(conv.updatedAt);
    if (d >= today) groups["I dag"].push(conv);
    else if (d >= yesterday) groups["I gaar"].push(conv);
    else if (d >= thisWeekStart) groups["Denne uge"].push(conv);
    else if (d >= thisMonthStart) groups["Denne maaned"].push(conv);
    else groups["Aeldre"].push(conv);
  }

  return Object.entries(groups)
    .filter(([, convs]) => convs.length > 0)
    .map(([label, convs]) => ({ label, conversations: convs }));
}

export default function CoachAssistantPage() {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);
  const { messages, conversationId, isLoading, error, sendMessage, loadConversation, removeMessage, clearChat } = useChat({ athleteId });
  const { data: conversations, isLoading: convsLoading } = useConversations(athleteId);
  const updateTitle = useUpdateConversationTitle();
  const deleteConv = useDeleteConversation(athleteId);
  const { data: effectiveConfig } = useLLMEffectiveConfig(athleteId);

  const [loadingConvId, setLoadingConvId] = useState<string | null>(null);
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [chatContext, setChatContext] = useState({ sport: "all", weeks: 2, customContext: "" });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Prevent parent <main> from scrolling on this full-height page
  useEffect(() => {
    const main = document.querySelector("main");
    if (main) {
      main.style.overflow = "hidden";
      main.style.padding = "0";
      return () => { main.style.overflow = ""; main.style.padding = ""; };
    }
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Load conversation messages
  const { data: convMessages } = useConversationMessages(loadingConvId);
  useEffect(() => {
    if (convMessages && loadingConvId) {
      loadConversation(loadingConvId, convMessages);
      setLoadingConvId(null);
    }
  }, [convMessages, loadingConvId, loadConversation]);

  const dateGroups = useMemo(() =>
    groupConversationsByDate(conversations ?? []),
  [conversations]);

  function startRename(conv: ChatConversation) {
    setEditingConvId(conv.id);
    setEditTitle(conv.title);
  }

  function saveRename() {
    if (editingConvId && editTitle.trim()) {
      updateTitle.mutate({ conversationId: editingConvId, title: editTitle.trim() });
    }
    setEditingConvId(null);
  }

  if (!athleteId) {
    return (
      <div data-testid="coach-assistant-page" className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Vaelg en atlet for at bruge AI Coach.</p>
      </div>
    );
  }

  return (
    <div data-testid="coach-assistant-page" className="flex h-full">
      {/* Sidebar — conversation history */}
      <div className="w-64 flex-shrink-0 flex flex-col bg-muted/30 border-r border-border">
        {/* New chat button */}
        <div className="px-2 pt-3 pb-2">
          <button
            data-testid="new-conversation"
            onClick={clearChat}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
          >
            <Plus className="h-4 w-4" />
            Ny samtale
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {convsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : dateGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <p className="text-xs text-muted-foreground">Ingen samtaler endnu</p>
            </div>
          ) : (
            <div className="px-2 space-y-3">
              {dateGroups.map((group) => (
                <div key={group.label}>
                  <div className="text-[11px] font-medium text-muted-foreground/70 px-3 pb-1 pt-2">
                    {group.label}
                  </div>
                  <div className="space-y-px">
                    {group.conversations.map((conv) => (
                      <div
                        key={conv.id}
                        data-testid={`conversation-${conv.id}`}
                        className={`group relative flex w-full items-center rounded-lg transition-colors cursor-pointer ${
                          conversationId === conv.id
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        }`}
                        onClick={() => setLoadingConvId(conv.id)}
                      >
                        {/* Title */}
                        <div className="flex-1 min-w-0 px-3 py-2">
                          {editingConvId === conv.id ? (
                            <input
                              autoFocus
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onBlur={saveRename}
                              onKeyDown={(e) => { if (e.key === "Enter") saveRename(); if (e.key === "Escape") setEditingConvId(null); }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full bg-transparent text-sm focus:outline-none"
                            />
                          ) : (
                            <span className="block truncate text-sm" title={conv.title}>
                              {truncateTitle(conv.title)}
                            </span>
                          )}
                        </div>

                        {/* Fade gradient + action buttons on hover */}
                        {editingConvId !== conv.id && (
                          <div className="absolute right-0 top-0 bottom-0 flex items-center gap-0.5 pr-1.5 pl-6 rounded-r-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ background: conversationId === conv.id
                              ? "linear-gradient(to right, transparent, hsl(var(--muted)) 40%)"
                              : "linear-gradient(to right, transparent, hsl(var(--card)) 40%)"
                            }}
                          >
                            <button
                              onClick={(e) => { e.stopPropagation(); startRename(conv); }}
                              className="rounded p-1 text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: conv.id, title: conv.title }); }}
                              className="rounded p-1 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Provider info */}
        {effectiveConfig && (
          <div className="border-t border-border px-3 py-2">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{effectiveConfig.provider}</span>
              <span>{effectiveConfig.model}</span>
            </div>
          </div>
        )}
      </div>

      {/* Main chat area */}
      <div className="flex-1 min-h-0 flex flex-col gap-4">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Bot className="h-12 w-12 text-muted-foreground/20 mb-3" />
              <h3 className="text-sm font-medium text-foreground mb-1">AI Triatlon Coach</h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                Stil spoergsmaal om din traening, analyse, ernaering, restitution eller teknik.
              </p>
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

        {/* Context Panel (S17) */}
        <ChatContextPanel currentContext={chatContext} onContextChange={setChatContext} />

        {/* Input */}
        <div className="flex-shrink-0">
          <ChatInput onSend={(text) => sendMessage(text, chatContext)} disabled={isLoading} />
        </div>
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteConv.mutate(deleteTarget.id);
            if (deleteTarget.id === conversationId) clearChat();
            setDeleteTarget(null);
          }
        }}
        title="Slet samtale"
        message={`Er du sikker paa at du vil slette "${deleteTarget?.title}"? Alle beskeder slettes permanent.`}
      />
    </div>
  );
}
