import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, Bookmark, MessageCircle, MoreHorizontal, HeartHandshake, CloudOff, Flame } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useSync } from '@/contexts/SyncContext';
import { useIPFS } from '@/contexts/IPFSContext';
import { PinType } from '@/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
  onPin?: (cid: string, type: 'pc' | 'both') => void;
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
  
  // Check if content is pinned to PC and/or mobile
  const [isPCPinned, setIsPCPinned] = useState(false);
  const [isBothPinned, setIsBothPinned] = useState(false);
  
  // Check pin status on mount and when post changes
  useEffect(() => {
    const checkPinStatus = async () => {
      if (!postCid) return;
      
      try {
        const pcPinned = isContentPinned(postCid, PinType.LOCAL);
        const mobilePinned = isContentPinned(postCid, PinType.LOVE) || 
                            isContentPinned(postCid, PinType.REMOTE);
        
        setIsPCPinned(pcPinned && !mobilePinned);
        setIsBothPinned(mobilePinned);
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
  
  const handlePin = (type: 'pc' | 'both') => {
    if (!onPin || !postCid) return;
    
    onPin(postCid, type);
    
    if (type === 'pc') {
      setIsPCPinned(true);
      setIsBothPinned(false);
      toast({
        title: "Pinned to PC",
        description: "This content will be preserved on your PC only",
      });
    } else {
      setIsPCPinned(false);
      setIsBothPinned(true);
      toast({
        title: "Pinned to PC & Mobile",
        description: "This content will be preserved on all your devices",
      });
    }
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
            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
              Delete
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
        <Button 
          variant="ghost" 
          size="sm" 
          className={`gap-1 ${isPCPinned ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'}`} 
          onClick={() => handlePin('pc')}
        >
          <Heart className={`h-4 w-4 ${isPCPinned ? 'fill-current' : ''}`} />
          <span>{likes}</span>
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`gap-1 ${isBothPinned ? 'text-orange-500' : 'text-muted-foreground hover:text-orange-500'}`} 
          onClick={() => handlePin('both')}
        >
          <div className="relative">
            <Heart className={`h-4 w-4 ${isBothPinned ? 'fill-current' : ''}`} />
            <Flame className="h-2.5 w-2.5 absolute -top-1 -right-1 text-orange-500" />
          </div>
          <span>Both</span>
        </Button>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
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