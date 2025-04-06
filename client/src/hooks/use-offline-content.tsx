import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSync } from '@/contexts/SyncContext';
import { 
  addLocalPost, 
  getAllPosts, 
  deleteLocalPost, 
  getUnresolvedConflicts, 
  resolveConflict,
  saveMediaContent
} from '@/lib/localStore';
import { PostType } from '@/components/Post';
import { useAuth } from '@/hooks/use-auth';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface UseOfflineContentProps {
  autoSync?: boolean;
  includeDeleted?: boolean;
}

export function useOfflineContent({ 
  autoSync = true, 
  includeDeleted = false 
}: UseOfflineContentProps = {}) {
  const [posts, setPosts] = useState<PostType[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncPending, setSyncPending] = useState(false);
  const { syncStatus, triggerSync, isOnline } = useSync();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Load posts from local storage
  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      const localPosts = await getAllPosts(includeDeleted);
      setPosts(localPosts);
      
      // Also load any pending conflicts
      const pendingConflicts = await getUnresolvedConflicts();
      setConflicts(pendingConflicts);
      
      // Check if there are unsynced posts that need to be synchronized
      const unsyncedPosts = localPosts.filter(post => post.cid.startsWith('local-') || !post.synced);
      setSyncPending(unsyncedPosts.length > 0);
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
  }, [toast, includeDeleted]);

  // Load posts on mount and when sync status changes
  useEffect(() => {
    loadPosts();
  }, [loadPosts, syncStatus.lastSyncTime]);

  // Trigger sync when coming back online if autoSync is enabled
  useEffect(() => {
    if (isOnline && autoSync && !syncStatus.isSyncing && syncPending) {
      triggerSync().catch(console.error);
    }
  }, [isOnline, autoSync, triggerSync, syncStatus.isSyncing, syncPending]);

  // Create a post that works offline
  const createPost = useCallback(
    async (content: string, mediaUrl?: string, mediaBlob?: Blob) => {
      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in to create posts',
          variant: 'destructive',
        });
        return null;
      }

      try {
        // If media is provided as blob, save it to local storage
        let mediaLocalUrl = mediaUrl;
        if (mediaBlob) {
          // Store media locally, get a local URL
          const mediaData = await saveMediaContent(mediaBlob);
          mediaLocalUrl = mediaData.localUrl;
        }

        const newPost = await addLocalPost({
          authorId: user.id,
          authorName: user.displayName,
          authorUsername: user.username,
          content,
          mediaUrl: mediaLocalUrl,
          likes: 0,
          commentCount: 0,
        });

        // Update local state
        setPosts((prev) => [newPost, ...prev]);
        setSyncPending(true);

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
          title: 'Error creating post',
          description: 'Failed to create post. Please try again.',
          variant: 'destructive',
        });
        return null;
      }
    },
    [user, toast, isOnline, autoSync, triggerSync, queryClient]
  );

  // Delete a post (works offline too)
  const deletePost = useCallback(
    async (cid: string) => {
      try {
        await deleteLocalPost(cid);
        
        // Update local state
        setPosts((prev) => prev.filter((post) => post.cid !== cid || includeDeleted));
        setSyncPending(true);
        
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
    [isOnline, autoSync, triggerSync, queryClient, includeDeleted]
  );

  // Resolve a conflict between local and remote versions
  const resolveContentConflict = useCallback(
    async (conflictId: string, resolution: 'local' | 'remote' | 'merged', mergedData?: any) => {
      try {
        await resolveConflict(conflictId, resolution, mergedData);
        
        // Refresh posts and conflicts
        await loadPosts();
        
        toast({
          title: 'Conflict resolved',
          description: 'The content conflict has been successfully resolved',
        });
        
        return true;
      } catch (error) {
        console.error('Error resolving conflict:', error);
        toast({
          title: 'Error',
          description: 'Failed to resolve conflict',
          variant: 'destructive',
        });
        return false;
      }
    },
    [loadPosts, toast]
  );

  // Refresh the posts list
  const refreshPosts = useCallback(async () => {
    await loadPosts();
    if (isOnline && autoSync) {
      await triggerSync();
    }
  }, [loadPosts, isOnline, autoSync, triggerSync]);

  // Get statistics about the offline content
  const stats = useMemo(() => {
    const localOnly = posts.filter(post => post.cid.startsWith('local-')).length;
    const hasConflicts = posts.filter(post => post.hasConflict).length;
    const totalLocal = posts.length;
    
    return {
      localOnly,
      hasConflicts,
      totalLocal,
      pendingSyncCount: syncPending ? localOnly + hasConflicts : 0
    };
  }, [posts, syncPending]);

  return {
    posts,
    conflicts,
    loading,
    createPost,
    deletePost,
    resolveConflict: resolveContentConflict,
    refreshPosts,
    isOffline: !isOnline,
    stats,
    syncPending
  };
}