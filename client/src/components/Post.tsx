import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  Heart, 
  Bookmark, 
  MessageCircle, 
  MoreHorizontal, 
  HeartHandshake, 
  CloudOff, 
  AlertTriangle,
  Check,
  X,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useSync } from '@/contexts/SyncContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  remoteVersion?: PostType;
  conflictId?: string;
}

interface PostCardProps {
  post: PostType;
  onDelete?: (cid: string) => void;
  onPin?: (cid: string, type: 'pc' | 'both') => void;
  onResolveConflict?: (conflictId: string, resolution: 'local' | 'remote') => void;
}

export function PostCard({ post, onDelete, onPin, onResolveConflict }: PostCardProps) {
  const { isOffline } = useSync();
  const { toast } = useToast();
  const [imageError, setImageError] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [resolving, setResolving] = useState(false);
  
  const isLocalOnly = post.cid.startsWith('local-');
  const isLocalMedia = post.mediaUrl?.startsWith('data:') || post.mediaUrl?.startsWith('local-media');
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
  
  const handlePin = (type: 'pc' | 'both') => {
    if (onPin) {
      onPin(post.cid, type);
      toast({
        title: `Content pinned`,
        description: type === 'pc' 
          ? 'Content will be preserved on your PC' 
          : 'Content will be preserved on both PC and mobile',
      });
    }
  };
  
  const handleDelete = () => {
    if (onDelete) onDelete(post.cid);
  };
  
  const handleResolveConflict = async (resolution: 'local' | 'remote') => {
    if (!onResolveConflict || !post.conflictId) return;
    
    try {
      setResolving(true);
      await onResolveConflict(post.conflictId, resolution);
      setShowConflictDialog(false);
      toast({
        title: 'Conflict resolved',
        description: `The ${resolution} version has been kept.`,
      });
    } catch (error) {
      console.error('Error resolving conflict:', error);
      toast({
        title: 'Error',
        description: 'Failed to resolve conflict',
        variant: 'destructive',
      });
    } finally {
      setResolving(false);
    }
  };
  
  return (
    <>
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
            <div className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
              @{post.authorUsername} • {timeAgo}
              
              {isLocalOnly && (
                <Badge variant="outline" className="ml-1 text-xs bg-blue-500/10 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                  <CloudOff className="h-3 w-3 mr-1" />
                  Local only
                </Badge>
              )}
              
              {post.hasConflict && (
                <Badge 
                  variant="outline" 
                  className="ml-1 text-xs bg-amber-500/10 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800 cursor-pointer"
                  onClick={() => setShowConflictDialog(true)}
                >
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Conflict
                </Badge>
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
              
              {post.hasConflict && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowConflictDialog(true)}>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Resolve conflict
                  </DropdownMenuItem>
                </>
              )}
              
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-red-500 dark:text-red-400">
                <X className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        
        <CardContent className="p-4 pt-0 pb-3">
          <p className="whitespace-pre-line">{post.content}</p>
          
          {post.mediaUrl && !imageError && (
            <div className="mt-3 rounded-md overflow-hidden relative">
              <div 
                className="cursor-pointer group relative"
                onClick={() => setShowFullImage(true)}
              >
                <img 
                  src={post.mediaUrl} 
                  alt="Post media"
                  className="w-full h-auto object-cover max-h-96 rounded-md"
                  onError={() => setImageError(true)}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <ExternalLink className="h-6 w-6 text-white drop-shadow-md" />
                </div>
                
                {isLocalMedia && (
                  <div className="absolute bottom-2 right-2">
                    <Badge variant="secondary" className="bg-black/50 text-white border-none text-xs">
                      <CloudOff className="h-3 w-3 mr-1" />
                      Stored locally
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="p-2 flex justify-between border-t">
          <Button variant="ghost" size="sm" className="text-muted-foreground gap-1">
            <MessageCircle className="h-4 w-4" />
            <span>{post.commentCount}</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className={`gap-1 ${post.likes > 0 ? 'text-pink-500' : 'text-muted-foreground'}`} 
            onClick={() => handlePin('pc')}
          >
            <Heart className={`h-4 w-4 ${post.likes > 0 ? 'fill-pink-500' : ''}`} />
            <span>{post.likes}</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-muted-foreground gap-1" 
            onClick={() => handlePin('both')}
          >
            <HeartHandshake className="h-4 w-4" />
            <span>Pin</span>
          </Button>
          
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <Bookmark className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
      
      {/* Full-size image modal */}
      {showFullImage && post.mediaUrl && (
        <Dialog open={showFullImage} onOpenChange={setShowFullImage}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Image from {post.authorName}</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center p-2">
              <img 
                src={post.mediaUrl} 
                alt="Post media full size" 
                className="max-h-[80vh] max-w-full object-contain rounded-md"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Conflict resolution dialog */}
      {post.hasConflict && post.remoteVersion && (
        <Dialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resolve Content Conflict</DialogTitle>
              <DialogDescription>
                This post has a conflict between your local version and a remote version. Choose which version to keep:
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4 my-4">
              {/* Local Version */}
              <div className="border rounded-md p-3 space-y-2">
                <div className="font-medium flex justify-between items-center">
                  <span>Your Local Version</span>
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                    Local
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{post.content}</p>
                {post.mediaUrl && (
                  <img src={post.mediaUrl} alt="Local version" className="w-full h-auto max-h-32 object-cover rounded-md" />
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleResolveConflict('local')}
                  disabled={resolving}
                  className="w-full"
                >
                  {resolving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Resolving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Keep Local
                    </>
                  )}
                </Button>
              </div>
              
              {/* Remote Version */}
              <div className="border rounded-md p-3 space-y-2">
                <div className="font-medium flex justify-between items-center">
                  <span>Remote Version</span>
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800">
                    Remote
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{post.remoteVersion.content}</p>
                {post.remoteVersion.mediaUrl && (
                  <img src={post.remoteVersion.mediaUrl} alt="Remote version" className="w-full h-auto max-h-32 object-cover rounded-md" />
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleResolveConflict('remote')}
                  disabled={resolving}
                  className="w-full"
                >
                  {resolving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Resolving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Keep Remote
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConflictDialog(false)}>
                Decide Later
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
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
        <div className="mt-3">
          <Skeleton className="h-40 w-full rounded-md" />
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