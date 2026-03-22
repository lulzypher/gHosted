import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Header } from '@/components/Header';
import { LeftSidebar } from '@/components/LeftSidebar';
import { useUser } from '@/contexts/UserContext';
import { getFollowing, getProfile } from '@/lib/orbitdb';
import { fetchGroups } from '@/lib/groups';
import { Search as SearchIcon, User, Users, Loader2 } from 'lucide-react';
import { Link } from 'wouter';
import Login from './login';

type PeopleResult = { did: string; displayName?: string; username?: string };
type GroupResult = { id: number; name: string; displayName: string };

export default function SearchPage() {
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const q = (() => {
    try {
      return new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('q') || '';
    } catch {
      return '';
    }
  })();
  const [searchInput, setSearchInput] = useState(q);
  const [people, setPeople] = useState<PeopleResult[]>([]);
  const [groups, setGroups] = useState<GroupResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  useEffect(() => {
    if (!user?.did || !q.trim()) {
      setPeople([]);
      setGroups([]);
      return;
    }
    const query = q.toLowerCase().trim();
    setLoading(true);

    const run = async () => {
      const peopleResults: PeopleResult[] = [];
      const groupResults: GroupResult[] = [];

      try {
        // People: search within followed DIDs + self
        const followed = await getFollowing(user.did);
        const allDids = [user.did, ...followed.filter((d) => d !== user.did)];
        for (const did of allDids) {
          const matchesDid = did.toLowerCase().includes(query);
          let profile: unknown = null;
          try {
            profile = await getProfile(user.did, did);
          } catch {
            /* ignore */
          }
          const p = profile as { displayName?: string; username?: string } | null;
          const displayName = (p?.displayName || p?.username || '').toLowerCase();
          const username = (p?.username || '').toLowerCase();
          const matchesProfile =
            displayName.includes(query) || username.includes(query);
          if (matchesDid || matchesProfile) {
            peopleResults.push({
              did,
              displayName: p?.displayName || p?.username,
              username: p?.username,
            });
          }
        }

        // Groups: fetch from server, filter by name/displayName
        try {
          const allGroups = await fetchGroups();
          const filtered = allGroups.filter(
            (g) =>
              g.name.toLowerCase().includes(query) ||
              g.displayName.toLowerCase().includes(query)
          );
          groupResults.push(
            ...filtered.map((g) => ({ id: g.id, name: g.name, displayName: g.displayName }))
          );
        } catch {
          /* Server/groups unavailable */
        }

        setPeople(peopleResults);
        setGroups(groupResults);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [user?.did, q]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = (e.target as HTMLFormElement).querySelector('input')?.value?.trim() || '';
    setLocation(value ? `/search?q=${encodeURIComponent(value)}` : '/search');
    setSearchInput(value);
  };

  if (!user) {
    return <Login />;
  }

  const query = (q || searchInput).trim();
  const hasQuery = !!query;
  const hasResults = people.length > 0 || groups.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#18191a] text-[#e4e6eb]">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />
        <main className="flex-1 overflow-y-auto py-4 px-4 md:px-6">
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSearchSubmit} className="mb-6">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#b0b3b8]" />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search for people or groups"
                  className="w-full bg-[#242526] border border-[#3a3b3c] rounded-lg py-2.5 pl-10 pr-4 text-[#e4e6eb] placeholder:text-[#b0b3b8] focus:outline-none focus:ring-1 focus:ring-[#3499f0]"
                  autoFocus
                />
              </div>
            </form>

            {loading ? (
              <div className="flex flex-col items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#3499f0] mb-3" />
                <p className="text-[#b0b3b8]">Searching...</p>
              </div>
            ) : !hasQuery ? (
              <div className="p-8 text-center rounded-lg border border-[#3a3b3c] bg-[#242526]">
                <SearchIcon className="h-12 w-12 mx-auto mb-3 text-[#b0b3b8] opacity-50" />
                <h3 className="font-medium mb-2">Search gHosted</h3>
                <p className="text-[#b0b3b8] text-sm">Find people or groups by name, username, or DID.</p>
              </div>
            ) : !hasResults ? (
              <div className="p-8 text-center rounded-lg border border-[#3a3b3c] bg-[#242526]">
                <SearchIcon className="h-12 w-12 mx-auto mb-3 text-[#b0b3b8] opacity-50" />
                <h3 className="font-medium mb-2">No results</h3>
                <p className="text-[#b0b3b8] text-sm">Nothing matched &quot;{query}&quot;</p>
              </div>
            ) : (
              <div className="space-y-6">
                {people.length > 0 && (
                  <section>
                    <h2 className="text-sm font-medium text-[#b0b3b8] uppercase tracking-wider mb-3 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      People ({people.length})
                    </h2>
                    <div className="space-y-2">
                      {people.map((p) => (
                        <Link key={p.did} href="/users">
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-[#242526] border border-[#3a3b3c] hover:bg-[#3a3b3c] cursor-pointer">
                            <div className="h-10 w-10 rounded-full bg-[#3a3b3c] flex items-center justify-center text-[#e4e6eb] font-medium">
                              {(p.displayName || p.did).charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">
                                {p.displayName || p.username || `${p.did.slice(0, 16)}…`}
                              </div>
                              <div className="text-xs text-[#b0b3b8] truncate">{p.did}</div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

                {groups.length > 0 && (
                  <section>
                    <h2 className="text-sm font-medium text-[#b0b3b8] uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Groups ({groups.length})
                    </h2>
                    <div className="space-y-2">
                      {groups.map((g) => (
                        <Link key={g.id} href={`/groups`}>
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-[#242526] border border-[#3a3b3c] hover:bg-[#3a3b3c] cursor-pointer">
                            <div className="h-10 w-10 rounded-full bg-[#3499f0]/20 flex items-center justify-center text-[#3499f0]">
                              <Users className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{g.displayName}</div>
                              <div className="text-xs text-[#b0b3b8] truncate">@{g.name}</div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
