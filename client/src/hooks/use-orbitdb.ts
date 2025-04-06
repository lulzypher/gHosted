import { useState, useCallback, useEffect } from 'react';
import { useOrbitDB } from '@/contexts/OrbitDBContext';
import { Post, User, PinnedContent } from '@/types';
import { addPost, getAllPosts, addUser, getUser, updateProfile, getProfile, addPinnedContent, removePinnedContent, getAllPinnedContent } from '@/lib/orbitdb';
import { useUser } from '@/contexts/UserContext';

interface UseOrbitDBResult {
  loading: boolean;
  error: string | null;
  addPost: (post: Post) => Promise<string>;
  getPosts: () => Promise<Post[]>;
  addUser: (user: User) => Promise<void>;
  getUser: (userId: string) => Promise<User | null>;
  updateProfile: (profile: any) => Promise<string>;
  getProfile: (profileDid: string) => Promise<any | null>;
  addPinnedContent: (pinnedContent: PinnedContent) => Promise<string>;
  removePinnedContent: (contentCid: string) => Promise<string>;
  getPinnedContents: () => Promise<PinnedContent[]>;
}

export const useOrbitDBOperations = (): UseOrbitDBResult => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { isOrbitDBReady } = useOrbitDB();
  const { user } = useUser();

  // Reset error when OrbitDB ready state changes
  useEffect(() => {
    if (isOrbitDBReady) {
      setError(null);
    }
  }, [isOrbitDBReady]);

  // Add a post to OrbitDB
  const addPostToOrbit = useCallback(async (post: Post): Promise<string> => {
    if (!isOrbitDBReady || !user) {
      throw new Error('OrbitDB is not ready or user is not logged in');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const hash = await addPost(user.did, post);
      return hash;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error adding post to OrbitDB';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isOrbitDBReady, user]);

  // Get all posts from OrbitDB
  const getPosts = useCallback(async (): Promise<Post[]> => {
    if (!isOrbitDBReady || !user) {
      throw new Error('OrbitDB is not ready or user is not logged in');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const posts = await getAllPosts(user.did);
      return posts;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error getting posts from OrbitDB';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isOrbitDBReady, user]);

  // Add a user to OrbitDB
  const addUserToOrbit = useCallback(async (userData: User): Promise<void> => {
    if (!isOrbitDBReady || !user) {
      throw new Error('OrbitDB is not ready or user is not logged in');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await addUser(user.did, userData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error adding user to OrbitDB';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isOrbitDBReady, user]);

  // Get a user from OrbitDB
  const getUserFromOrbit = useCallback(async (userId: string): Promise<User | null> => {
    if (!isOrbitDBReady || !user) {
      throw new Error('OrbitDB is not ready or user is not logged in');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const userData = await getUser(user.did, userId);
      return userData;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error getting user from OrbitDB';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isOrbitDBReady, user]);

  // Update profile in OrbitDB
  const updateProfileInOrbit = useCallback(async (profile: any): Promise<string> => {
    if (!isOrbitDBReady || !user) {
      throw new Error('OrbitDB is not ready or user is not logged in');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const hash = await updateProfile(user.did, profile);
      return hash;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error updating profile in OrbitDB';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isOrbitDBReady, user]);

  // Get profile from OrbitDB
  const getProfileFromOrbit = useCallback(async (profileDid: string): Promise<any | null> => {
    if (!isOrbitDBReady || !user) {
      throw new Error('OrbitDB is not ready or user is not logged in');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const profile = await getProfile(user.did, profileDid);
      return profile;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error getting profile from OrbitDB';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isOrbitDBReady, user]);

  // Add pinned content to OrbitDB
  const addPinnedContentToOrbit = useCallback(async (pinnedContent: PinnedContent): Promise<string> => {
    if (!isOrbitDBReady || !user) {
      throw new Error('OrbitDB is not ready or user is not logged in');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const hash = await addPinnedContent(user.did, pinnedContent);
      return hash;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error adding pinned content to OrbitDB';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isOrbitDBReady, user]);

  // Remove pinned content from OrbitDB
  const removePinnedContentFromOrbit = useCallback(async (contentCid: string): Promise<string> => {
    if (!isOrbitDBReady || !user) {
      throw new Error('OrbitDB is not ready or user is not logged in');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const hash = await removePinnedContent(user.did, contentCid);
      return hash;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error removing pinned content from OrbitDB';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isOrbitDBReady, user]);

  // Get all pinned content from OrbitDB
  const getPinnedContentsFromOrbit = useCallback(async (): Promise<PinnedContent[]> => {
    if (!isOrbitDBReady || !user) {
      throw new Error('OrbitDB is not ready or user is not logged in');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const pinnedContents = await getAllPinnedContent(user.did);
      return pinnedContents;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error getting pinned contents from OrbitDB';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isOrbitDBReady, user]);

  return {
    loading,
    error,
    addPost: addPostToOrbit,
    getPosts,
    addUser: addUserToOrbit,
    getUser: getUserFromOrbit,
    updateProfile: updateProfileInOrbit,
    getProfile: getProfileFromOrbit,
    addPinnedContent: addPinnedContentToOrbit,
    removePinnedContent: removePinnedContentFromOrbit,
    getPinnedContents: getPinnedContentsFromOrbit
  };
};
