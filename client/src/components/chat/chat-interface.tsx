import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Bot, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type Message = {
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
};

type ChatProps = {
  courseId: number;
};

export default function ChatInterface({ courseId }: ChatProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message, courseId }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Parse the response only if it's a string
      const aiMessage = {
        content: typeof data.response === 'string' 
          ? JSON.parse(data.response).message
          : data.response.message,
        suggestions: typeof data.response === 'string'
          ? JSON.parse(data.response).suggestions
          : data.response.suggestions
      };

      setMessages((prev) => [
        ...prev,
        { role: "user", content: data.message },
        { role: "assistant", content: aiMessage.content, suggestions: aiMessage.suggestions },
      ]);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  });

  const handleSubmit = async (message: string) => {
    if (!message.trim() || chatMutation.isPending) return;

    try {
      setInput("");
      await chatMutation.mutateAsync(message);
    } catch (error) {
      // Error handling is done in onError callback
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(input);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, i) => (
            <div
              key={i}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <Card
                className={`max-w-[80%] p-3 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <div className="flex gap-2 items-start">
                  {message.role === "assistant" ? (
                    <Bot className="h-5 w-5 mt-1" />
                  ) : (
                    <User className="h-5 w-5 mt-1" />
                  )}
                  <div className="space-y-2">
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    {message.suggestions && message.suggestions.length > 0 && message.role === "assistant" && (
                      <div className="space-y-1 mt-2">
                        <p className="text-xs font-medium">I can help you more! Just click a question:</p>
                        <div className="flex flex-col gap-1">
                          {message.suggestions.map((suggestion, j) => (
                            <Button
                              key={j}
                              variant="ghost"
                              size="sm"
                              className="justify-start text-xs hover:bg-primary/10"
                              onClick={() => handleSubmit(suggestion)}
                            >
                              {suggestion}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your question..."
            className="min-h-[60px]"
          />
          <Button
            onClick={() => handleSubmit(input)}
            disabled={!input.trim() || chatMutation.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}