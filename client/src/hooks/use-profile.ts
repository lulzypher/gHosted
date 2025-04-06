import { useQuery, useMutation } from '@tanstack/react-query';
import { User } from '@/types';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import { useIPFSContent } from './use-ipfs';

interface UpdateProfileData {
  displayName?: string;
  bio?: string;
  avatar?: File;
}

// Hook for profile operations
export const useProfile = (userId?: number) => {
  const { user } = useUser();
  const { toast } = useToast();
  const { addContent } = useIPFSContent();
  
  // Get effective user ID (current user or requested user)
  const effectiveUserId = userId || user?.id;
  
  // Get user profile data
  const {
    data: profile,
    isLoading: isLoadingProfile,
    error: profileError,
    refetch: refetchProfile
  } = useQuery({
    queryKey: [`/api/users/${effectiveUserId}`],
    enabled: !!effectiveUserId
  });
  
  // Get user's posts
  const {
    data: userPosts = [],
    isLoading: isLoadingUserPosts,
    error: userPostsError,
    refetch: refetchUserPosts
  } = useQuery({
    queryKey: [`/api/users/${effectiveUserId}/posts`],
    enabled: !!effectiveUserId
  });
  
  // Update user profile
  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfileData): Promise<User> => {
      if (!user) throw new Error('User not logged in');
      
      let avatarCid = undefined;
      
      // If there's an avatar image, upload it to IPFS
      if (data.avatar) {
        avatarCid = await addContent(data.avatar);
      }
      
      // Update profile on server
      const updateData: any = {};
      if (data.displayName) updateData.displayName = data.displayName;
      if (data.bio) updateData.bio = data.bio;
      if (avatarCid) updateData.avatarCid = avatarCid;
      
      const response = await apiRequest('PATCH', `/api/users/${user.id}`, updateData);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate user query to refresh the profile
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}`] });
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update profile.",
      });
    }
  });
  
  return {
    profile,
    isLoadingProfile,
    profileError,
    refetchProfile,
    userPosts,
    isLoadingUserPosts,
    userPostsError,
    refetchUserPosts,
    updateProfile: updateProfileMutation.mutate,
    isUpdatingProfile: updateProfileMutation.isPending
  };
};
