// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';
import { useProfile } from '@/hooks/use-profile';
import { getProfile, updateProfile as updateProfileOrbitDB, getPostsByAuthor } from '@/lib/orbitdb';
import { ipfsUrl } from '@/lib/ipfsGateway';
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
  const isDecentralized = !!(user?.did && (user?.id === 0 || user?.id == null));
  
  const [decentralizedProfile, setDecentralizedProfile] = useState<{ displayName?: string; bio?: string; username?: string } | null>(null);
  const [decentralizedPosts, setDecentralizedPosts] = useState<any[]>([]);
  const [loadingDecentralized, setLoadingDecentralized] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  
  const { 
    profile, 
    isLoadingProfile, 
    userPosts, 
    isLoadingUserPosts, 
    updateProfile,
    isUpdatingProfile
  } = useProfile(isDecentralized ? undefined : user?.id);

  // Decentralized profile from OrbitDB
  useEffect(() => {
    if (!isDecentralized || !user?.did) return;
    let cancelled = false;
    setLoadingDecentralized(true);
    (async () => {
      try {
        const p = await getProfile(user.did, user.did);
        if (!cancelled) setDecentralizedProfile((p as Record<string, unknown>) || { displayName: user.displayName, username: user.username });
        const posts = await getPostsByAuthor(user.did);
        if (!cancelled) setDecentralizedPosts(posts.map((post: any) => ({ content: post.content, createdAt: post.createdAt, cid: post.contentCid, authorDid: post.authorDid, mediaCid: post.mediaCid })));
      } catch (e) {
        if (!cancelled) setDecentralizedProfile({ displayName: user?.displayName, username: user?.username });
      } finally {
        if (!cancelled) setLoadingDecentralized(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isDecentralized, user?.did, user?.displayName, user?.username]);

  // Fetch follower counts (server only)
  const { data: followers } = useQuery({
    queryKey: [`/api/users/${user?.id}/followers`],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/users/${user.id}/followers`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user?.id && !isDecentralized
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
    enabled: !!user?.id && !isDecentralized
  });

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const effectiveProfile = isDecentralized ? decentralizedProfile : profile;
  const effectivePosts = isDecentralized ? decentralizedPosts : (userPosts || []);
  const isLoading = isDecentralized ? loadingDecentralized : isLoadingProfile;
  const isLoadingPosts = isDecentralized ? loadingDecentralized : isLoadingUserPosts;

  // Initialize edit form when profile data is loaded
  useEffect(() => {
    if (effectiveProfile && displayName === '' && bio === '') {
      setDisplayName(effectiveProfile.displayName || user?.displayName || '');
      setBio((effectiveProfile as any)?.bio || '');
    }
  }, [effectiveProfile, user?.displayName]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDecentralized && user?.did) {
      setSavingProfile(true);
      try {
        await updateProfileOrbitDB(user.did, { displayName, bio });
        setDecentralizedProfile(prev => ({ ...prev, displayName, bio }));
        setIsEditing(false);
      } catch (err) {
        console.error('Profile update failed:', err);
      } finally {
        setSavingProfile(false);
      }
    } else {
      updateProfile({ displayName, bio, avatar: avatarFile || undefined });
      setIsEditing(false);
    }
  };

  // If user is not logged in, show login page
  if (!isUserLoading && !user) {
    return <Login />;
  }

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
                {isLoading ? (
                  <div className="h-full w-full flex items-center justify-center bg-gray-200">
                    <Loader className="h-8 w-8 text-gray-400 animate-spin" />
                  </div>
                ) : (
                  <>
                    {((effectiveProfile as any)?.avatarCid || avatarFile) ? (
                      <img 
                        src={avatarFile ? URL.createObjectURL(avatarFile) : ((effectiveProfile as any)?.avatarCid ? ipfsUrl((effectiveProfile as any).avatarCid) : '')}
                        alt={`${effectiveProfile?.displayName || user?.displayName}'s profile`}
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
                        disabled={isUpdatingProfile || savingProfile}
                        className="flex items-center space-x-1"
                      >
                        {(isUpdatingProfile || savingProfile) ? (
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
                      {isLoading ? (
                        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded"></div>
                      ) : (
                        effectiveProfile?.displayName || user?.displayName
                      )}
                    </h1>

                    <p className="text-gray-600 mt-2">
                      {isLoading ? (
                        <div className="h-4 w-full bg-gray-200 animate-pulse rounded"></div>
                      ) : (
                        (effectiveProfile as any)?.bio || 'No bio provided'
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
                        <div className="font-semibold">{effectivePosts?.length || 0}</div>
                        <div className="text-sm text-gray-500">Posts</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">{isDecentralized ? '-' : (following?.length || 0)}</div>
                        <div className="text-sm text-gray-500">Following</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">{isDecentralized ? '-' : (followers?.length || 0)}</div>
                        <div className="text-sm text-gray-500">Followers</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Network section */}
          {user?.id && !isDecentralized && (
            <FollowersList userId={user.id} className="mb-4" />
          )}

          {/* User Posts */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold px-1">Posts</h2>

            {/* Loading State */}
            {isLoadingPosts && (
              <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                <Loader className="h-8 w-8 text-primary animate-spin mx-auto" />
                <p className="mt-2 text-gray-500">Loading posts...</p>
              </div>
            )}

            {/* Empty State */}
            {!isLoadingPosts && effectivePosts?.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                <p className="text-gray-500">No posts yet.</p>
              </div>
            )}

            {/* Posts */}
            {!isLoadingPosts && effectivePosts?.length > 0 && (
              <>
                {effectivePosts.map((post: any, i: number) => (
                  <PostCard key={post.cid || post.id || i} post={post} />
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
