import { useState } from "react";
import { Bot, User, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import type { ChatMessage } from "@/domain/types/ai-coaching.types";

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });
}

// Truncate long messages for collapsed view
const COLLAPSE_THRESHOLD = 300;

interface ChatMessageBubbleProps {
  msg: ChatMessage;
  onDelete?: (msgId: string) => void;
}

export default function ChatMessageBubble({ msg, onDelete }: ChatMessageBubbleProps) {
  const isUser = msg.role === "user";
  const isLong = msg.content.length > COLLAPSE_THRESHOLD;
  const [collapsed, setCollapsed] = useState(false);

  const displayContent = collapsed
    ? msg.content.slice(0, 120).trimEnd() + "..."
    : msg.content;

  return (
    <div data-testid={`chat-msg-${msg.id}`} className={`group flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}

      <div className={`flex max-w-[85%] flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
        <div className={`relative rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md bg-muted/40 text-foreground"
        }`}>
          {displayContent}

          {/* Collapse/expand for long messages */}
          {isLong && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className={`ml-1 inline-flex items-center gap-0.5 text-[10px] font-medium ${
                isUser ? "text-primary-foreground/70 hover:text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {collapsed ? (
                <>Vis mere <ChevronDown className="h-3 w-3" /></>
              ) : (
                <>Vis mindre <ChevronRight className="h-3 w-3" /></>
              )}
            </button>
          )}
        </div>

        {/* Time + mock indicator + actions */}
        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] text-muted-foreground/60">
            {formatTime(msg.createdAt)}
          </span>
          {msg.isMock && !isUser && (
            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-medium text-amber-400 border border-amber-500/30">
              Mock data
            </span>
          )}
          {onDelete && (
            <button
              data-testid={`delete-msg-${msg.id}`}
              onClick={() => onDelete(msg.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 text-muted-foreground/40 hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {isUser && (
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
