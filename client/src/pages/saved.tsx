import React, { useEffect } from 'react';
import { Header } from '@/components/Header';
import { LeftSidebar } from '@/components/LeftSidebar';
import MobileNavigation from '@/components/MobileNavigation';
import { useIPFS } from '@/contexts/IPFSContext';
import { useUser } from '@/contexts/UserContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PinOff, Bookmark } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ipfsUrl } from '@/lib/ipfsGateway';
import Login from './login';

export default function SavedPage() {
  const { user } = useUser();
  const { pinnedContents, refreshPinnedContents, unpinContent } = useIPFS();

  useEffect(() => {
    refreshPinnedContents();
  }, [refreshPinnedContents]);

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#18191a] text-[#e4e6eb]">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />
        <main className="flex-1 overflow-y-auto py-4 px-4 md:px-6">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Bookmark className="h-5 w-5" />
              Saved Posts
            </h1>
            <p className="text-[#b0b3b8] text-sm mb-6">
              Content you&apos;ve pinned for quick access. Unpin to remove from this list.
            </p>

            {pinnedContents.length === 0 ? (
              <div className="p-8 text-center rounded-lg border border-[#3a3b3c] bg-[#242526]">
                <Bookmark className="h-12 w-12 mx-auto mb-3 text-[#b0b3b8] opacity-50" />
                <h3 className="font-medium mb-2">No saved posts</h3>
                <p className="text-[#b0b3b8] text-sm">
                  Pin posts from your feed to save them here for later.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pinnedContents.map((pin) => {
                  const content = pin.post?.content ?? 'Saved content';
                  const createdAt = pin.post?.createdAt ?? (typeof pin.pinnedAt === 'string' ? pin.pinnedAt : pin.pinnedAt instanceof Date ? pin.pinnedAt.toISOString() : new Date().toISOString());
                  const authorDid = (pin.post as { metadata?: { authorDid?: string } })?.metadata?.authorDid;
                  const mediaCid = pin.post?.imageCid;
                  const authorLabel = authorDid ? `${authorDid.slice(0, 16)}…` : 'Unknown';

                  return (
                    <Card
                      key={pin.contentCid}
                      className="bg-[#242526] border-[#3a3b3c]"
                    >
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="text-xs text-[#b0b3b8]">
                          {authorLabel} • {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[#b0b3b8] hover:text-red-400 hover:bg-red-500/10"
                          onClick={() => unpinContent(pin.id, pin.contentCid)}
                        >
                          <PinOff className="h-4 w-4 mr-1" />
                          Unpin
                        </Button>
                      </CardHeader>
                      <CardContent>
                        <p className="text-[#e4e6eb] whitespace-pre-wrap">{content}</p>
                        {mediaCid && (
                          <div className="mt-3 rounded overflow-hidden">
                            <img
                              src={ipfsUrl(mediaCid)}
                              alt=""
                              className="max-w-full max-h-64 object-contain"
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
      <MobileNavigation />
    </div>
  );
}
