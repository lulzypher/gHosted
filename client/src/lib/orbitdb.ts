/**
 * OrbitDB integration using Helia + @orbitdb/core for real P2P sync.
 * Per-user post feeds, following, and aggregated feed.
 */

import {
  initDecentralizedStore,
  openEventsDB,
  openDocumentsDB,
  openKeyValueDB,
} from "./decentralizedStore";
import { Post, User, PinnedContent } from "@/types";

// Decentralized post shape (no server ids)
export interface DecentralizedPost {
  contentCid: string;
  authorDid: string;
  content: string;
  mediaCid?: string;
  createdAt: string;
  groupRef?: string; // Optional: when post is shared to a group
}

// Store API types from @orbitdb/core
interface EventsStore {
  add: (value: unknown) => Promise<string>;
  iterator: (opts?: { amount?: number }) => AsyncGenerator<{ hash: string; value: unknown }>;
}
interface KeyValueStore {
  put: (key: string, value: unknown) => Promise<string>;
  get: (key: string) => Promise<unknown>;
  del?: (key: string) => Promise<void>;
  iterator?: (opts?: { amount?: number }) => AsyncGenerator<{ key: string; value: unknown }>;
}
interface DocumentsStore {
  put: (doc: { _id: string; [k: string]: unknown }) => Promise<string>;
  get: (key: string) => Promise<{ value: unknown } | undefined>;
  del: (key: string) => Promise<string>;
  iterator: (opts?: { amount?: number }) => AsyncGenerator<{ hash: string; key: string; value: unknown }>;
}

// Cache for per-author posts DBs (limit size to avoid memory bloat)
const authorPostsCache = new Map<string, EventsStore>();
const MAX_CACHED_AUTHOR_DBS = 30;

let usersDB: KeyValueStore | null = null;
let profilesDB: DocumentsStore | null = null;
let pinnedContentsDB: DocumentsStore | null = null;
let followingDB: KeyValueStore | null = null;

const USERS_DB = "ghosted.users";
const PROFILES_DB = "ghosted.profiles";
const PINNED_DB = "ghosted.pinned-contents";
const FOLLOWING_DB = "ghosted.following";

// Initialize OrbitDB (Helia + OrbitDB)
export const initOrbitDB = async (did: string): Promise<unknown> => {
  const { orbitdb } = await initDecentralizedStore();
  return orbitdb;
};

