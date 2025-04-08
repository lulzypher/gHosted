import React, { useState } from 'react';
import { useRoute } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/contexts/UserContext';
import { Header } from '@/components/Header';
import { LeftSidebar } from '@/components/LeftSidebar';
import MobileNavigation from '@/components/MobileNavigation';
import { PostCard } from '@/components/Post';
import { FollowButton } from '@/components/FollowButton';
import { FollowersList } from '@/components/FollowersList';
import { 
  User as UserIcon, 
  Clock, 
  MapPin, 
  Link as LinkIcon, 
  AtSign,
  Users,
  Loader
} from 'lucide-react';

const UserProfile: React.FC = () => {
  const { user: currentUser } = useUser();
  const [, params] = useRoute('/user/:id');
  const userId = params?.id ? parseInt(params.id, 10) : 0;

  // Fetch user profile
  const {
    data: profile,
    isLoading: isLoadingProfile,
    error: profileError
  } = useQuery({
    queryKey: [`/api/users/${userId}`],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch user profile');
      }
      return res.json();
    },
    enabled: !!userId
  });

  // Fetch user posts
  const {
    data: userPosts,
    isLoading: isLoadingUserPosts
  } = useQuery({
    queryKey: [`/api/users/${userId}/posts`],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}/posts`);
      if (!res.ok) {
        throw new Error('Failed to fetch user posts');
      }
      return res.json();
    },
    enabled: !!userId
  });

  // Fetch follower counts
  const { data: followers } = useQuery({
    queryKey: [`/api/users/${userId}/followers`],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}/followers`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!userId
  });

  // Fetch following counts
  const { data: following } = useQuery({
    queryKey: [`/api/users/${userId}/following`],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}/following`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!userId
  });

  if (profileError) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 flex flex-col md:flex-row gap-4">
          <LeftSidebar />
          <div className="flex-1 space-y-4 max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <h2 className="text-xl font-bold text-red-500">Error</h2>
              <p className="mt-2 text-gray-600">
                {(profileError as Error).message || 'Failed to load user profile'}
              </p>
            </div>
          </div>
        </main>
        <MobileNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-1 container mx-auto px-4 py-4 flex flex-col md:flex-row gap-4">
        {/* Left Sidebar */}
        <LeftSidebar />
        
        {/* Profile Content */}
        <div className="flex-1 space-y-4 max-w-2xl mx-auto w-full">
          {/* Profile Card */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {/* Cover Image */}
            <div className="h-32 bg-gradient-to-r from-blue-500 to-indigo-500"></div>

            {/* Profile Info */}
            <div className="p-4 relative">
              {/* Profile Picture */}
              <div className="absolute -top-12 left-4 h-24 w-24 rounded-full overflow-hidden border-4 border-white bg-white">
                {isLoadingProfile ? (
                  <div className="h-full w-full flex items-center justify-center bg-gray-200">
                    <Loader className="h-8 w-8 text-gray-400 animate-spin" />
                  </div>
                ) : (
                  <>
                    {profile?.avatarCid ? (
                      <img 
                        src={`https://ipfs.io/ipfs/${profile.avatarCid}`}
                        alt={`${profile.displayName}'s profile`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gray-200 text-gray-600">
                        <UserIcon className="h-12 w-12" />
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Follow Button */}
              <div className="flex justify-end">
                {currentUser && currentUser.id !== userId && (
                  <FollowButton userId={userId} />
                )}
              </div>

              {/* Profile Content */}
              <div className="mt-8">
                <h1 className="text-2xl font-bold">
                  {isLoadingProfile ? (
                    <div className="h-8 w-48 bg-gray-200 animate-pulse rounded"></div>
                  ) : (
                    profile?.displayName || profile?.username
                  )}
                </h1>

                <p className="text-gray-600 mt-2">
                  {isLoadingProfile ? (
                    <div className="h-4 w-full bg-gray-200 animate-pulse rounded"></div>
                  ) : (
                    profile?.bio || 'No bio provided'
                  )}
                </p>

                <div className="flex flex-wrap gap-y-2 mt-4 text-sm text-gray-500">
                  <div className="flex items-center mr-4">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>gHosted User</span>
                  </div>
                  <div className="flex items-center mr-4">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>Decentralized Network</span>
                  </div>
                  {profile?.did && (
                    <div className="flex items-center text-blue-500 truncate max-w-[200px]">
                      <AtSign className="h-4 w-4 mr-1 flex-shrink-0" />
                      <span className="truncate">{profile.did}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100">
                  <div className="text-center">
                    <div className="font-semibold">{userPosts?.length || 0}</div>
                    <div className="text-sm text-gray-500">Posts</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">{following?.length || 0}</div>
                    <div className="text-sm text-gray-500">Following</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">{followers?.length || 0}</div>
                    <div className="text-sm text-gray-500">Followers</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Network section */}
          {userId && (
            <FollowersList userId={userId} className="mb-4" />
          )}

          {/* User Posts */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold px-1">Posts</h2>

            {/* Loading State */}
            {isLoadingUserPosts && (
              <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                <Loader className="h-8 w-8 text-primary animate-spin mx-auto" />
                <p className="mt-2 text-gray-500">Loading posts...</p>
              </div>
            )}

            {/* Empty State */}
            {!isLoadingUserPosts && userPosts?.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                <p className="text-gray-500">No posts yet.</p>
              </div>
            )}

            {/* Posts */}
            {!isLoadingUserPosts && userPosts?.length > 0 && (
              <>
                {userPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </>
            )}
          </div>
        </div>
      </main>
      
      {/* Mobile Navigation */}
      <MobileNavigation />
    </div>
  );
};

export default UserProfile;