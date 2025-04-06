import OrbitDB from 'orbit-db';
import { getIPFS } from './ipfs';
import { Post, User, PinnedContent } from '@/types';

let orbitdb: OrbitDB;
let postsDB: any;
let usersDB: any;
let profilesDB: any;
let pinnedContentsDB: any;

// Initialize OrbitDB
export const initOrbitDB = async (did: string): Promise<OrbitDB> => {
  try {
    const ipfs = await getIPFS();
    // Use IndexedDB by default in browsers
    orbitdb = await OrbitDB.createInstance(ipfs, {
      directory: did // Just use DID as the directory name (no path prefix)
    });
    
    return orbitdb;
  } catch (error) {
    console.error('Error initializing OrbitDB:', error);
    throw error;
  }
};

// Get OrbitDB instance, initializing if needed
export const getOrbitDB = async (did: string): Promise<OrbitDB> => {
  if (!orbitdb) {
    return initOrbitDB(did);
  }
  return orbitdb;
};

// Open or create the posts database
export const openPostsDB = async (did: string): Promise<any> => {
  if (postsDB) return postsDB;
  
  try {
    const orbit = await getOrbitDB(did);
    
    // Use eventlog for posts as they're append-only
    postsDB = await orbit.eventlog('ghosted.posts', {
      accessController: {
        write: ['*'] // Anyone can write for now
      }
    });
    
    await postsDB.load();
    return postsDB;
  } catch (error) {
    console.error('Error opening posts database:', error);
    throw error;
  }
};

// Open or create the users database
export const openUsersDB = async (did: string): Promise<any> => {
  if (usersDB) return usersDB;
  
  try {
    const orbit = await getOrbitDB(did);
    
    // Use keyvalue for users database
    usersDB = await orbit.keyvalue('ghosted.users', {
      accessController: {
        write: ['*'] // Anyone can write for now
      }
    });
    
    await usersDB.load();
    return usersDB;
  } catch (error) {
    console.error('Error opening users database:', error);
    throw error;
  }
};

// Open or create the profiles database
export const openProfilesDB = async (did: string): Promise<any> => {
  if (profilesDB) return profilesDB;
  
  try {
    const orbit = await getOrbitDB(did);
    
    // Use documents database for profiles
    profilesDB = await orbit.docs('ghosted.profiles', {
      accessController: {
        write: [did] // Only the owner can write to their profile
      }
    });
    
    await profilesDB.load();
    return profilesDB;
  } catch (error) {
    console.error('Error opening profiles database:', error);
    throw error;
  }
};

// Open or create the pinned contents database
export const openPinnedContentsDB = async (did: string): Promise<any> => {
  if (pinnedContentsDB) return pinnedContentsDB;
  
  try {
    const orbit = await getOrbitDB(did);
    
    // Use documents database for pinned contents
    pinnedContentsDB = await orbit.docs('ghosted.pinned-contents', {
      accessController: {
        write: [did] // Only the owner can write
      }
    });
    
    await pinnedContentsDB.load();
    return pinnedContentsDB;
  } catch (error) {
    console.error('Error opening pinned contents database:', error);
    throw error;
  }
};

// Add a post to OrbitDB
export const addPost = async (did: string, post: Post): Promise<string> => {
  try {
    const db = await openPostsDB(did);
    const hash = await db.add(post);
    return hash;
  } catch (error) {
    console.error('Error adding post to OrbitDB:', error);
    throw error;
  }
};

// Get all posts from OrbitDB
export const getAllPosts = async (did: string): Promise<Post[]> => {
  try {
    const db = await openPostsDB(did);
    const posts = db.iterator({ limit: -1 })
      .collect()
      .map((entry: any) => entry.payload.value);
    
    return posts;
  } catch (error) {
    console.error('Error getting posts from OrbitDB:', error);
    return [];
  }
};

// Add a user to OrbitDB
export const addUser = async (did: string, user: User): Promise<void> => {
  try {
    const db = await openUsersDB(did);
    await db.put(user.id.toString(), user);
  } catch (error) {
    console.error('Error adding user to OrbitDB:', error);
    throw error;
  }
};

// Get a user from OrbitDB
export const getUser = async (did: string, userId: string): Promise<User | null> => {
  try {
    const db = await openUsersDB(did);
    const user = await db.get(userId);
    return user;
  } catch (error) {
    console.error('Error getting user from OrbitDB:', error);
    return null;
  }
};

// Add or update profile in OrbitDB
export const updateProfile = async (did: string, profile: any): Promise<string> => {
  try {
    const db = await openProfilesDB(did);
    
    // Use DID as the document _id
    const profileDoc = { _id: did, ...profile };
    const hash = await db.put(profileDoc);
    
    return hash;
  } catch (error) {
    console.error('Error updating profile in OrbitDB:', error);
    throw error;
  }
};

// Get profile from OrbitDB
export const getProfile = async (did: string, profileDid: string): Promise<any | null> => {
  try {
    const db = await openProfilesDB(did);
    const profile = await db.get(profileDid);
    
    if (profile && profile.length > 0) {
      return profile[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error getting profile from OrbitDB:', error);
    return null;
  }
};

// Add pinned content to OrbitDB
export const addPinnedContent = async (did: string, pinnedContent: PinnedContent): Promise<string> => {
  try {
    const db = await openPinnedContentsDB(did);
    
    // Use contentCid as document _id for uniqueness
    const pinnedDoc = { _id: pinnedContent.contentCid, ...pinnedContent };
    const hash = await db.put(pinnedDoc);
    
    return hash;
  } catch (error) {
    console.error('Error adding pinned content to OrbitDB:', error);
    throw error;
  }
};

// Remove pinned content from OrbitDB
export const removePinnedContent = async (did: string, contentCid: string): Promise<string> => {
  try {
    const db = await openPinnedContentsDB(did);
    const hash = await db.del(contentCid);
    
    return hash;
  } catch (error) {
    console.error('Error removing pinned content from OrbitDB:', error);
    throw error;
  }
};

// Get all pinned content from OrbitDB
export const getAllPinnedContent = async (did: string): Promise<PinnedContent[]> => {
  try {
    const db = await openPinnedContentsDB(did);
    const pinnedContents = await db.get('');
    
    return pinnedContents.map((doc: any) => {
      const { _id, ...content } = doc;
      return content;
    });
  } catch (error) {
    console.error('Error getting pinned contents from OrbitDB:', error);
    return [];
  }
};
