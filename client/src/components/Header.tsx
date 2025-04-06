import React from 'react';
import { Bell, Search, Settings, MessageSquare } from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '@/hooks/use-auth';

export function Header() {
  const { user } = useAuth();
  
  return (
    <header className="sticky top-0 z-10 w-full bg-background border-b border-border/40 dark:border-border/20 shadow-sm">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="flex items-center mr-4">
          <Link href="/">
            <a className="flex items-center space-x-2">
              <span className="text-2xl font-semibold text-primary">gHosted</span>
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-medium">
                Online
              </span>
            </a>
          </Link>
        </div>
        
        <div className="flex-1 flex items-center justify-center px-2">
          <div className="w-full max-w-md relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search gHosted"
              className="w-full bg-muted/50 dark:bg-muted/20 rounded-full py-2 pl-8 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/50">
            <MessageSquare className="h-5 w-5" />
          </button>
          <button className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/50 relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[0.65rem] font-medium text-primary-foreground">
              2
            </span>
          </button>
          <button className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/50">
            <Settings className="h-5 w-5" />
          </button>
          <Link href="/profile">
            <a className="ml-2 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-border/50 hover:border-border">
              {user?.avatarCid ? (
                <img
                  src={`https://ipfs.io/ipfs/${user.avatarCid}`}
                  alt={user.displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                  {user?.displayName?.charAt(0) || user?.username?.charAt(0) || '?'}
                </div>
              )}
            </a>
          </Link>
        </div>
      </div>
    </header>
  );
}