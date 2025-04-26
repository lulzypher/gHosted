import React from 'react';
import { useOfflineContent } from '@/hooks/use-offline-content';
import { PostCard, PostSkeleton } from '@/components/Post';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, WifiOff } from 'lucide-react';
import { useSync } from '@/contexts/SyncContext';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export function ContentFeed() {
  const { posts, loading, createPost, deletePost, refreshPosts } = useOfflineContent();
  const { isOffline, triggerSync } = useSync();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const handleDelete = async (cid: string) => {
    await deletePost(cid);
  };
  
  const handlePin = async (cid: string, type: 'pc' | 'both' | 'light') => {
    try {
      // Make API call to pin content
      await fetch(`/api/pinned-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cid,
          type,
        }),
      });
      
      let message = '';
      
      switch(type) {
        case 'pc':
          message = 'Content will be preserved on your PC';
          break;
        case 'both':
          message = 'Content will be preserved on both PC and mobile';
          break;
        case 'light':
          message = 'Post metadata saved without large media files';
          break;
      }
      
      toast({
        title: `Content pinned`,
        description: message,
      });
      
      // Refresh posts to update UI
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
    } catch (error) {
      console.error('Error pinning content:', error);
      toast({
        title: 'Error',
        description: 'Failed to pin content',
        variant: 'destructive',
      });
    }
  };
  
  const handleRefresh = async () => {
    if (isOffline) {
      toast({
        title: 'Offline mode',
        description: 'You can only view local content while offline',
      });
      return;
    }
    
    try {
      await refreshPosts();
      await triggerSync();
    } catch (error) {
      console.error('Error refreshing feed:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh feed',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Feed</h2>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-1"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>
      
      {isOffline && (
        <Alert variant="warning" className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
          <WifiOff className="h-4 w-4" />
          <AlertTitle>You're offline</AlertTitle>
          <AlertDescription>
            You're viewing content that's available locally on your device. New content will be synchronized when you reconnect.
          </AlertDescription>
        </Alert>
      )}
      
      {loading ? (
        <div className="space-y-4">
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </div>
      ) : posts.length > 0 ? (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard 
              key={post.cid} 
              post={post} 
              onDelete={handleDelete}
              onPin={handlePin}
            />
          ))}
        </div>
      ) : (
        <div className="p-8 text-center border rounded-lg">
          <h3 className="font-medium mb-2">No posts to show</h3>
          <p className="text-muted-foreground text-sm mb-4">
            {isOffline 
              ? "You don't have any content stored locally."
              : "Your feed is empty. Follow users or create a post to get started."}
          </p>
        </div>
      )}
    </div>
  );
}