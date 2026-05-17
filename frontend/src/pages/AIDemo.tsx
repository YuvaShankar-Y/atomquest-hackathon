import { FormEvent, useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, getErrorMessage } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import type { ApiResponse, ChatMessage, ChatResponse, TokenUsage } from "@/types";

const STORAGE_KEY = "hackathon_ai_demo_history";

interface ConversationMessage extends ChatMessage {
  id: string;
  createdAt: string;
  provider?: string;
  model?: string;
  usage?: TokenUsage;
}

function createWelcomeMessage(): ConversationMessage {
  return {
    id: "welcome-message",
    role: "assistant",
    content: "Hello, how can I help you today?",
    createdAt: new Date().toISOString(),
  };
}

function loadHistory(): ConversationMessage[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [createWelcomeMessage()];
  }

  try {
    const parsed = JSON.parse(raw) as ConversationMessage[];
    return parsed.length ? parsed : [createWelcomeMessage()];
  } catch {
    return [createWelcomeMessage()];
  }
}

export function AIDemo() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ConversationMessage[]>(() => loadHistory());
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) {
      return;
    }

    const userMessage: ConversationMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    const apiMessages = [
      ...messages.filter((message) => message.role !== "assistant" || messages.length > 1),
      userMessage,
    ].map<ChatMessage>(({ role, content }) => ({ role, content }));

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data } = await api.post<ApiResponse<ChatResponse>>("/api/v1/ai/chat", {
        messages: apiMessages,
        stream: false,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.data.content,
          createdAt: new Date().toISOString(),
          provider: data.data.provider,
          model: data.data.model,
          usage: data.data.usage,
        },
      ]);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "AI request failed",
        description: getErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    const welcomeMessage = createWelcomeMessage();
    setMessages([welcomeMessage]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([welcomeMessage]));
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Demo</h1>
          <p className="text-muted-foreground">Chat with the backend AI layer and keep a local conversation history.</p>
        </div>
        <Button variant="outline" onClick={clearChat} disabled={isLoading}>
          <RotateCcw className="h-4 w-4" />
          Clear Chat
        </Button>
      </div>

      <Card className="flex min-h-[480px] flex-col">
        <CardHeader>
          <CardTitle>Chat</CardTitle>
          <CardDescription>
            Messages are sent to POST `/api/v1/ai/chat` with provider, model, and token usage shown per response.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-4">
          <div className="flex max-h-[360px] flex-1 flex-col gap-3 overflow-y-auto rounded-md border p-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`rounded-lg px-3 py-2 text-sm ${
                  message.role === "user"
                    ? "ml-8 bg-primary text-primary-foreground"
                    : "mr-8 bg-muted text-foreground"
                }`}
              >
                <span className="mb-1 block text-xs font-semibold uppercase opacity-70">{message.role}</span>
                <p>{message.content}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs opacity-80">
                  <span>{formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}</span>
                  {message.provider ? <span className="capitalize">Provider: {message.provider}</span> : null}
                  {message.model ? <span>Model: {message.model}</span> : null}
                  {message.usage ? <span>Tokens: {message.usage.total_tokens}</span> : null}
                </div>
                {message.usage ? (
                  <div className="mt-2 grid gap-2 rounded-md border border-white/20 bg-black/10 p-2 text-xs dark:border-white/10">
                    <span>Prompt: {message.usage.prompt_tokens}</span>
                    <span>Completion: {message.usage.completion_tokens}</span>
                    <span>Total: {message.usage.total_tokens}</span>
                  </div>
                ) : null}
              </div>
            ))}
            {isLoading && <p className="text-sm text-muted-foreground">Thinking...</p>}
            <div ref={scrollRef} />
          </div>

          <form onSubmit={(event) => void handleSubmit(event)} className="flex gap-2">
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Type a message..."
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading}>
              Send
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
