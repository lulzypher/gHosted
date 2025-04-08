import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { User } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useQuery, useMutation } from '@tanstack/react-query';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';

interface FollowButtonProps {
  userId: number;
  onFollowChange?: (isFollowing: boolean) => void;
  variant?: 'default' | 'outline' | 'destructive' | 'secondary' | 'ghost' | 'link';
  showIcon?: boolean;
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function FollowButton({
  userId,
  onFollowChange,
  variant = 'default',
  showIcon = true,
  size = 'default'
}: FollowButtonProps) {
  const { toast } = useToast();

  // Check if the current user is following the target user
  const {
    data: followStatus,
    isLoading: isCheckingFollow,
    error: followCheckError
  } = useQuery({
    queryKey: [`/api/users/${userId}/follow-status`],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}/follow-status`);
      if (!res.ok) {
        throw new Error('Failed to check follow status');
      }
      return res.json();
    },
    retry: false
  });

  // Follow mutation
  const followMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/users/${userId}/follow`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to follow user');
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'You are now following this user',
      });
      
      // Invalidate follow status queries
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/follow-status`] });
      
      // Notify parent component
      if (onFollowChange) {
        onFollowChange(true);
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Unfollow mutation
  const unfollowMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('DELETE', `/api/users/${userId}/follow`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to unfollow user');
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'You have unfollowed this user',
      });
      
      // Invalidate follow status queries
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/follow-status`] });
      
      // Notify parent component
      if (onFollowChange) {
        onFollowChange(false);
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const isLoading = 
    isCheckingFollow || 
    followMutation.isPending || 
    unfollowMutation.isPending;

  const isFollowing = followStatus?.following;

  const handleToggleFollow = () => {
    if (isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  if (followCheckError) {
    return (
      <Button variant="ghost" size={size} disabled className="text-red-500">
        Error
      </Button>
    );
  }

  return (
    <Button
      onClick={handleToggleFollow}
      variant={isFollowing ? 'secondary' : variant}
      size={size}
      disabled={isLoading}
      className={isFollowing ? 'bg-slate-700 hover:bg-slate-600' : ''}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        showIcon && (isFollowing ? (
          <UserMinus className="h-4 w-4 mr-2" />
        ) : (
          <UserPlus className="h-4 w-4 mr-2" />
        ))
      )}
      {isFollowing ? 'Following' : 'Follow'}
    </Button>
  );
}