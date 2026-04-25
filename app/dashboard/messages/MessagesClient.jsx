// app/dashboard/messages/MessagesClient.jsx
"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare } from "lucide-react";
import { toast } from "@/components/hooks/use-toast";
import DashboardShell from "@/assets/components/DashboardShell";

export default function MessagesClient() {
  const { data: session } = useSession();
  const router = useRouter();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch conversations
  useEffect(() => {
    if (session?.user?.id) {
      fetchConversations();
    }
  }, [session]);

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/messages");
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConversation = (conversationId) => {
    router.push(`/dashboard/messages/${conversationId}`);
  };

  const getOtherParticipant = (conversation) => {
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

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Messages</h2>
          <Badge variant="secondary">{conversations.length}</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loading && conversations.length === 0 ? (
                <div className="col-span-full flex justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="col-span-full p-8 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No conversations yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Start chatting with sellers from product pages
                  </p>
                </div>
              ) : (
                conversations.map((conversation) => {
                  const otherUser = getOtherParticipant(conversation);
                  return (
                    <div
                      key={conversation._id}
                      onClick={() => handleSelectConversation(conversation._id)}
                      className="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:shadow-md dark:hover:shadow-lg transition-all cursor-pointer border border-transparent hover:border-emerald-500 dark:hover:border-emerald-600"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar>
                          <AvatarImage src={otherUser?.image || "/profile.png"} />
                          <AvatarFallback>
                            {otherUser?.storename?.[0] || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium truncate">
                              {otherUser?.storename}
                            </p>
                            {conversation.unreadCount > 0 && (
                              <Badge
                                variant="destructive"
                                className="rounded-full h-5 w-5 flex items-center justify-center p-0 text-xs flex-shrink-0"
                              >
                                {conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(conversation.lastMessage?.timestamp)}
                          </p>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {conversation.lastMessage?.content || "No messages yet"}
                      </p>
                      
                      {conversation.product && (
                        <p className="text-xs text-muted-foreground truncate mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                          Re: {conversation.product.title}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
        </div>
    </DashboardShell> 
  );
}
