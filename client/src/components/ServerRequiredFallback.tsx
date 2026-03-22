import React from 'react';
import { Header } from '@/components/Header';
import { LeftSidebar } from '@/components/LeftSidebar';
import { Server, MessageSquare, Users } from 'lucide-react';

interface ServerRequiredFallbackProps {
  feature: 'messages' | 'groups' | 'users';
  title?: string;
  description?: string;
}

const config = {
  messages: {
    icon: MessageSquare,
    title: 'Messages require server',
    description: 'Direct messaging uses the server backend. Run with DATABASE_URL set, or use the feed to connect with others.',
  },
  groups: {
    icon: Users,
    title: 'Groups require server',
    description: 'DAO-style groups use the server backend. Run with DATABASE_URL set to create and join groups.',
  },
  users: {
    icon: Users,
    title: 'User directory requires server',
    description: 'The full user directory uses the server. Use Search to find people you follow.',
  },
};

export function ServerRequiredFallback({ feature, title, description }: ServerRequiredFallbackProps) {
  const { icon: Icon, title: defTitle, description: defDesc } = config[feature];
  return (
    <div className="min-h-screen flex flex-col bg-[#18191a] text-[#e4e6eb]">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />
        <main className="flex-1 overflow-y-auto py-4 px-4 md:px-6">
          <div className="max-w-md mx-auto mt-16 text-center">
            <div className="p-6 rounded-xl bg-[#242526] border border-[#3a3b3c]">
              <Icon className="h-16 w-16 mx-auto mb-4 text-[#b0b3b8] opacity-70" />
              <h2 className="text-xl font-semibold mb-2">{title ?? defTitle}</h2>
              <p className="text-[#b0b3b8] text-sm">{description ?? defDesc}</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
