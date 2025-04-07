import React, { useEffect, useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocket } from "@/contexts/WebSocketContext";

// Helper function to get decrypted message content for display
const getMessageContent = (message: PrivateMessage) => {
  // If we already have plain content (development mode)
  if (message.content) {
    return message.content;
  }
  
  // Try to extract the message from the development mode encrypted content
  if (message.encryptedContent && message.encryptedContent.startsWith('{')) {
    try {
      const jsonData = JSON.parse(message.encryptedContent);
      if (jsonData.mode === 'development') {
        return atob(jsonData.encryptedMessage);
      }
    } catch (error) {
      console.error("Error parsing development mode message", error);
    }
  }
  
  // Fallback
  return "[ Encrypted message ]";
};

// Helper function to get message preview for conversation list
const getMessagePreview = (message: PrivateMessage) => {
  return getMessageContent(message);
};
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  MessageCircle, 
  Send, 
  User,
  UserPlus, 
  Clock, 
  CheckCircle2, 
  CircleCheck, 
  Users, 
  Lock, 
  Shield 
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cryptoService } from "@/lib/cryptography";

type Conversation = {
  id: number;
  conversationId: string;
  createdAt: string;
  participants: ConversationParticipant[];
  lastMessage?: PrivateMessage | null;
  messages?: PrivateMessage[];
};

type ConversationParticipant = {
  userId: number;
  conversationId: string;
  joinedAt: string;
  lastReadAt: string | null;
  username?: string;
  displayName?: string;
  avatarCid?: string;
};

type PrivateMessage = {
  id: number;
  conversationId: string;
  senderId: number;
  recipientId: number;
  content: string;
  encryptedContent?: string;
  encryptionType?: "asymmetric" | "symmetric" | "hybrid";
  encryptionMetadata?: string;
  status: "sent" | "delivered" | "read" | "failed";
  sentAt: string;
  deliveredAt: string | null;
  readAt: string | null;
};

type User = {
  id: number;
  username: string;
  displayName?: string;
  avatarCid?: string;
};

const MessageStatus = ({ status }: { status: string }) => {
  switch (status) {
    case "sent":
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>Sent</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    case "delivered":
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>Delivered</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    case "read":
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <CircleCheck className="h-4 w-4 text-primary" />
            </TooltipTrigger>
            <TooltipContent>Read</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    default:
      return null;
  }
};

