"use client";

import { useEffect, useState, type FormEvent } from "react";

interface ChatMessage {
  id: string;
  displayName: string;
  message: string;
  createdAt: string;
}

const NAME_STORAGE_KEY = "masters-chat-name";

function formatTime(createdAt: string) {
  return new Date(createdAt).toLocaleTimeString("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function LeaderboardChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMessages() {
    try {
      const res = await fetch("/api/chat", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load chat.");
      setMessages(data.messages ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 15_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const savedName = window.localStorage.getItem(NAME_STORAGE_KEY);
    if (savedName) setDisplayName(savedName);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, message }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to send message.");
      }

      window.localStorage.setItem(NAME_STORAGE_KEY, displayName.trim());
      setMessage("");
      setMessages((prev) => [...prev, data.message]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div>
          <h2 className="text-lg font-bold text-masters-green">Live Chat</h2>
          <p className="text-xs text-gray-500">Talk trash, call your shots, keep it moving. Refreshes every 15 seconds.</p>
        </div>
        <button onClick={loadMessages} className="text-xs text-masters-green underline">
          Refresh
        </button>
      </div>

      <div className="max-h-56 space-y-3 overflow-y-auto px-4 py-3">
        {loading ? (
          <p className="text-sm text-gray-400">Loading chat...</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-gray-400">No messages yet. Start the conversation.</p>
        ) : (
          messages.map((chat) => (
            <div key={chat.id} className="rounded-xl bg-gray-50 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-gray-900">{chat.displayName}</span>
                <span className="shrink-0 text-[11px] text-gray-400">{formatTime(chat.createdAt)} ET</span>
              </div>
              <p className="mt-1 text-sm text-gray-700">{chat.message}</p>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-gray-100 px-4 py-3">
        <div className="grid gap-2 md:grid-cols-[180px_minmax(0,1fr)_auto]">
          <input
            type="text"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Your name"
            maxLength={40}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-masters-green"
          />
          <input
            type="text"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Send a live message..."
            maxLength={180}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-masters-green"
          />
          <button
            type="submit"
            disabled={sending}
            className="rounded-lg bg-masters-green px-4 py-2 text-sm font-bold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </form>
    </section>
  );
}
