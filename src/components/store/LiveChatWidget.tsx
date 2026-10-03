import { api } from "@/convex/_generated/api";
import { useI18n } from "@/lib/i18n";
import { useMutation, useQuery } from "convex/react";
import { Loader2, MessageCircle, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const ID_KEY = "mama-chat-id";
const NAME_KEY = "mama-chat-name";

function newConversationId(): string {
  try {
    const uuid = globalThis.crypto?.randomUUID?.();
    if (uuid) return uuid.replace(/-/g, "").slice(0, 32);
  } catch {
    /* fall through to the manual id */
  }
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

/** Stable per-browser thread id, so the shop can find this conversation again. */
function readConversationId(): string {
  try {
    const stored = localStorage.getItem(ID_KEY);
    if (stored) return stored;
    const fresh = newConversationId();
    localStorage.setItem(ID_KEY, fresh);
    return fresh;
  } catch {
    return newConversationId();
  }
}

function readName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

function timeLabel(ts: number, lang: "vi" | "en"): string {
  try {
    return new Date(ts).toLocaleTimeString(lang === "vi" ? "vi-VN" : "en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/**
 * Storefront live chat: a floating bottom-right bubble that opens a real-time
 * thread backed by the Convex `messages` table. Replaces the old Zalo QR
 * widget — the conversation happens here, in the shop's own dashboard.
 */
export function LiveChatWidget() {
  const { t, lang } = useI18n();
  const [conversationId] = useState(readConversationId);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(readName);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);

  const send = useMutation(api.messages.send);
  const messages = useQuery(api.messages.conversation, { conversationId });

  const listRef = useRef<HTMLDivElement>(null);
  const lastCustomerIndex = (messages ?? []).reduce(
    (acc, message, index) => (message.author === "customer" ? index : acc),
    -1,
  );

  // New seller reply while the panel is closed → badge, no popup stealing focus.
  useEffect(() => {
    if (open || lastCustomerIndex < 0) return;
    const replyCount = (messages?.length ?? 0) - 1 - lastCustomerIndex;
    setUnread(replyCount > 0 ? replyCount : 0);
  }, [messages, lastCustomerIndex, open]);

  useEffect(() => {
    if (!open) return;
    setUnread(0);
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [open, messages]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await send({
        conversationId,
        body,
        author: "customer",
        ...(name.trim() ? { name: name.trim() } : {}),
      });
      setDraft("");
      try {
        if (name.trim()) localStorage.setItem(NAME_KEY, name.trim());
      } catch {
        /* private mode — the name simply is not remembered */
      }
    } catch {
      alert(t("chatSendFailed"));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating bubble

          Lifted to `bottom-20` because the Netlify badge renders in the bottom
          -right corner, roughly 32-40px tall. At `bottom-5` this 56px bubble
          sat directly on top of it and the watermark swallowed the tap target.

          Kept on the right rather than moved to `left-5`: bottom-right is where
          shoppers expect a chat launcher, and the left edge already carries the
          cart/account controls on mobile. */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? t("chatClose") : t("chatOpen")}
        aria-expanded={open}
        className="fixed bottom-20 right-5 z-50 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft-lg transition-transform hover:scale-105 active:scale-95"
      >
        {open ? (
          <X className="size-6" />
        ) : (
          <MessageCircle className="size-6" />
        )}
        {!open && unread > 0 && (
          // Sits ON the primary bubble, so it inverts: plum on pink. Using
          // bg-primary here would make the count invisible against the bubble.
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-foreground px-1 text-[10px] font-bold text-primary ring-2 ring-background">
            {unread}
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          role="dialog"
          aria-label={t("chatTitle")}
          className="fixed bottom-[9.5rem] right-5 z-50 flex h-[min(32rem,70vh)] w-[min(22rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-soft-lg"
        >
          {/* Head */}
          <div className="flex items-center gap-3 bg-primary px-4 py-3.5 text-primary-foreground">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary-foreground/15">
              <MessageCircle className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-sm font-bold leading-tight">
                {t("chatTitle")}
              </p>
              <p className="truncate text-[11px] opacity-80">
                {t("chatWidgetLabel")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("chatClose")}
              className="ml-auto flex size-8 items-center justify-center rounded-full transition-colors hover:bg-primary-foreground/15"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            <p className="rounded-2xl bg-secondary px-3.5 py-2.5 text-xs leading-relaxed text-foreground/80">
              {t("chatIntro")}
            </p>

            {messages?.map((message) => {
              const mine = message.author === "customer";
              return (
                <div
                  key={message._id}
                  className={mine ? "flex justify-end" : "flex justify-start"}
                >
                  <div
                    className={
                      mine
                        ? "max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm text-primary-foreground"
                        : "max-w-[85%] rounded-2xl rounded-bl-md bg-secondary px-3.5 py-2 text-sm text-foreground"
                    }
                  >
                    <p className="break-words whitespace-pre-wrap">
                      {message.body}
                    </p>
                    <p
                      className={
                        mine
                          ? "mt-1 text-right text-[10px] opacity-70"
                          : "mt-1 text-[10px] text-muted-foreground"
                      }
                    >
                      {mine ? t("chatYou") : t("chatShop")} ·{" "}
                      {timeLabel(message.createdAt, lang)}
                    </p>
                  </div>
                </div>
              );
            })}

            {messages !== undefined && messages.length === 0 && (
              <p className="text-center text-xs text-muted-foreground">
                {t("chatEmpty")}
              </p>
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={submit}
            className="border-t border-border bg-background/60 p-3"
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("chatYourName")}
              aria-label={t("chatYourName")}
              maxLength={60}
              className="mb-2 h-9 w-full rounded-full border border-input bg-card px-3.5 text-xs outline-none focus:border-ring"
            />
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void submit(e);
                  }
                }}
                rows={1}
                maxLength={2000}
                placeholder={t("chatPlaceholder")}
                aria-label={t("chatPlaceholder")}
                className="max-h-24 min-h-10 flex-1 resize-none rounded-2xl border border-input bg-card px-3.5 py-2.5 text-sm outline-none focus:border-ring"
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                aria-label={t("chatSend")}
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
