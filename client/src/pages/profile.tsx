import React, { useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { useProfile } from '@/hooks/use-profile';
import { Header } from '@/components/Header';
import { LeftSidebar } from '@/components/LeftSidebar';
import MobileNavigation from '@/components/MobileNavigation';
import { PostCard } from '@/components/Post';
import { FollowersList } from '@/components/FollowersList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useQuery } from '@tanstack/react-query';
import { 
  User, 
  Edit, 
  Camera, 
  Loader, 
  Clock, 
  MapPin, 
  Link as LinkIcon, 
  AtSign,
  Users 
} from 'lucide-react';
import Login from './login';

const Profile: React.FC = () => {
  const { user, isLoading: isUserLoading } = useUser();
  const { 
    profile, 
    isLoadingProfile, 
    userPosts, 
    isLoadingUserPosts, 
    updateProfile,
    isUpdatingProfile
  } = useProfile(user?.id);

  // Fetch follower counts
  const { data: followers } = useQuery({
    queryKey: [`/api/users/${user?.id}/followers`],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/users/${user.id}/followers`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user?.id
  });

  // Fetch following counts
  const { data: following } = useQuery({
    queryKey: [`/api/users/${user?.id}/following`],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/users/${user.id}/following`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user?.id
  });

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // If user is not logged in, show login page
  if (!isUserLoading && !user) {
    return <Login />;
  }

  // Initialize edit form when profile data is loaded
  if (profile && displayName === '' && bio === '') {
    setDisplayName(profile.displayName || '');
    setBio(profile.bio || '');
  }

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      displayName,
      bio,
      avatar: avatarFile || undefined
    });
    setIsEditing(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAvatarFile(e.target.files[0]);
    }
  };

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
            <div className="h-32 bg-gradient-to-r from-blue-400 to-accent"></div>

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
                    {(profile?.avatarCid || avatarFile) ? (
                      <img 
                        src={avatarFile ? URL.createObjectURL(avatarFile) : `https://ipfs.io/ipfs/${profile?.avatarCid}`}
                        alt={`${profile?.displayName}'s profile`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gray-200 text-gray-600">
                        <User className="h-12 w-12" />
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Edit Profile Button */}
              <div className="flex justify-end">
                {!isEditing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="flex items-center space-x-1"
                  >
                    <Edit className="h-3 w-3" />
                    <span>Edit Profile</span>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                    className="text-gray-600"
                  >
                    Cancel
                  </Button>
                )}
              </div>

              {/* Profile Content */}
              <div className="mt-8">
                {isEditing ? (
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="avatar" className="text-sm font-medium text-gray-700">
                        Profile Picture
                      </label>
                      <div className="flex items-center space-x-3">
                        <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-gray-200">
                          {avatarFile ? (
                            <img 
                              src={URL.createObjectURL(avatarFile)}
                              alt="Avatar preview"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-gray-200 text-gray-600">
                              <User className="h-6 w-6" />
                            </div>
                          )}
                        </div>
                        <label className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">
                          <Camera className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">Choose File</span>
                          <input
                            type="file"
                            id="avatar"
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="displayName" className="text-sm font-medium text-gray-700">
                        Display Name
                      </label>
                      <Input
                        id="displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="bio" className="text-sm font-medium text-gray-700">
                        Bio
                      </label>
                      <Textarea
                        id="bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        type="submit"
                        disabled={isUpdatingProfile}
                        className="flex items-center space-x-1"
                      >
                        {isUpdatingProfile ? (
                          <Loader className="h-4 w-4 animate-spin" />
                        ) : (
                          <></>
                        )}
                        <span>Save Profile</span>
                      </Button>
                    </div>
                  </form>
                ) : (
                  <>
                    <h1 className="text-2xl font-bold">
                      {isLoadingProfile ? (
                        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded"></div>
                      ) : (
                        profile?.displayName || user?.displayName
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
                        <span>Joined April 2023</span>
                      </div>
                      <div className="flex items-center mr-4">
                        <MapPin className="h-4 w-4 mr-1" />
                        <span>Decentralized Network</span>
                      </div>
                      <div className="flex items-center mr-4 text-blue-500">
                        <LinkIcon className="h-4 w-4 mr-1" />
                        <span>IPFS</span>
                      </div>
                      <div className="flex items-center text-blue-500 truncate max-w-[200px]">
                        <AtSign className="h-4 w-4 mr-1 flex-shrink-0" />
                        <span className="truncate">{user?.did}</span>
                      </div>
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
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Network section */}
          {user?.id && (
            <FollowersList userId={user.id} className="mb-4" />
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

export default Profile;
