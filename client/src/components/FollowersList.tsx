import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FollowButton } from '@/components/FollowButton';
import { Loader2, UserIcon, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface FollowUser {
  id: number;
  username: string;
  displayName?: string;
  avatarCid?: string;
  followedAt: string;
}

interface FollowersListProps {
  userId: number;
  className?: string;
}

export function FollowersList({ userId, className = '' }: FollowersListProps) {
  // Fetch followers
  const {
    data: followers,
    isLoading: isLoadingFollowers,
    error: followersError
  } = useQuery({
    queryKey: [`/api/users/${userId}/followers`],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}/followers`);
      if (!res.ok) {
        throw new Error('Failed to fetch followers');
      }
      return res.json() as Promise<FollowUser[]>;
    }
  });

  // Fetch following
  const {
    data: following,
    isLoading: isLoadingFollowing,
    error: followingError
  } = useQuery({
    queryKey: [`/api/users/${userId}/following`],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}/following`);
      if (!res.ok) {
        throw new Error('Failed to fetch following');
      }
      return res.json() as Promise<FollowUser[]>;
    }
  });

  const isLoading = isLoadingFollowers || isLoadingFollowing;
  const hasError = followersError || followingError;

  const renderUserList = (users: FollowUser[] | undefined) => {
    if (!users || users.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
          <Users className="h-12 w-12 mb-2 opacity-20" />
          <p>No users found</p>
        </div>
      );
    }

    return (
      <ScrollArea className="h-72">
        <div className="space-y-4 p-4">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar>
                  {user.avatarCid ? (
                    <AvatarImage src={`https://cloudflare-ipfs.com/ipfs/${user.avatarCid}`} />
                  ) : null}
                  <AvatarFallback>
                    <UserIcon className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{user.displayName || user.username}</p>
                  <p className="text-sm text-muted-foreground">@{user.username}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <p className="text-xs text-muted-foreground mr-2">
                  {formatDistanceToNow(new Date(user.followedAt), { addSuffix: true })}
                </p>
                <FollowButton userId={user.id} size="sm" />
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  };

  if (hasError) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle>Network</CardTitle>
          <CardDescription>Failed to load network data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-red-500">
            {(followersError as Error)?.message || (followingError as Error)?.message || 'Unknown error'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle>Network</CardTitle>
        <CardDescription>People who follow you and who you follow</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="followers">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="followers" className="flex-1">
                Followers ({followers?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="following" className="flex-1">
                Following ({following?.length || 0})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="followers">
              {renderUserList(followers)}
            </TabsContent>
            <TabsContent value="following">
              {renderUserList(following)}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}