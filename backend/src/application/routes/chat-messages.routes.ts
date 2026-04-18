import { Router } from "express";
import {
  listConversations,
  createConversation,
  updateConversationTitle,
  deleteConversation,
  getConversationMessages,
  addMessage,
  deleteMessage,
} from "../controllers/chat-messages.controller.js";

export const chatMessagesRouter = Router();

// Conversations
chatMessagesRouter.get("/conversations/:athleteId", listConversations);
chatMessagesRouter.post("/conversations/:athleteId", createConversation);
chatMessagesRouter.put("/conversations/:conversationId", updateConversationTitle);
chatMessagesRouter.delete("/conversations/:conversationId", deleteConversation);

// Messages within a conversation
chatMessagesRouter.get("/conversation/:conversationId/messages", getConversationMessages);
chatMessagesRouter.post("/conversation/:conversationId/messages", addMessage);
chatMessagesRouter.delete("/message/:messageId", deleteMessage);
