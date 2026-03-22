import React, { useState } from 'react';
import { useDecentralizedFeed } from '@/hooks/use-decentralized-feed';
import { useUser } from '@/contexts/UserContext';
import { addPinnedContent } from '@/lib/orbitdb';
import { PostCard, PostSkeleton } from '@/components/Post';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, RefreshCw, UserPlus, WifiOff } from 'lucide-react';
import { useSync } from '@/contexts/SyncContext';
import { useToast } from '@/hooks/use-toast';
import { PinType } from '@/types';

export function ContentFeed() {
  const { user } = useUser();
  const { posts, loading, deletePost, refreshPosts, follow } = useDecentralizedFeed();
  const [followDialogOpen, setFollowDialogOpen] = useState(false);
  const [followDid, setFollowDid] = useState('');
  const [followLoading, setFollowLoading] = useState(false);
  const { isOffline, triggerSync } = useSync();
  const { toast } = useToast();

  const handleDelete = async (cid: string) => {
    await deletePost(cid);
  };

  const handlePin = async (cid: string, type: 'pc' | 'both' | 'light', postData?: { content?: string; authorDid?: string; mediaCid?: string; createdAt?: string }) => {
    if (!user?.did) return;
    try {
      const pinType = type === 'both' ? PinType.LOVE : type === 'light' ? PinType.LIGHT : PinType.LIKE;
      await addPinnedContent(user.did, {
        id: 0,
        userId: 0,
        contentCid: cid,
        postId: 0,
        pinType,
        pinnedAt: new Date(),
        post: postData ? { content: postData.content, createdAt: postData.createdAt ? new Date(postData.createdAt) : undefined, imageCid: postData.mediaCid, metadata: { authorDid: postData.authorDid } } : undefined,
      });
      toast({
        title: 'Content pinned',
        description: type === 'both' ? 'Preserved on all devices' : type === 'light' ? 'Metadata saved' : 'Preserved on PC',
      });
    } catch (error) {
      console.error('Error pinning content:', error);
      toast({
        title: 'Error',
        description: 'Failed to pin content',
        variant: 'destructive',
      });
    }
  };
  
  const handleFollow = async () => {
    const did = followDid.trim();
    if (!did) {
      toast({ title: 'Enter a DID', variant: 'destructive' });
      return;
    }
    setFollowLoading(true);
    try {
      await follow(did);
      toast({ title: 'Following', description: `Now following ${did.slice(0, 20)}…` });
      setFollowDid('');
      setFollowDialogOpen(false);
    } catch (e) {
      toast({ title: 'Failed to follow', description: String(e), variant: 'destructive' });
    } finally {
      setFollowLoading(false);
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
        <div className="flex gap-1">
          <Dialog open={followDialogOpen} onOpenChange={setFollowDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1">
                <UserPlus className="h-4 w-4" />
                Follow
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Follow by DID</DialogTitle>
                <DialogDescription>Paste someone&apos;s DID to add their posts to your feed.</DialogDescription>
              </DialogHeader>
              <Input
                placeholder="did:key:z6Mk..."
                value={followDid}
                onChange={(e) => setFollowDid(e.target.value)}
                className="mt-2"
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setFollowDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleFollow} disabled={followLoading || !followDid.trim()}>
                  {followLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Follow'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh}
            disabled={loading}
            className="gap-1"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>
      
      {isOffline && (
        <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
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
              key={post.cid || post.contentCid || ''} 
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