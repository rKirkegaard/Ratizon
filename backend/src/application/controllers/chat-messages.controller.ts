import { Request, Response } from "express";
import { db } from "../../infrastructure/database/connection.js";
import { chatConversations, chatMessages } from "../../infrastructure/database/schema/ai-coaching.schema.js";
import { eq, desc, asc } from "drizzle-orm";

// ── GET /api/chat-messages/conversations/:athleteId ───────────────────

export async function listConversations(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const rows = await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.athleteId, athleteId))
      .orderBy(desc(chatConversations.updatedAt));

    res.json({
      data: rows.map((r) => ({
        id: r.id,
        athleteId: r.athleteId,
        title: r.title,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ── POST /api/chat-messages/conversations/:athleteId ──────────────────

export async function createConversation(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const title = req.body.title ?? "Ny samtale";

    const [created] = await db
      .insert(chatConversations)
      .values({ athleteId, title })
      .returning();

    res.status(201).json({
      data: {
        id: created.id,
        athleteId: created.athleteId,
        title: created.title,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ── PUT /api/chat-messages/conversations/:conversationId ──────────────

export async function updateConversationTitle(req: Request, res: Response) {
  try {
    const { conversationId } = req.params;
    const { title } = req.body;

    if (!title) {
      res.status(400).json({ error: "Titel er paakraevet" });
      return;
    }

    await db
      .update(chatConversations)
      .set({ title, updatedAt: new Date() })
      .where(eq(chatConversations.id, conversationId));

    res.json({ data: { message: "Titel opdateret" } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ── DELETE /api/chat-messages/conversations/:conversationId ───────────

export async function deleteConversation(req: Request, res: Response) {
  try {
    const { conversationId } = req.params;

    // Delete messages first (cascade may handle this, but be explicit)
    await db.delete(chatMessages).where(eq(chatMessages.conversationId, conversationId));
    await db.delete(chatConversations).where(eq(chatConversations.id, conversationId));

    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ── GET /api/chat-messages/conversation/:conversationId/messages ──────

export async function getConversationMessages(req: Request, res: Response) {
  try {
    const { conversationId } = req.params;
    const rows = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId))
      .orderBy(asc(chatMessages.createdAt));

    res.json({
      data: rows.map((m) => ({
        id: m.id.toString(),
        conversationId: m.conversationId,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ── POST /api/chat-messages/conversation/:conversationId/messages ─────

export async function addMessage(req: Request, res: Response) {
  try {
    const { conversationId } = req.params;
    const { role, content } = req.body;

    if (!role || !content) {
      res.status(400).json({ error: "role og content er paakraevet" });
      return;
    }

    const [created] = await db
      .insert(chatMessages)
      .values({ conversationId, role, content })
      .returning();

    // Update conversation updatedAt
    await db
      .update(chatConversations)
      .set({ updatedAt: new Date() })
      .where(eq(chatConversations.id, conversationId));

    res.status(201).json({
      data: {
        id: created.id.toString(),
        conversationId: created.conversationId,
        role: created.role,
        content: created.content,
        createdAt: created.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ── DELETE /api/chat-messages/message/:messageId ──────────────────────

export async function deleteMessage(req: Request, res: Response) {
  try {
    const { messageId } = req.params;
    await db.delete(chatMessages).where(eq(chatMessages.id, BigInt(messageId)));
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
