import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Send, Video, Phone, ArrowLeft, AlertTriangle } from "lucide-react";
import { User, Message } from "@shared/schema";

interface MessagesProps {
  user: User;
}

export default function Messages({ user }: MessagesProps) {
  const { matchId } = useParams();
  const [newMessage, setNewMessage] = useState("");
  const [isViolationWarning, setIsViolationWarning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch messages for this match
  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages", matchId],
    enabled: !!matchId,
  });

  // Fetch match details
  const { data: match } = useQuery({
    queryKey: ["/api/matches", user.id],
    select: (matches: any[]) => matches.find(m => m.id === parseInt(matchId || "0")),
    enabled: !!matchId,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", "/api/messages", {
        matchId: parseInt(matchId!),
        senderId: user.id,
        content,
        messageType: "text",
      });
      return response.json();
    },
    onSuccess: () => {
      setNewMessage("");
      setIsViolationWarning(false);
      queryClient.invalidateQueries({ queryKey: ["/api/messages", matchId] });
    },
    onError: (error: any) => {
      if (error.message.includes("phone number")) {
        setIsViolationWarning(true);
        toast({
          title: "Account Suspended",
          description: "Your message contained a phone number. Your account has been suspended and you have been fined $100.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to send message. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !matchId) return;
    sendMessageMutation.mutate(newMessage.trim());
  };

  // Phone number detection warning
  const hasPhoneNumber = (text: string) => {
    const phoneRegex = /(\+?1?[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}|(\d{10})|(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})|(\(\d{3}\)\s?\d{3}[-.\s]?\d{4})/g;
    const phoneWordRegex = /(zero|one|two|three|four|five|six|seven|eight|nine|oh)/gi;
    return phoneRegex.test(text) || phoneWordRegex.test(text);
  };

  if (!matchId) {
    // Show match list
    return (
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">Messages</h1>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              Select a match to start messaging
            </p>
            <Link href="/matches">
              <Button className="mt-4">View Matches</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const otherUser = match?.otherUser;

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/matches">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>

            {otherUser && (
              <>
                <Avatar>
                  <AvatarImage src="" />
                  <AvatarFallback>
                    {otherUser.firstName[0]}{otherUser.lastName[0]}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold">{otherUser.firstName}</h2>
                    {otherUser.isVerified && <Badge variant="secondary">Verified</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {otherUser.isActive ? "Active now" : "Last seen recently"}
                  </p>
                </div>

                <div className="flex gap-2">
                  {user.isPremium && (
                    <>
                      <Button variant="outline" size="sm">
                        <Phone className="w-4 h-4" />
                      </Button>
                      <Link href={`/video-call/${matchId}`}>
                        <Button variant="outline" size="sm">
                          <Video className="w-4 h-4" />
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              You matched! Send a message to start the conversation.
            </p>
            {!user.isPremium && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-sm text-yellow-800">
                  💡 <strong>Premium Tip:</strong> Video calls are available for premium users to help you connect better!
                </p>
              </div>
            )}
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.senderId === user.id ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                  message.senderId === user.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <p className={`text-xs mt-1 ${
                  message.senderId === user.id 
                    ? "text-primary-foreground/70" 
                    : "text-muted-foreground"
                }`}>
                  {new Date(message.sentAt).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Violation Warning */}
      {isViolationWarning && (
        <div className="px-4 pb-2">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription className="text-red-700">
              <strong>Warning:</strong> Your account has been suspended for sharing contact information. 
              A $100 fine has been applied. For safety reasons, please use our secure communication features only.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Safety Notice */}
      <div className="px-4 pb-2">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-700">
            🛡️ <strong>Safety Reminder:</strong> Never share personal phone numbers or contact information. 
            This helps keep you safe and avoid account suspension.
          </p>
        </div>
      </div>

      {/* Message Input */}
      <div className="border-t bg-background p-4">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <div className="flex-1">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={sendMessageMutation.isPending}
              className={hasPhoneNumber(newMessage) ? "border-red-300" : ""}
            />
            {hasPhoneNumber(newMessage) && (
              <p className="text-xs text-red-600 mt-1">
                ⚠️ This message may contain a phone number and could result in account suspension
              </p>
            )}
          </div>
          <Button 
            type="submit" 
            disabled={!newMessage.trim() || sendMessageMutation.isPending}
            size="sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
