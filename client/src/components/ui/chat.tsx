import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Bot, User } from "lucide-react";

type Message = {
  id: number;
  message: string;
  response: string;
  createdAt: string;
};

type ChatProps = {
  messages: Message[];
  onSendMessage: (message: string) => Promise<void>;
  isLoading?: boolean;
};

export function Chat({ messages, onSendMessage, isLoading = false }: ChatProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    try {
      await onSendMessage(input);
      setInput("");
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className="space-y-4">
              <div className="flex items-start gap-3">
                <Avatar>
                  <AvatarFallback>U</AvatarFallback>
                  <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg" />
                </Avatar>
                <Card className="flex-1">
                  <CardContent className="p-3">
                    <p className="text-sm">{msg.message}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex items-start gap-3">
                <Avatar>
                  <AvatarFallback>AI</AvatarFallback>
                  <AvatarImage src="https://api.dicebear.com/7.x/bottts/svg" />
                </Avatar>
                <Card className="flex-1 bg-secondary">
                  <CardContent className="p-3">
                    <p className="text-sm whitespace-pre-wrap">{msg.response}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your question..."
            className="min-h-[60px]"
          />
          <Button type="submit" size="icon" disabled={isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
