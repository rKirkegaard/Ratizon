import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/application/api/client";
import type { ChatMessage } from "@/domain/types/ai-coaching.types";

interface ChatContext {
  sport?: string;
  weeks?: number;
  customContext?: string;
}

interface UseChatOptions {
  athleteId: string | null;
  conversationId?: string | null;
}

interface UseChatReturn {
  messages: ChatMessage[];
  conversationId: string | null;
  isLoading: boolean;
  error: string | null;
  sendMessage: (text: string, context?: ChatContext) => Promise<void>;
  removeMessage: (msgId: string) => Promise<void>;
  loadConversation: (convId: string, msgs: ChatMessage[]) => void;
  clearChat: () => void;
}

export function useChat({ athleteId, conversationId: initialConvId }: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(initialConvId ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();

  const sendMessage = useCallback(async (text: string, context?: ChatContext) => {
    if (!athleteId || !text.trim()) return;
    setError(null);

    // Optimistic: add user message
    const userMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversationId: conversationId ?? "",
      role: "user",
      content: text.trim(),
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await apiClient.post<{
        conversationId: string;
        message: { id: string; role: string; content: string; createdAt: string };
      }>(`/ai-coaching/${athleteId}/chat`, {
        message: text.trim(),
        conversationId,
        sport: context?.sport,
        weeks: context?.weeks,
        customContext: context?.customContext,
      });

      // Update conversationId if new
      if (response.conversationId && !conversationId) {
        setConversationId(response.conversationId);
      }

      // Add assistant message
      const assistantMsg: ChatMessage = {
        id: response.message.id,
        conversationId: response.conversationId,
        role: "assistant",
        content: response.message.content,
        isMock: (response as any).isMock ?? false,
        createdAt: response.message.createdAt,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Invalidate conversation list
      qc.invalidateQueries({ queryKey: ["chat-conversations", athleteId] });
    } catch (err: any) {
      const msg = err?.data?.error?.message ?? err?.message ?? "Fejl ved afsendelse";
      setError(msg);
      // Remove optimistic user message on error
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
    } finally {
      setIsLoading(false);
    }
  }, [athleteId, conversationId, qc]);

  const loadConversation = useCallback((convId: string, msgs: ChatMessage[]) => {
    setConversationId(convId);
    setMessages(msgs);
    setError(null);
  }, []);

  const removeMessage = useCallback(async (msgId: string) => {
    try {
      await apiClient.delete(`/chat-messages/message/${msgId}`);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    } catch { /* ignore */ }
  }, []);

  const clearChat = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setError(null);
  }, []);

  return { messages, conversationId, isLoading, error, sendMessage, loadConversation, removeMessage, clearChat };
}
