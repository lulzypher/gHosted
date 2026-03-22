/**
 * Decentralized feed: posts from OrbitDB, per-author feeds, following.
 */

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@/contexts/UserContext";
import { useIPFSContent } from "./use-ipfs";
import { useIPFS } from "@/contexts/IPFSContext";
import {
  addPost,
  getFeedPosts,
  followUser,
  unfollowUser,
  getFollowing,
  type DecentralizedPost,
} from "@/lib/orbitdb";
import type { PostType } from "@/components/Post";

export function useDecentralizedFeed() {
  const { user } = useUser();
  const { addContent } = useIPFSContent();
  const { isIPFSReady } = useIPFS();
  const [posts, setPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState<string[]>([]);
  const [createLoading, setCreateLoading] = useState(false);

  const loadFeed = useCallback(async () => {
    if (!user?.did) {
      setPosts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const followed = await getFollowing(user.did);
      setFollowing(followed);
      const feedPosts = await getFeedPosts(user.did, followed);
      const asPostType: PostType[] = feedPosts.map((p) => ({
        contentCid: p.contentCid,
        cid: p.contentCid,
        authorDid: p.authorDid,
        authorName: undefined,
        authorUsername: undefined,
        content: p.content,
        createdAt: p.createdAt,
        mediaCid: p.mediaCid,
        likes: 0,
        commentCount: 0,
      }));
      setPosts(asPostType);
    } catch (e) {
      console.error("Failed to load feed:", e);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [user?.did]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const createPost = useCallback(
    async (content: string, mediaUrl?: string): Promise<PostType | null> => {
      if (!user?.did) return null;
      setCreateLoading(true);
      try {
        let contentCid: string;
        try {
          contentCid = isIPFSReady ? await addContent(content) : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        } catch {
          contentCid = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        }
        const post: DecentralizedPost = {
          contentCid,
          authorDid: user.did,
          content,
          mediaCid: mediaUrl,
          createdAt: new Date().toISOString(),
        };
        await addPost(user.did, post);
        const asPostType: PostType = {
          contentCid,
          cid: contentCid,
          authorDid: user.did,
          authorName: user.displayName,
          authorUsername: user.username,
          content,
          createdAt: post.createdAt,
          mediaCid: mediaUrl,
          likes: 0,
          commentCount: 0,
        };
        setPosts((prev) => [asPostType, ...prev]);
        return asPostType;
      } catch (e) {
        console.error("Failed to create post:", e);
        throw e;
      } finally {
        setCreateLoading(false);
      }
    },
    [user, isIPFSReady, addContent]
  );

  const deletePost = useCallback(
    async (cid: string): Promise<boolean> => {
      // OrbitDB events are append-only; we'd need tombstone support for "deletes"
      // For now, filter from local state only
      setPosts((prev) => prev.filter((p) => (p.cid || p.contentCid) !== cid));
      return true;
    },
    []
  );

  const refreshPosts = useCallback(async () => {
    await loadFeed();
  }, [loadFeed]);

  const follow = useCallback(
    async (targetDid: string) => {
      if (!user?.did) return;
      await followUser(user.did, targetDid);
      setFollowing((prev) => (prev.includes(targetDid) ? prev : [...prev, targetDid]));
      await loadFeed();
    },
    [user?.did, loadFeed]
  );

  const unfollow = useCallback(
    async (targetDid: string) => {
      if (!user?.did) return;
      await unfollowUser(user.did, targetDid);
      setFollowing((prev) => prev.filter((d) => d !== targetDid));
      await loadFeed();
    },
    [user?.did, loadFeed]
  );

  return {
    posts,
    loading,
    following,
    createPost,
    deletePost,
    refreshPosts,
    follow,
    unfollow,
    isCreating: createLoading,
  };
}
