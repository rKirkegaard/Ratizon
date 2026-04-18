import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/application/api/client";
import type { ChatConversation, ChatMessage } from "@/domain/types/ai-coaching.types";

export function useConversations(athleteId: string | null) {
  return useQuery<ChatConversation[]>({
    queryKey: ["chat-conversations", athleteId],
    queryFn: () => apiClient.get<ChatConversation[]>(`/chat-messages/conversations/${athleteId}`),
    enabled: !!athleteId,
    staleTime: 30 * 1000,
  });
}

export function useCreateConversation(athleteId: string | null) {
  const qc = useQueryClient();
  return useMutation<ChatConversation, Error, { title?: string }>({
    mutationFn: (data) => apiClient.post<ChatConversation>(`/chat-messages/conversations/${athleteId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat-conversations", athleteId] }),
  });
}

export function useUpdateConversationTitle() {
  const qc = useQueryClient();
  return useMutation<void, Error, { conversationId: string; title: string }>({
    mutationFn: ({ conversationId, title }) =>
      apiClient.put(`/chat-messages/conversations/${conversationId}`, { title }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat-conversations"] }),
  });
}

export function useDeleteConversation(athleteId: string | null) {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (conversationId) => apiClient.delete(`/chat-messages/conversations/${conversationId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat-conversations", athleteId] }),
  });
}

export function useConversationMessages(conversationId: string | null) {
  return useQuery<ChatMessage[]>({
    queryKey: ["chat-messages", conversationId],
    queryFn: () => apiClient.get<ChatMessage[]>(`/chat-messages/conversation/${conversationId}/messages`),
    enabled: !!conversationId,
    staleTime: 10 * 1000,
  });
}
