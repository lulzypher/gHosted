import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, Bookmark, MessageCircle, MoreHorizontal, HeartHandshake, CloudOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useSync } from '@/contexts/SyncContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export interface PostType {
  id: number;
  cid: string;
  authorId: number;
  authorName: string;
  authorUsername: string;
  content: string;
  createdAt: string;
  mediaUrl?: string;
  likes: number;
  commentCount: number;
  hasConflict?: boolean;
  deleted?: boolean;
  synced?: boolean;
}

interface PostCardProps {
  post: PostType;
  onDelete?: (cid: string) => void;
  onPin?: (cid: string, type: 'pc' | 'both') => void;
}

export function PostCard({ post, onDelete, onPin }: PostCardProps) {
  const { isOffline } = useSync();
  
  const isLocalOnly = post.cid.startsWith('local-');
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
  
  const handlePin = (type: 'pc' | 'both') => {
    if (onPin) onPin(post.cid, type);
  };
  
  const handleDelete = () => {
    if (onDelete) onDelete(post.cid);
  };
  
  return (
    <Card className={`mb-4 ${post.hasConflict ? 'border-amber-300 dark:border-amber-800' : ''} ${isLocalOnly ? 'border-blue-300 dark:border-blue-800' : ''}`}>
      <CardHeader className="flex flex-row items-center gap-4 p-4 pb-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src="" alt={post.authorName} />
          <AvatarFallback>
            {post.authorName.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="font-semibold">{post.authorName}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            @{post.authorUsername} • {timeAgo}
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
            <DropdownMenuItem onClick={() => handlePin('pc')}>
              <Heart className="h-4 w-4 mr-2" />
              Pin to PC
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePin('both')}>
              <HeartHandshake className="h-4 w-4 mr-2" />
              Pin to PC & Mobile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete}>
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
          <span>{post.commentCount}</span>
        </Button>
        <Button variant="ghost" size="sm" className="text-muted-foreground gap-1" onClick={() => handlePin('pc')}>
          <Heart className="h-4 w-4" />
          <span>{post.likes}</span>
        </Button>
        <Button variant="ghost" size="sm" className="text-muted-foreground gap-1" onClick={() => handlePin('both')}>
          <HeartHandshake className="h-4 w-4" />
          <span>Pin</span>
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