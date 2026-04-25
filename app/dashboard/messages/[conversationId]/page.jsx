// app/dashboard/messages/[conversationId]/page.jsx
"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Send, Trash2, Loader2, MessageSquare, ArrowLeft, CheckCheck } from "lucide-react";
import { toast } from "@/components/hooks/use-toast";
import DashboardShell from "@/assets/components/DashboardShell";
import Navbar from '@/assets/components/Navbar'

const POLLING_INTERVAL = 5000; // Poll every 5 seconds

export default function ConversationPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const conversationId = params.conversationId;
  const messagesEndRef = useRef(null);
  const pollingRef = useRef(null);

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Fetch only messages (for polling)
  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    
    try {
      const res = await fetch(`/api/messages/${conversationId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(prevMessages => {
          // Only update if there are new messages
          if (data.length !== prevMessages.length || 
              (data.length > 0 && data[data.length - 1]._id !== prevMessages[prevMessages.length - 1]?._id)) {
            return data;
          }
          // Check if any read status changed
          const readStatusChanged = data.some((msg, i) => 
            prevMessages[i] && msg.read !== prevMessages[i].read
          );
          if (readStatusChanged) {
            return data;
          }
          return prevMessages;
        });
      }
    } catch (error) {
      console.error("Error polling messages:", error);
    }
  }, [conversationId]);

  // Fetch conversation and messages (initial load)
  useEffect(() => {
    if (conversationId) {
      fetchConversationAndMessages();
    }
  }, [conversationId]);

  // Set up polling for new messages
  useEffect(() => {
    if (!conversationId || loading) return;

    // Start polling
    pollingRef.current = setInterval(fetchMessages, POLLING_INTERVAL);

    // Cleanup on unmount or when conversation changes
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [conversationId, loading, fetchMessages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchConversationAndMessages = async () => {
    try {
      // Fetch conversation details
      const conversationRes = await fetch(`/api/messages/${conversationId}`);
      if (conversationRes.ok) {
        const data = await conversationRes.json();
        setMessages(data);
        
        // Fetch conversation metadata to get participant info
        const listRes = await fetch("/api/messages");
        if (listRes.ok) {
          const conversations = await listRes.json();
          const conv = conversations.find(c => c._id === conversationId);
          if (conv) {
            setConversation(conv);
            // Update unread count to 0
          }
        }
      }
    } catch (error) {
      console.error("Error fetching conversation:", error);
      toast({
        title: "Error",
        description: "Failed to load conversation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId) return;

    setSending(true);
    try {
      const res = await fetch(`/api/messages/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage.trim() }),
      });

      if (res.ok) {
        const message = await res.json();
        setMessages([...messages, message]);
        setNewMessage("");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleDeleteConversation = async () => {
    if (!confirm("Delete this conversation?")) return;

    try {
      const res = await fetch(`/api/messages/${conversationId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: "Conversation deleted",
        });
        router.push("/dashboard/messages");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive",
      });
    }
  };

  const getOtherParticipant = () => {
    if (!conversation) return null;
    return conversation.participants.find(
      (p) => p._id !== session?.user?.id
    );
  };

  const formatTime = (date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffMs = now - messageDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return messageDate.toLocaleDateString();
  };

  const otherUser = getOtherParticipant();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  // Extracted render for chat UI so we can render it both inside the DashboardShell (desktop)
  // and standalone for mobile (where the shell should be hidden).
  const renderChatUI = () => (
    <>
      {/* Hide top navbar only on small screens (mobile) */}
      <style>{`
        @media (max-width: 568px) {
          header nav[aria-label="Global"] {
            display: none !important;
          }
        }
      `}</style>
      
      <div className="pb-14 sm:pb-0 h-screen w-screen fixed inset-0 sm:static sm:h-[calc(100vh-12rem)] sm:w-full flex flex-col bg-zinc-100 dark:bg-zinc-800 sm:rounded-lg sm:overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 p-4 sm:p-6 border-b border-zinc-200 dark:border-zinc-700 bg-white  dark:bg-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/messages")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <Avatar>
            <AvatarImage src={otherUser?.image || "/profile.png"} />
            <AvatarFallback>
              {otherUser?.storename?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
          
          <div>
            <h2 className="text-lg font-semibold">
              {otherUser?.storename}
            </h2>
            {conversation?.product && (
              <p className="text-sm text-muted-foreground">
                About: {conversation.product.title}
              </p>
            )}
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDeleteConversation}
          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
        >
          <Trash2 className="h-5 w-5" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-white dark:bg-zinc-800">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center h-full text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-4" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.sender._id === session?.user?.id;
            return (
              <div
                key={message._id}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[70%] rounded-lg p-3 ${
                    isOwn
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-200 dark:bg-zinc-700 text-gray-900 dark:text-white"
                  }`}
                >
                  <p className="text-sm break-words">{message.content}</p>
                  <div
                    className={`flex items-center justify-end gap-1 mt-1 ${
                      isOwn ? "text-emerald-100" : "text-muted-foreground"
                    }`}
                  >
                    <span className="text-xs">{formatTime(message.createdAt)}</span>
                    {isOwn && (
                      <CheckCheck 
                        className={`h-4 w-4 ${
                          message.read 
                            ? "text-blue-400" 
                            : "text-white/70"
                        }`} 
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 sm:p-6 border-t border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 flex-shrink-0">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
            className="text-sm sm:text-base"
          />
          <Button 
            type="submit" 
            disabled={sending || !newMessage.trim()}
            size="icon"
             variant='success'
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4"/>
            )}
          </Button>
        </form>
      </div>
    </div>
    </>
  );

  return (
    <>
      {/* Mobile: show chat UI standalone */}
      <div className="sm:hidden">{renderChatUI()}</div>

      {/* Desktop: show chat UI inside DashboardShell (hidden on mobile) */}
      <Navbar/>
      <div className="hidden sm:block">
        <DashboardShell>{renderChatUI()}</DashboardShell>
      </div>
    </>
  )
}
