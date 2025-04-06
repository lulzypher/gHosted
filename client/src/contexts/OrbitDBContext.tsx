import React, { createContext, useState, useEffect, useContext } from 'react';
import OrbitDB from 'orbit-db';
import { initOrbitDB, openPostsDB, openUsersDB, openProfilesDB, openPinnedContentsDB } from '@/lib/orbitdb';
import { useIPFS } from './IPFSContext';
import { useUser } from './UserContext';
import { useToast } from '@/hooks/use-toast';

interface OrbitDBContextProps {
  orbitdb: OrbitDB | null;
  isOrbitDBReady: boolean;
  orbitDBError: string | null;
  postsDB: any;
  usersDB: any;
  profilesDB: any;
  pinnedContentsDB: any;
}

const OrbitDBContext = createContext<OrbitDBContextProps | undefined>(undefined);

export const OrbitDBProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orbitdb, setOrbitdb] = useState<OrbitDB | null>(null);
  const [isOrbitDBReady, setIsOrbitDBReady] = useState<boolean>(false);
  const [orbitDBError, setOrbitDBError] = useState<string | null>(null);
  const [postsDB, setPostsDB] = useState<any>(null);
  const [usersDB, setUsersDB] = useState<any>(null);
  const [profilesDB, setProfilesDB] = useState<any>(null);
  const [pinnedContentsDB, setPinnedContentsDB] = useState<any>(null);
  
  const { ipfs, isIPFSReady } = useIPFS();
  const { user } = useUser();
  const { toast } = useToast();

  // Initialize OrbitDB when IPFS is ready and user is logged in
  useEffect(() => {
    const init = async () => {
      if (!isIPFSReady || !user) return;
      
      try {
        // Initialize OrbitDB with user's DID
        const orbitInstance = await initOrbitDB(user.did);
        setOrbitdb(orbitInstance);
        
        // Open databases
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
  }, [isIPFSReady, user, toast]);

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
