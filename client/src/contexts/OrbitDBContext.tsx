import React, { createContext, useState, useEffect, useContext } from 'react';
import { initOrbitDB, openPostsDB, openUsersDB, openProfilesDB, openPinnedContentsDB } from '@/lib/orbitdb';
import { useUser } from './UserContext';
import { useToast } from '@/hooks/use-toast';

interface OrbitDBContextProps {
  orbitdb: unknown | null;
  isOrbitDBReady: boolean;
  orbitDBError: string | null;
  postsDB: unknown | null;
  usersDB: unknown | null;
  profilesDB: unknown | null;
  pinnedContentsDB: unknown | null;
}

const OrbitDBContext = createContext<OrbitDBContextProps | undefined>(undefined);

export const OrbitDBProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orbitdb, setOrbitdb] = useState<unknown | null>(null);
  const [isOrbitDBReady, setIsOrbitDBReady] = useState<boolean>(false);
  const [orbitDBError, setOrbitDBError] = useState<string | null>(null);
  const [postsDB, setPostsDB] = useState<unknown | null>(null);
  const [usersDB, setUsersDB] = useState<unknown | null>(null);
  const [profilesDB, setProfilesDB] = useState<unknown | null>(null);
  const [pinnedContentsDB, setPinnedContentsDB] = useState<unknown | null>(null);
  
  const { user } = useUser();
  const { toast } = useToast();

  // Initialize OrbitDB when user is logged in (uses Helia + @orbitdb/core, no IPFS gateway)
  useEffect(() => {
    const init = async () => {
      if (!user) return;
      
      try {
        const orbitInstance = await initOrbitDB(user.did);
        setOrbitdb(orbitInstance);
        
        const posts = await openPostsDB(user.did);
        const users = await openUsersDB(user.did);
        const profiles = await openProfilesDB(user.did);
        const pinnedContents = await openPinnedContentsDB(user.did);
        
        setPostsDB(posts);
        setUsersDB(users);
        setProfilesDB(profiles);
        setPinnedContentsDB(pinnedContents);
        
        setIsOrbitDBReady(true);
        
        toast({
          title: "P2P Database Ready",
          description: "Connected to the decentralized network",
        });
      } catch (error) {
        console.error('Error initializing OrbitDB:', error);
        setOrbitDBError('Failed to initialize OrbitDB. P2P functionality may be limited.');
        
        toast({
          variant: "destructive",
          title: "Database Error",
          description: "Could not connect to P2P database. Limited functionality available.",
        });
      }
    };

    init();
  }, [user, toast]);

  return (
    <OrbitDBContext.Provider value={{
      orbitdb,
      isOrbitDBReady,
      orbitDBError,
      postsDB,
      usersDB,
      profilesDB,
      pinnedContentsDB
    }}>
      {children}
    </OrbitDBContext.Provider>
  );
};

export const useOrbitDB = (): OrbitDBContextProps => {
  const context = useContext(OrbitDBContext);
  if (context === undefined) {
    throw new Error('useOrbitDB must be used within an OrbitDBProvider');
  }
  return context;
};
