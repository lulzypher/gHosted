import { useQuery, useMutation } from '@tanstack/react-query';
import { Post, PinType } from '@/types';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useIPFSContent } from './use-ipfs';
import { useIPFS } from '@/contexts/IPFSContext';
import { useUser } from '@/contexts/UserContext';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface CreatePostData {
  content: string;
  image?: File;
}

// Hook for post operations
export const usePosts = () => {
  const { user } = useUser();
  const { addContent } = useIPFSContent();
  const { toast } = useToast();
  
  // Get all posts for feed
  const {
    data: posts = [],
    isLoading: isLoadingPosts,
    error: postsError,
    refetch: refetchPosts
  } = useQuery({
    queryKey: ['/api/posts'],
    enabled: !!user
  });
  
  // Create a new post
  const createPostMutation = useMutation({
    mutationFn: async (data: CreatePostData): Promise<Post> => {
      if (!user) throw new Error('User not logged in');
      
      let imageCid;
      
      // If there's an image, upload it to IPFS
      if (data.image) {
        imageCid = await addContent(data.image);
      }
      
      // Upload post content to IPFS
      const contentCid = await addContent(JSON.stringify({
        content: data.content,
        imageCid,
        userId: user.id,
        createdAt: new Date().toISOString()
      }));
      
      // Create post on server
      const response = await apiRequest('POST', '/api/posts', {
        userId: user.id,
        content: data.content,
        imageCid,
        contentCid
      });
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate posts query to refresh the feed
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      
      toast({
        title: "Post Created",
        description: "Your post has been published successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Post Failed",
        description: error instanceof Error ? error.message : "Failed to create post.",
      });
    }
  });
  
  return {
    posts,
    isLoadingPosts,
    postsError,
    refetchPosts,
    createPost: createPostMutation.mutate,
    isCreatingPost: createPostMutation.isPending
  };
};

// Hook for pin operations on posts
export const usePostPins = (post: Post) => {
  const { pinContent, unpinContent, isContentPinned, pinnedContents } = useIPFS();
  const { user, getCurrentDevice, isMobileDevice } = useUser();
  const { toast } = useToast();
  
  const [isLiked, setIsLiked] = useState(false);
  const [isLoved, setIsLoved] = useState(false);
  const [pinnedId, setPinnedId] = useState<number | null>(null);
  
  // Update state based on pinned contents
  useEffect(() => {
    if (!user || !post) return;
    
    const likedPin = pinnedContents.find(
      p => p.contentCid === post.contentCid && p.pinType === PinType.LIKE
    );
    
    const lovedPin = pinnedContents.find(
      p => p.contentCid === post.contentCid && p.pinType === PinType.LOVE
    );
    
    setIsLiked(!!likedPin);
    setIsLoved(!!lovedPin);
    
    // Store the pinned ID for unpinning later
    if (likedPin) {
      setPinnedId(likedPin.id);
    } else if (lovedPin) {
      setPinnedId(lovedPin.id);
    } else {
      setPinnedId(null);
    }
  }, [pinnedContents, post, user]);
  
  // Like a post (pin to PC)
  const likePost = async () => {
    if (!user || !post) return;
    
    try {
      // If already loved, don't do anything
      if (isLoved) {
        toast({
          title: "Already Loved",
          description: "This post is already pinned to all your devices.",
        });
        return;
      }
      
      // If already liked, unlike it
      if (isLiked && pinnedId) {
        await unpinContent(pinnedId, post.contentCid);
        return;
      }
      
      const currentDevice = getCurrentDevice();
      if (!currentDevice) {
        throw new Error('No device registered');
      }
      
      // Only PC devices can "like"
      if (isMobileDevice()) {
        toast({
          title: "PC Feature",
          description: "Like is only available on PC devices. Use Love instead.",
        });
        return;
      }
      
      await pinContent(post.contentCid, post.id, PinType.LIKE, currentDevice.deviceId);
    } catch (error) {
      console.error('Error liking post:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to like post.",
      });
    }
  };
  
  // Love a post (pin to all devices)
  const lovePost = async () => {
    if (!user || !post) return;
    
    try {
      // If already loved, unlike it
      if (isLoved && pinnedId) {
        await unpinContent(pinnedId, post.contentCid);
        return;
      }
      
      // If already liked, unlike it first (to avoid duplicates)
      if (isLiked && pinnedId) {
        await unpinContent(pinnedId, post.contentCid);
      }
      
      await pinContent(post.contentCid, post.id, PinType.LOVE);
    } catch (error) {
      console.error('Error loving post:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to love post.",
      });
    }
  };
  
  return {
    isLiked,
    isLoved,
    likePost,
    lovePost
  };
};
