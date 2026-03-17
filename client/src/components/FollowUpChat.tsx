import { useState, type FormEvent } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface FollowUpChatProps {
  sessionId: string;
}

export default function FollowUpChat({ sessionId }: FollowUpChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [expired, setExpired] = useState(false);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: userMessage }),
      });

      if (response.status === 410) {
        setExpired(true);
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      // Read SSE stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const dataLine = line.replace(/^data: /, "");
          if (!dataLine) continue;
          try {
            const event = JSON.parse(dataLine);
            if (event.type === "chat_response") {
              assistantText = event.data.message;
            } else if (event.type === "error") {
              assistantText = `Error: ${event.data.message}`;
            }
          } catch {
            // skip
          }
        }
      }

      if (assistantText) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: assistantText },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${err.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  if (expired) {
    return (
      <div className="chat-expired">
        <p>Session expired. Please start a new analysis.</p>
      </div>
    );
  }

  return (
    <div className="follow-up-chat">
      <h3>Follow-Up Questions</h3>

      {messages.length > 0 && (
        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`chat-message chat-${msg.role}`}>
              <strong>{msg.role === "user" ? "You" : "Claude"}:</strong>
              <p>{msg.content}</p>
            </div>
          ))}
        </div>
      )}

      <form className="chat-input-form" onSubmit={handleSend}>
        <input
          type="text"
          placeholder="Ask a follow-up question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          {isLoading ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
}
