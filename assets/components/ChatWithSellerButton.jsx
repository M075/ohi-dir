// assets/components/ChatWithSellerButton.jsx
"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MessageSquare, Loader2 } from "lucide-react";
import { toast } from "@/components/hooks/use-toast";

export default function ChatWithSellerButton({ 
  sellerId, 
  productId, 
  storeId,
  productTitle,
  className = "",
  variant = "default",
  size = "default",
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleStartChat = async () => {
    if (!session) {
      toast({
        title: "Sign in required",
        description: "Please sign in to message sellers",
        variant: "destructive",
      });
      router.push("/auth/signin");
      return;
    }

    if (session.user.id === sellerId) {
      toast({
        title: "Cannot message yourself",
        description: "This is your own product/store",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Create or get existing conversation and redirect to it
      const res = await fetch("/api/messages/start-conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: sellerId,
          productId: productId || undefined,
          storeId: storeId || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Redirect to the conversation page
        router.push(`/dashboard/messages/${data.conversationId}`);
      } else {
        throw new Error("Failed to start conversation");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start conversation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleStartChat}
      className={className}
      variant={variant}
      size={size}
      disabled={loading}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Opening chat...
        </>
      ) : (
        <>
          <MessageSquare className="h-4 w-4 mr-2" />
          Chat with Seller
        </>
      )}
    </Button>
  );
}