import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Header } from '@/components/Header';
import { LeftSidebar } from '@/components/LeftSidebar';
import MobileNavigation from '@/components/MobileNavigation';
import { FollowButton } from '@/components/FollowButton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useUser } from '@/contexts/UserContext';
import { User, Search, Users as UsersIcon, Loader } from 'lucide-react';

const UsersDirectory: React.FC = () => {
  const { user: currentUser } = useUser();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: users, isLoading } = useQuery({
    queryKey: ['/api/users/search', searchQuery],
    queryFn: async () => {
      let url = '/api/users/search';
      if (searchQuery) {
        url += `?q=${encodeURIComponent(searchQuery)}`;
      }
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Failed to fetch users');
      }
      return res.json();
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // The search is already triggered by the query dependency
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-1 container mx-auto px-4 py-4 flex flex-col md:flex-row gap-4">
        {/* Left Sidebar */}
        <LeftSidebar />
        
        {/* Main Content */}
        <div className="flex-1 space-y-4 max-w-3xl mx-auto w-full">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <UsersIcon className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">User Directory</h1>
            </div>
            
            <form onSubmit={handleSearch} className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search users by name or username"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full"
              />
              <Button type="submit" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-3">
                Search
              </Button>
            </form>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader className="h-8 w-8 text-primary animate-spin mb-2" />
                <p className="text-muted-foreground">Loading users...</p>
              </div>
            ) : !users?.length ? (
              <div className="text-center py-12">
                <UsersIcon className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                <h3 className="text-lg font-medium">No users found</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? 'Try a different search term' : 'Start by searching for users'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {users.map((user: any) => (
                  <Card key={user.id} className="p-4 flex items-center">
                    <div className="h-12 w-12 rounded-full overflow-hidden mr-3">
                      {user.avatarCid ? (
                        <img
                          src={`https://ipfs.io/ipfs/${user.avatarCid}`}
                          alt={user.displayName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-muted flex items-center justify-center">
                          <User className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <Link href={`/user/${user.id}`}>
                        <a className="block">
                          <h3 className="font-medium text-foreground truncate hover:underline">
                            {user.displayName || user.username}
                          </h3>
                          <p className="text-sm text-muted-foreground truncate">
                            @{user.username}
                          </p>
                        </a>
                      </Link>
                    </div>
                    
                    {currentUser && currentUser.id !== user.id && (
                      <FollowButton userId={user.id} size="sm" />
                    )}
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </div>
      </main>
      
      {/* Mobile Navigation */}
      <MobileNavigation />
    </div>
  );
};

export default UsersDirectory;