// Open per-author posts DB
export const openAuthorPostsDB = async (authorDid: string): Promise<EventsStore> => {
  const key = `ghosted.posts.${authorDid.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const cached = authorPostsCache.get(key);
  if (cached) return cached;

  await initOrbitDB(authorDid);
  const db = (await openEventsDB(key)) as EventsStore;
  if (authorPostsCache.size >= MAX_CACHED_AUTHOR_DBS) {
    const first = authorPostsCache.keys().next().value;
    if (first) authorPostsCache.delete(first);
  }
  authorPostsCache.set(key, db);
  return db;
};

// Open following DB (keyvalue: did -> { did, addedAt })
export const openFollowingDB = async (myDid: string): Promise<KeyValueStore> => {
  if (followingDB) return followingDB;
  await initOrbitDB(myDid);
  followingDB = (await openKeyValueDB(FOLLOWING_DB)) as KeyValueStore;
  return followingDB;
};

// Open or create the users database (key-value)
export const openUsersDB = async (did: string): Promise<KeyValueStore> => {
  if (usersDB) return usersDB;
  await initOrbitDB(did);
  usersDB = (await openKeyValueDB(USERS_DB)) as KeyValueStore;
  return usersDB;
};

// Open or create the profiles database (documents)
export const openProfilesDB = async (did: string): Promise<DocumentsStore> => {
  if (profilesDB) return profilesDB;
  await initOrbitDB(did);
  profilesDB = (await openDocumentsDB(PROFILES_DB)) as DocumentsStore;
  return profilesDB;
};

// Open or create the pinned contents database (documents)
export const openPinnedContentsDB = async (did: string): Promise<DocumentsStore> => {
  if (pinnedContentsDB) return pinnedContentsDB;
  await initOrbitDB(did);
  pinnedContentsDB = (await openDocumentsDB(PINNED_DB)) as DocumentsStore;
  return pinnedContentsDB;
};

// --- Posts (per-author) ---

export const addPost = async (
  authorDid: string,
  post: DecentralizedPost
): Promise<string> => {
  const db = await openAuthorPostsDB(authorDid);
  return db.add(post);
};

export const getPostsByAuthor = async (
  authorDid: string
): Promise<DecentralizedPost[]> => {
  const db = await openAuthorPostsDB(authorDid);
  const posts: DecentralizedPost[] = [];
  for await (const { value } of db.iterator({ amount: -1 })) {
    posts.push(value as DecentralizedPost);
  }
  return posts.reverse();
};

// --- Following ---

export const followUser = async (
  myDid: string,
  targetDid: string
): Promise<void> => {
  const db = await openFollowingDB(myDid);
  await db.put(targetDid, { did: targetDid, addedAt: new Date().toISOString() });
};

export const unfollowUser = async (
  myDid: string,
  targetDid: string
): Promise<void> => {
  const db = (await openFollowingDB(myDid)) as KeyValueStore & { del: (key: string) => Promise<void> };
  if (typeof db.del === "function") {
    await db.del(targetDid);
  }
};

// But our interface doesn't have del. Let me add it to the interface.
// Actually looking at the KeyValue - it has del. So we need to extend the interface.
export const getFollowing = async (myDid: string): Promise<string[]> => {
  const db = await openFollowingDB(myDid);
  const dids: string[] = [];
  try {
    const kv = db as KeyValueStore & { iterator?: (opts?: { amount?: number }) => AsyncGenerator<{ key: string; value: unknown }> };
    if (kv.iterator) {
      for await (const { key, value } of kv.iterator({ amount: -1 })) {
        if (value && typeof value === "object" && "did" in value) {
          dids.push((value as { did: string }).did);
        } else if (key && value != null) {
          dids.push(key);
        }
      }
    }
  } catch {
    // No iterator - return empty for now
  }
  return dids;
};

// --- Aggregated feed ---

export const getFeedPosts = async (
  myDid: string,
  followedDids: string[]
): Promise<DecentralizedPost[]> => {
  const allDids = [myDid, ...followedDids.filter((d) => d !== myDid)];
  const allPosts: DecentralizedPost[] = [];
  for (const did of allDids) {
    try {
      const posts = await getPostsByAuthor(did);
      allPosts.push(...posts);
    } catch (e) {
      console.warn(`Failed to load posts for ${did}:`, e);
    }
  }
  allPosts.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return allPosts;
};

// --- Legacy / compatibility ---

export const openPostsDB = async (did: string): Promise<EventsStore> =>
  openAuthorPostsDB(did);

export const getAllPosts = async (did: string): Promise<DecentralizedPost[]> =>
  getPostsByAuthor(did);

// --- Users, profiles, pinned (unchanged) ---

export const addUser = async (did: string, user: User): Promise<void> => {
  const db = await openUsersDB(did);
  await db.put(user.id.toString(), user);
};

export const getUser = async (
  did: string,
  userId: string
): Promise<User | null> => {
  const db = await openUsersDB(did);
  const v = await db.get(userId);
  return (v as User | null) ?? null;
};

export const updateProfile = async (
  did: string,
  profile: Record<string, unknown>
): Promise<string> => {
  const db = await openProfilesDB(did);
  const profileDoc = { _id: did, ...profile };
  return db.put(profileDoc);
};

export const getProfile = async (
  did: string,
  profileDid: string
): Promise<unknown | null> => {
  const db = await openProfilesDB(did);
  const entry = await db.get(profileDid);
  return (entry && "value" in entry ? entry.value : entry) ?? null;
};

export const addPinnedContent = async (
  did: string,
  pinnedContent: PinnedContent
): Promise<string> => {
  const db = await openPinnedContentsDB(did);
  const pinnedDoc = {
    _id: pinnedContent.contentCid,
    ...pinnedContent,
  };
  return db.put(pinnedDoc);
};

export const removePinnedContent = async (
  did: string,
  contentCid: string
): Promise<string> => {
  const db = await openPinnedContentsDB(did);
  return db.del(contentCid);
};

export const getAllPinnedContent = async (
  did: string
): Promise<PinnedContent[]> => {
  const db = await openPinnedContentsDB(did);
  const results: PinnedContent[] = [];
  for await (const { value } of db.iterator({ amount: -1 })) {
    const { _id, ...content } = value as { _id: string } & PinnedContent;
    results.push(content as PinnedContent);
  }
  return results;
};
