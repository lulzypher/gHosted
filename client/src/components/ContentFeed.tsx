import React, { useState } from 'react';
import { useOfflineContent } from '@/hooks/use-offline-content';
import { PostCard, PostSkeleton } from '@/components/Post';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  RefreshCw, 
  WifiOff, 
  AlertTriangle, 
  Filter,
  CloudOff
} from 'lucide-react';
import { useSync } from '@/contexts/SyncContext';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export function ContentFeed() {
  const { 
    posts, 
    conflicts, 
    loading, 
    stats,
    syncPending,
    deletePost, 
    refreshPosts,
    resolveConflict
  } = useOfflineContent({ includeDeleted: false });
  
  const { isOffline, triggerSync, isSyncing } = useSync();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Filter state
  const [showingLocalOnly, setShowingLocalOnly] = useState(false);
  const [showingConflictsOnly, setShowingConflictsOnly] = useState(false);
  
  // Apply filters
  const filteredPosts = posts.filter(post => {
    if (showingLocalOnly && !post.cid.startsWith('local-')) {
      return false;
    }
    if (showingConflictsOnly && !post.hasConflict) {
      return false;
    }
    return true;
  });
  
  const handleDelete = async (cid: string) => {
    await deletePost(cid);
    toast({
      title: 'Post deleted',
      description: isOffline 
        ? 'Post marked for deletion and will be removed when you reconnect' 
        : 'Post has been deleted',
    });
  };
  
  const handlePin = async (cid: string, type: 'pc' | 'both') => {
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
  
  const handleResolveConflict = async (conflictId: string, resolution: 'local' | 'remote') => {
    return await resolveConflict(conflictId, resolution);
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
      
      toast({
        title: 'Feed refreshed',
        description: 'Your content feed has been updated',
      });
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
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">Feed</h2>
          
          {/* Status badges */}
          <div className="flex items-center gap-2">
            {stats?.localOnly > 0 && (
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                <CloudOff className="h-3 w-3 mr-1" />
                {stats.localOnly} local
              </Badge>
            )}
            
            {stats?.hasConflicts > 0 && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {stats.hasConflicts} conflicts
              </Badge>
            )}
            
            {syncPending && (
              <Badge variant="outline" className="animate-pulse bg-green-500/10 text-green-600 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800">
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Sync pending
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Filter dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className={`flex items-center gap-1 ${showingLocalOnly || showingConflictsOnly ? 'bg-blue-500/10 border-blue-200 dark:border-blue-800' : ''}`}
              >
                <Filter className="h-4 w-4" />
                <span>Filter</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowingLocalOnly(!showingLocalOnly)}>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={showingLocalOnly}
                    onChange={() => {}}
                    className="rounded border-gray-300"
                  />
                  <CloudOff className="h-4 w-4 mr-1" />
                  Show local only
                </div>
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => setShowingConflictsOnly(!showingConflictsOnly)}>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={showingConflictsOnly}
                    onChange={() => {}}
                    className="rounded border-gray-300"
                  />
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Show conflicts only
                </div>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => {
                setShowingLocalOnly(false);
                setShowingConflictsOnly(false);
              }}>
                Reset filters
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Refresh button */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh}
            disabled={loading || isSyncing}
            className="flex items-center gap-1"
          >
            {loading || isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>
      
      {/* Offline alert */}
      {isOffline && (
        <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
          <WifiOff className="h-4 w-4" />
          <AlertTitle>You're offline</AlertTitle>
          <AlertDescription>
            You're viewing content that's available locally on your device. New content will be synchronized when you reconnect.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Conflict alert */}
      {stats?.hasConflicts > 0 && (
        <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Content conflicts detected</AlertTitle>
          <AlertDescription>
            {stats.hasConflicts} post{stats.hasConflicts !== 1 ? 's' : ''} {stats.hasConflicts !== 1 ? 'have' : 'has'} conflicts between your local version and a remote version. 
            Click the conflict badge on each post to review and resolve them.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Content display */}
      {loading ? (
        <div className="space-y-4">
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </div>
      ) : filteredPosts.length > 0 ? (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <PostCard 
              key={post.cid} 
              post={post}
              onDelete={handleDelete}
              onPin={handlePin}
              onResolveConflict={handleResolveConflict}
            />
          ))}
        </div>
      ) : (
        <div className="p-8 text-center border rounded-lg">
          <h3 className="font-medium mb-2">No posts to show</h3>
          <p className="text-muted-foreground text-sm mb-4">
            {showingLocalOnly 
              ? "You don't have any local-only content."
              : showingConflictsOnly
                ? "You don't have any content with conflicts."
                : isOffline 
                  ? "You don't have any content stored locally."
                  : "Your feed is empty. Follow users or create a post to get started."}
          </p>
          
          {(showingLocalOnly || showingConflictsOnly) && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setShowingLocalOnly(false);
                setShowingConflictsOnly(false);
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}