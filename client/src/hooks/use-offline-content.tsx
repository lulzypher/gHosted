import { useState, useEffect, useCallback } from 'react';
import { useSync } from '@/contexts/SyncContext';
import { addLocalPost, getAllPosts, deleteLocalPost } from '@/lib/localStore';
import { PostType } from '@/components/Post';
import { useAuth } from '@/hooks/use-auth';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface UseOfflineContentProps {
  autoSync?: boolean;
}

export function useOfflineContent({ autoSync = true }: UseOfflineContentProps = {}) {
  const [posts, setPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(true);
  const { syncStatus, triggerSync, isOnline } = useSync();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Load posts from local storage
  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      const localPosts = await getAllPosts();
      setPosts(localPosts);
    } catch (error) {
      console.error('Error loading posts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load local posts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Load posts on mount and when sync status changes
  useEffect(() => {
    loadPosts();
  }, [loadPosts, syncStatus.lastSyncTime]);

  // Trigger sync when coming back online if autoSync is enabled
  useEffect(() => {
    if (isOnline && autoSync && !syncStatus.isSyncing) {
      triggerSync().catch(console.error);
    }
  }, [isOnline, autoSync, triggerSync, syncStatus.isSyncing]);

  // Create a post that works offline
  const createPost = useCallback(
    async (content: string, mediaUrl?: string) => {
      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in to create posts',
          variant: 'destructive',
        });
        return null;
      }

      try {
        const newPost = await addLocalPost({
          authorId: user.id,
          authorName: user.displayName,
          authorUsername: user.username,
          content,
          mediaUrl,
          likes: 0,
          commentCount: 0,
        });

        // Update local state
        setPosts((prev) => [newPost, ...prev]);

        // Show different toast based on connection status
        toast({
          title: isOnline ? 'Post created' : 'Post saved locally',
          description: isOnline
            ? 'Your post has been created and will be synced'
            : 'Your post will be synced when you go online',
          variant: 'default',
        });

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['/api/posts'] });

        // If online, trigger a sync
        if (isOnline && autoSync) {
          triggerSync().catch(console.error);
        }

        return newPost;
      } catch (error) {
        console.error('Error creating post:', error);
        toast({
          title: 'Error',
          description: 'Failed to create post',
          variant: 'destructive',
        });
        return null;
      }
    },
    [user, isOnline, autoSync, triggerSync, toast, queryClient]
  );

  // Delete a post (works offline)
  const deletePost = useCallback(
    async (cid: string) => {
      try {
        await deleteLocalPost(cid);
        
        // Update local state
        setPosts((prev) => prev.filter((post) => post.cid !== cid));

        // Show different toast based on connection status
        toast({
          title: isOnline ? 'Post deleted' : 'Post marked for deletion',
          description: isOnline
            ? 'Your post has been deleted'
            : 'The post will be removed from the server when you go online',
          variant: 'default',
        });

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['/api/posts'] });

        // If online, trigger a sync
        if (isOnline && autoSync) {
          triggerSync().catch(console.error);
        }

        return true;
      } catch (error) {
        console.error('Error deleting post:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete post',
          variant: 'destructive',
        });
        return false;
      }
    },
    [isOnline, autoSync, triggerSync, toast, queryClient]
  );

  // Refresh the posts list
  const refreshPosts = useCallback(async () => {
    await loadPosts();
    if (isOnline && autoSync) {
      await triggerSync();
    }
  }, [loadPosts, isOnline, autoSync, triggerSync]);

  return {
    posts,
    loading,
    createPost,
    deletePost,
    refreshPosts,
    isOffline: !isOnline,
  };
}