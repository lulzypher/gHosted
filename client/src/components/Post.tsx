import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, Bookmark, MessageCircle, MoreHorizontal, HeartHandshake, CloudOff, Flame, Share2, Pin, PinOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useSync } from '@/contexts/SyncContext';
import { useIPFS } from '@/contexts/IPFSContext';
import { PinType } from '@/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useToast } from '@/hooks/use-toast';

export interface PostType {
  id: number;
  contentCid?: string;  // From API
  cid?: string;        // Local naming
  authorId?: number;
  userId?: number;     // From API
  authorName?: string;
  authorUsername?: string;
  username?: string;   // From API
  displayName?: string; // From API
  content: string;
  createdAt: string;
  mediaUrl?: string;
  mediaCid?: string;   // From API
  likes?: number;
  comments?: number;   // From API
  commentCount?: number;
  shares?: number;     // From API
  hasConflict?: boolean;
  deleted?: boolean;
  isDeleted?: boolean; // From API
  synced?: boolean;
  isPrivate?: boolean; // From API
}

interface PostCardProps {
  post: PostType;
  onDelete?: (cid: string) => void;
  onPin?: (cid: string, type: 'pc' | 'both' | 'light') => void;
}

export function PostCard({ post, onDelete, onPin }: PostCardProps) {
  const { isOffline } = useSync();
  const { toast } = useToast();
  const { isContentPinned } = useIPFS();
  
  // Normalize post data to handle different field names from API vs local
  const postCid = post.cid || post.contentCid || '';
  const authorId = post.authorId || post.userId || 0;
  const authorName = post.authorName || post.displayName || post.username || 'Unknown User';
  const authorUsername = post.authorUsername || post.username || 'unknown';
  const likes = post.likes || 0;
  const commentCount = post.commentCount || post.comments || 0;
  const mediaUrl = post.mediaUrl || (post.mediaCid ? `https://ipfs.io/ipfs/${post.mediaCid}` : '');
  const isDeleted = post.deleted || post.isDeleted || false;
  const hasMedia = !!mediaUrl || !!post.mediaCid;
  
  // Check if content is pinned to PC and/or mobile or light pinned
  const [isPCPinned, setIsPCPinned] = useState(false);
  const [isBothPinned, setIsBothPinned] = useState(false);
  const [isLightPinned, setIsLightPinned] = useState(false);
  
  // Check pin status on mount and when post changes
  useEffect(() => {
    const checkPinStatus = async () => {
      if (!postCid) return;
      
      try {
        const pcPinned = isContentPinned(postCid, PinType.LOCAL);
        const mobilePinned = isContentPinned(postCid, PinType.LOVE) || 
                            isContentPinned(postCid, PinType.REMOTE);
        const lightPinned = isContentPinned(postCid, PinType.LIGHT);
        
        setIsPCPinned(pcPinned && !mobilePinned && !lightPinned);
        setIsBothPinned(mobilePinned && !lightPinned);
        setIsLightPinned(lightPinned);
      } catch (err) {
        console.error('Error checking pin status:', err);
      }
    };
    
    checkPinStatus();
  }, [postCid, isContentPinned]);
  
  // Don't render deleted posts
  if (isDeleted) return null;
  
  // Don't render if missing critical data
  if (!post.content) {
    console.warn('Post missing content, skipping render:', post);
    return null;
  }
  
  const isLocalOnly = postCid && postCid.startsWith('local-');
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
  
  const handlePin = (type: 'pc' | 'both' | 'light') => {
    if (!onPin || !postCid) return;
    
    onPin(postCid, type);
    
    if (type === 'pc') {
      setIsPCPinned(true);
      setIsBothPinned(false);
      setIsLightPinned(false);
      toast({
        title: "Pinned to PC",
        description: "This content will be preserved on your PC only",
      });
    } else if (type === 'both') {
      setIsPCPinned(false);
      setIsBothPinned(true);
      setIsLightPinned(false);
      toast({
        title: "Pinned to PC & Mobile",
        description: "This content will be preserved on all your devices",
      });
    } else if (type === 'light') {
      setIsPCPinned(false);
      setIsBothPinned(false);
      setIsLightPinned(true);
      toast({
        title: "Light Pinned",
        description: "Post metadata saved, media content will be loaded on demand",
      });
    }
  };
  
  const handleShare = () => {
    // Implement share functionality
    toast({
      title: "Share",
      description: "Sharing functionality will be implemented soon",
    });
  };
  
  const handleDelete = () => {
    if (onDelete && postCid) onDelete(postCid);
  };
  
  return (
    <Card className={`mb-4 
      ${post.hasConflict ? 'border-amber-300 dark:border-amber-800' : ''} 
      ${isLocalOnly ? 'border-blue-300 dark:border-blue-800' : ''}
      ${isPCPinned ? 'border-red-300 dark:border-red-800' : ''}
      ${isBothPinned ? 'border-orange-300 dark:border-orange-800' : ''}
      ${isLightPinned ? 'border-blue-300 dark:border-blue-800' : ''}
    `}>
      <CardHeader className="flex flex-row items-center gap-4 p-4 pb-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src="" alt={authorName} />
          <AvatarFallback>
            {authorName.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="font-semibold">{authorName}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
            @{authorUsername} • {timeAgo}
            
            {isPCPinned && (
              <>
                <span className="mx-1">•</span>
                <span className="text-red-500 dark:text-red-400 inline-flex items-center gap-0.5">
                  <Heart className="h-3 w-3 fill-current" />
                  Pinned to PC
                </span>
              </>
            )}
            
            {isBothPinned && (
              <>
                <span className="mx-1">•</span>
                <span className="text-orange-500 dark:text-orange-400 inline-flex items-center gap-0.5">
                  <div className="relative">
                    <Heart className="h-3 w-3 fill-current" />
                    <Flame className="h-2 w-2 absolute -top-0.5 -right-0.5" />
                  </div>
                  Pinned everywhere
                </span>
              </>
            )}
            
            {isLightPinned && (
              <>
                <span className="mx-1">•</span>
                <span className="text-blue-500 dark:text-blue-400 inline-flex items-center gap-0.5">
                  <Pin className="h-3 w-3" />
                  Light pinned
                </span>
              </>
            )}
            
            {isLocalOnly && (
              <>
                <span className="mx-1">•</span>
                <span className="text-blue-500 dark:text-blue-400 inline-flex items-center gap-0.5">
                  <CloudOff className="h-3 w-3" />
                  Local only
                </span>
              </>
            )}
            
            {post.hasConflict && (
              <span className="ml-1 text-amber-500 dark:text-amber-400 text-xs">• Conflict</span>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">More options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handlePin('pc')} className={isPCPinned ? 'text-red-500' : ''}>
              <div className="flex items-center">
                <Heart className={`h-4 w-4 mr-2 ${isPCPinned ? 'fill-red-500' : ''}`} />
                Pin to PC
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePin('both')} className={isBothPinned ? 'text-orange-500' : ''}>
              <div className="flex items-center">
                <div className="relative mr-2">
                  <Heart className={`h-4 w-4 ${isBothPinned ? 'fill-orange-500' : ''}`} />
                  <Flame className="h-2.5 w-2.5 absolute -top-1 -right-1 text-orange-500" />
                </div>
                Pin to PC & Mobile
              </div>
            </DropdownMenuItem>
            {hasMedia && (
              <DropdownMenuItem onClick={() => handlePin('light')} className={isLightPinned ? 'text-blue-500' : ''}>
                <div className="flex items-center">
                  <Pin className={`h-4 w-4 mr-2 ${isLightPinned ? 'text-blue-500' : ''}`} />
                  Light Pin (metadata only)
                </div>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleShare}>
              <div className="flex items-center">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
              <div className="flex items-center">
                <PinOff className="h-4 w-4 mr-2" />
                Remove
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="p-4 pt-0 pb-3">
        <p className="whitespace-pre-line">{post.content}</p>
        {post.mediaUrl && (
          <div className="mt-3 rounded-md overflow-hidden">
            <img 
              src={post.mediaUrl} 
              alt="Post media"
              className="w-full h-auto object-cover"
            />
          </div>
        )}
      </CardContent>
      <CardFooter className="p-2 flex justify-between border-t">
        <Button variant="ghost" size="sm" className="text-muted-foreground gap-1">
          <MessageCircle className="h-4 w-4" />
          <span>{commentCount}</span>
        </Button>
        
        {/* Heart button with hover menu */}
        <HoverCard openDelay={300} closeDelay={200}>
          <HoverCardTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className={`gap-1 ${
                isPCPinned ? 'text-red-500' : 
                isBothPinned ? 'text-orange-500' : 
                isLightPinned ? 'text-blue-500' : 
                'text-muted-foreground hover:text-red-500'
              }`}
            >
              {isPCPinned && <Heart className="h-4 w-4 fill-current" />}
              {isBothPinned && (
                <div className="relative">
                  <Heart className="h-4 w-4 fill-current" />
                  <Flame className="h-2.5 w-2.5 absolute -top-1 -right-1 text-orange-500" />
                </div>
              )}
              {isLightPinned && <Pin className="h-4 w-4 text-blue-500" />}
              {!isPCPinned && !isBothPinned && !isLightPinned && <Heart className="h-4 w-4" />}
              <span>{likes}</span>
            </Button>
          </HoverCardTrigger>
          <HoverCardContent className="w-64 p-0">
            <div className="grid grid-cols-1 gap-1 p-2">
              <Button 
                variant="ghost" 
                size="sm"
                className={`justify-start ${isPCPinned ? 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400' : ''}`}
                onClick={() => handlePin('pc')}
              >
                <Heart className={`h-4 w-4 mr-2 ${isPCPinned ? 'fill-current' : ''}`} />
                <div className="flex flex-col items-start">
                  <span className="text-sm">Pin to PC</span>
                  <span className="text-xs text-muted-foreground">Preserves content on your PC</span>
                </div>
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm"
                className={`justify-start ${isBothPinned ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400' : ''}`}
                onClick={() => handlePin('both')}
              >
                <div className="relative mr-2">
                  <Heart className={`h-4 w-4 ${isBothPinned ? 'fill-current' : ''}`} />
                  <Flame className={`h-2.5 w-2.5 absolute -top-1 -right-1 ${isBothPinned ? 'text-orange-500' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm">Pin Everywhere</span>
                  <span className="text-xs text-muted-foreground">Saves on PC and mobile devices</span>
                </div>
              </Button>
              
              {hasMedia && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  className={`justify-start ${isLightPinned ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400' : ''}`}
                  onClick={() => handlePin('light')}
                >
                  <Pin className={`h-4 w-4 mr-2 ${isLightPinned ? 'text-blue-500' : ''}`} />
                  <div className="flex flex-col items-start">
                    <span className="text-sm">Light Pin</span>
                    <span className="text-xs text-muted-foreground">Saves post details but not media files</span>
                  </div>
                </Button>
              )}
            </div>
          </HoverCardContent>
        </HoverCard>
        
        {/* Share button */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-muted-foreground gap-1"
          onClick={handleShare}
        >
          <Share2 className="h-4 w-4" />
          <span>Share</span>
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-muted-foreground"
          onClick={() => toast({
            title: "Bookmark",
            description: "Bookmark functionality coming soon",
          })}
        >
          <Bookmark className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}

export function PostSkeleton() {
  return (
    <Card className="mb-4">
      <CardHeader className="flex flex-row items-center gap-4 p-4 pb-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 pb-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </CardContent>
      <CardFooter className="p-2 flex justify-between border-t">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-8" />
      </CardFooter>
    </Card>
  );
}