const MessageBubble = ({ message, isCurrentUser, otherUser }: { message: PrivateMessage, isCurrentUser: boolean, otherUser: ConversationParticipant }) => {
  return (
    <div className={`flex ${isCurrentUser ? "justify-end" : "justify-start"} mb-2`}>
      <div className="flex items-end">
        {!isCurrentUser && (
          <Avatar className="h-6 w-6 mr-2">
            <AvatarImage src={otherUser.avatarCid ? `https://ipfs.io/ipfs/${otherUser.avatarCid}` : ""} />
            <AvatarFallback>{otherUser.displayName?.charAt(0) || otherUser.username?.charAt(0)}</AvatarFallback>
          </Avatar>
        )}
        
        <div className={`px-4 py-2 rounded-lg ${isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
          <div className="text-sm">{getMessageContent(message)}</div>
        </div>
        
        {isCurrentUser && (
          <div className="ml-2">
            <MessageStatus status={message.status} />
          </div>
        )}
      </div>
    </div>
  );
};

const ConversationList = ({ conversations, activeConversationId, onSelect, currentUserId }: { 
  conversations: Conversation[], 
  activeConversationId: string | null,
  onSelect: (conversation: Conversation) => void,
  currentUserId?: number
}) => {
  if (!conversations || conversations.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-20" />
        <p>No conversations yet</p>
        <p className="text-xs">Start a new conversation by clicking the button above</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conversations.map((conversation) => {
        // Make sure participants exists and is an array
        if (!conversation.participants || !Array.isArray(conversation.participants)) {
          console.error("Invalid conversation format:", conversation);
          return null;
        }

        // Find the other participant (not the current user)
        const otherParticipant = conversation.participants.find(p => p.userId !== currentUserId) || 
          (conversation.participants.length > 0 ? conversation.participants[0] : null);
        
        if (!otherParticipant) {
          console.error("Could not find conversation participant", conversation);
          return null;
        }

        return (
          <div
            key={conversation.conversationId}
            className={`flex items-center p-3 rounded-md cursor-pointer transition-colors ${
              activeConversationId === conversation.conversationId
                ? "bg-muted"
                : "hover:bg-muted/50"
            }`}
            onClick={() => onSelect(conversation)}
          >
            <Avatar className="h-10 w-10 mr-3">
              <AvatarImage src={otherParticipant.avatarCid ? `https://ipfs.io/ipfs/${otherParticipant.avatarCid}` : ""} />
              <AvatarFallback>
                {otherParticipant.displayName?.charAt(0) || 
                 otherParticipant.username?.charAt(0) || 
                 '?'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <p className="font-medium truncate">
                  {otherParticipant.displayName || otherParticipant.username || "User"}
                </p>
                {conversation.lastMessage && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(conversation.lastMessage.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
              
              <p className="text-sm truncate text-muted-foreground">
                {conversation.lastMessage 
                  ? (
                    <>
                      <span className="font-medium mr-1">
                        {conversation.lastMessage.senderId === currentUserId ? 'You:' : 'User:'}
                      </span>
                      {getMessagePreview(conversation.lastMessage)}
                    </>
                  )
                  : "No messages yet"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const NewConversationDialog = ({ isOpen, onClose, onStart }: {
  isOpen: boolean;
  onClose: () => void;
  onStart: (userId: number) => void;
}) => {
  const [username, setUsername] = useState("");
  const { toast } = useToast();
  
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["/api/users/search", username],
    queryFn: async () => {
      if (!username || username.length < 2) return [];
      const response = await apiRequest("GET", `/api/users/search?q=${encodeURIComponent(username)}`);
      return await response.json();
    },
    enabled: username.length >= 2
  });
  
  const handleStartConversation = (userId: number) => {
    onStart(userId);
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
          <DialogDescription>
            Search for a user to start a new encrypted conversation.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Search by username..."
              value={username}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
            />
          </div>
          
          <ScrollArea className="h-72">
            <div className="space-y-2">
              {isLoading && username.length >= 2 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <p>Searching...</p>
                </div>
              ) : searchResults && searchResults.length > 0 ? (
                searchResults.map((user: User) => (
                  <div
                    key={user.id}
                    className="flex items-center p-2 rounded-md hover:bg-muted cursor-pointer"
                    onClick={() => handleStartConversation(user.id)}
                  >
                    <Avatar className="h-10 w-10 mr-3">
                      <AvatarImage src={user.avatarCid ? `https://ipfs.io/ipfs/${user.avatarCid}` : ""} />
                      <AvatarFallback>{user.displayName?.charAt(0) || user.username.charAt(0)}</AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <p className="font-medium">{user.displayName || user.username}</p>
                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                    </div>
                  </div>
                ))
              ) : username.length >= 2 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <p>No users found</p>
                </div>
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  <p>Type at least 2 characters to search</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const MessagingPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addMessageListener } = useWebSocket(); // Use our WebSocketContext
  const queryClient = useQueryClient();
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [showNewConversation, setShowNewConversation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Load user's conversations
  const { data: conversations, isLoading: isLoadingConversations } = useQuery({
    queryKey: ["/api/conversations"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/conversations");
      return await response.json();
    },
    enabled: !!user
  });
  
  // Load active conversation messages when selected
  const { data: activeConversationData, isLoading: isLoadingMessages } = useQuery({
    queryKey: ["/api/conversations", activeConversation?.conversationId],
    queryFn: async () => {
      if (!activeConversation) return null;
      const response = await apiRequest("GET", `/api/conversations/${activeConversation.conversationId}`);
      return await response.json();
    },
    enabled: !!activeConversation && !!user
  });
  
  // Sending a new message
  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string, content: string }) => {
      // Get recipient information from conversation data
      if (!activeConversationData) {
        throw new Error("Cannot send message - no active conversation");
      }
      
      // Find the recipient (the participant who is not the current user)
      const recipient = activeConversationData.participants?.find((p: ConversationParticipant) => p.userId !== user?.id);
      if (!recipient) {
        throw new Error("Cannot find recipient user");
      }
      
      // Development mode messaging (simplified)
      console.log("Using development mode encryption");
      
      // In development mode, we'll just send the plain content
      // The server will handle the dummy encryption values
      const response = await apiRequest("POST", `/api/conversations/${conversationId}/messages`, {
        content, // In development mode, we send plain content and server handles the rest
        status: "sent"
      });
      
      return await response.json();
    },
    onSuccess: (data) => {
      // Update conversations cache
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", activeConversation?.conversationId] });
      
      // Clear the input
      setNewMessage("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Mark messages as read
  const markAsReadMutation = useMutation({
    mutationFn: async ({ messageId }: { messageId: number }) => {
      const response = await apiRequest("PUT", `/api/messages/${messageId}/read`);
      return await response.json();
    },
    onSuccess: () => {
      // Update message cache
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", activeConversation?.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread"] });
    }
  });
  
  // Start a new conversation
  const startConversationMutation = useMutation({
    mutationFn: async (otherUserId: number) => {
      const response = await apiRequest("POST", "/api/conversations", { otherUserId });
      return await response.json();
    },
    onSuccess: (data) => {
      // Update conversations list
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      
      // Set the new conversation as active
      setActiveConversation(data);
      
      toast({
        title: "Conversation started",
        description: "You can now send encrypted messages."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start conversation",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Setup WebSocket message listener for real-time updates using WebSocketContext
  useEffect(() => {
    if (!user) return;

    // Register a message listener with our WebSocketContext
    const unsubscribe = addMessageListener((data) => {
      try {
        // Handle different message types - server sends "NEW_MESSAGE" (uppercase)
        if (data.type === "NEW_MESSAGE" && data.data?.message) {
          console.log("Received real-time message:", data);
          
          // Invalidate queries to refresh conversation data
          queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
          
          // If this message is for the active conversation, also update that
          if (activeConversation && data.data.message.conversationId === activeConversation.conversationId) {
            queryClient.invalidateQueries({ 
              queryKey: ["/api/conversations", activeConversation.conversationId] 
            });
          }
          
          // Show a toast notification for new messages if not in the current conversation
          if (data.data.message.conversationId !== activeConversation?.conversationId) {
            // Find the sender's info
            toast({
              title: "New Message",
              description: "You received a new message",
              variant: "default",
            });
          }
        }
      } catch (error) {
        console.error("Error handling WebSocket message:", error);
      }
    });
    
    // Clean up on unmount
    return unsubscribe;
  }, [user, queryClient, activeConversation, addMessageListener, toast]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeConversationData?.messages]);
  
  // Mark received messages as read when viewing a conversation
  useEffect(() => {
    if (activeConversationData?.messages && user) {
      // Find messages that are from the other person and not read yet
      const unreadMessages = activeConversationData.messages.filter(
        (message: PrivateMessage) => message.recipientId === user.id && message.status !== "read"
      );
      
      // Mark each as read
      unreadMessages.forEach((message: PrivateMessage) => {
        markAsReadMutation.mutate({ messageId: message.id });
      });
    }
  }, [activeConversationData?.messages, user]);
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !activeConversation) {
      return;
    }
    
    sendMessageMutation.mutate({
      conversationId: activeConversation.conversationId,
      content: newMessage.trim()
    });
  };
  
  const handleStartConversation = (userId: number) => {
    startConversationMutation.mutate(userId);
  };
  
  // Find the other participant (not the current user)
  // First check if we have the active conversation data from the API
  const otherParticipant = (() => {
    // If we have conversation data from API, use that
    if (activeConversationData?.participants) {
      // Try to find the other user (not the current user)
      const other = activeConversationData.participants.find(
        (p: ConversationParticipant) => p.userId !== user?.id
      );
      
      // If found, return it
      if (other) return other;
      
      // If not found but we have participants, use the first one
      if (activeConversationData.participants.length > 0) {
        return activeConversationData.participants[0];
      }
    }
    
    // If API data not loaded yet but we have the selected conversation object
    // Try to get the other participant from the selected conversation data
    if (activeConversation?.participants) {
      const other = activeConversation.participants.find(
        (p: ConversationParticipant) => p.userId !== user?.id
      );
      
      if (other) return other;
      
      if (activeConversation.participants.length > 0) {
        return activeConversation.participants[0];
      }
    }
    
    // No participant found
    return null;
  })();

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
        {/* Left sidebar - Conversations List */}
        <div className="col-span-1 bg-card border rounded-lg shadow overflow-hidden flex flex-col">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-xl font-semibold flex items-center">
              <MessageCircle className="h-5 w-5 mr-2" /> Messages
            </h2>
            
            <Button size="sm" variant="outline" onClick={() => setShowNewConversation(true)}>
              <UserPlus className="h-4 w-4 mr-2" /> New
            </Button>
          </div>
          
          <ScrollArea className="flex-1">
            {isLoadingConversations ? (
              <div className="p-4 text-center text-muted-foreground">
                <p>Loading conversations...</p>
              </div>
            ) : (
              <ConversationList 
                conversations={conversations || []} 
                activeConversationId={activeConversation?.conversationId || null}
                onSelect={setActiveConversation} 
                currentUserId={user?.id}
              />
            )}
          </ScrollArea>
        </div>
        
        {/* Right area - Messages */}
        <div className="col-span-2 bg-card border rounded-lg shadow overflow-hidden flex flex-col">
          {activeConversation ? (
            <>
              {/* Conversation header */}
              <div className="p-4 border-b flex justify-between items-center">
                <div className="flex items-center">
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage 
                      src={otherParticipant?.avatarCid ? `https://ipfs.io/ipfs/${otherParticipant.avatarCid}` : ""} 
                    />
                    <AvatarFallback>
                      {otherParticipant?.displayName?.charAt(0) || otherParticipant?.username?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <h3 className="font-medium">
                      {isLoadingMessages 
                        ? "Loading..." 
                        : (otherParticipant?.displayName || otherParticipant?.username || "Chat")}
                    </h3>
                    <div className="flex items-center text-xs text-primary">
                      <Lock className="h-3 w-3 mr-1" /> End-to-end encrypted
                    </div>
                  </div>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="24" 
                        height="24" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        className="h-5 w-5"
                      >
                        <circle cx="12" cy="12" r="1" />
                        <circle cx="12" cy="5" r="1" />
                        <circle cx="12" cy="19" r="1" />
                      </svg>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Options</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <User className="h-4 w-4 mr-2" /> View Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Shield className="h-4 w-4 mr-2" /> Verify Keys
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              {/* Messages area */}
              <ScrollArea className="flex-1 p-4">
                {isLoadingMessages ? (
                  <div className="text-center text-muted-foreground py-4">
                    <p>Loading messages...</p>
                  </div>
                ) : activeConversationData?.messages && activeConversationData.messages.length > 0 ? (
                  <div className="space-y-4">
                    {/* Sort messages by timestamp, oldest first */}
                    {[...(activeConversationData.messages || [])]
                      .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime())
                      .map((message: PrivateMessage) => (
                        <MessageBubble 
                          key={message.id} 
                          message={message} 
                          isCurrentUser={message.senderId === user?.id}
                          otherUser={otherParticipant ? {
                            ...otherParticipant,
                            // Make sure we have username and displayName
                            username: otherParticipant.username || 'User',
                            displayName: otherParticipant.displayName || otherParticipant.username || 'User'
                          } : {
                            userId: 0,
                            conversationId: activeConversation.conversationId,
                            joinedAt: new Date().toISOString(),
                            lastReadAt: null,
                            username: "User", 
                            displayName: "User" // Changed from "Unknown User" for better UX
                          }}
                        />
                      ))
                    }
                    <div ref={messagesEndRef} />
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-12">
                    <Lock className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium">End-to-end Encrypted Chat</p>
                    <p className="text-sm max-w-md mx-auto mt-2">
                      Messages are encrypted using advanced cryptography. Only you and the recipient can read them.
                    </p>
                  </div>
                )}
              </ScrollArea>
              
              {/* Message input */}
              <div className="p-4 border-t">
                <form onSubmit={handleSendMessage} className="flex space-x-2">
                  <Input
                    value={newMessage}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1"
                  />
                  <Button 
                    type="submit" 
                    disabled={!newMessage.trim() || sendMessageMutation.isPending}
                  >
                    {sendMessageMutation.isPending ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                <h3 className="text-xl font-medium mb-2">Your Messages</h3>
                <p className="text-muted-foreground mb-4 max-w-md">
                  Select a conversation or start a new encrypted chat with another user.
                </p>
                <Button onClick={() => setShowNewConversation(true)}>
                  <UserPlus className="h-4 w-4 mr-2" /> Start a New Conversation
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <NewConversationDialog 
        isOpen={showNewConversation}
        onClose={() => setShowNewConversation(false)}
        onStart={handleStartConversation}
      />
    </div>
  );
};

export default MessagingPage;