import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Home, User, Users, Bookmark, Settings, Laptop, Smartphone } from 'lucide-react';

export function LeftSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  
  const isActive = (path: string) => location === path;
  
  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: User, label: 'Profile', path: '/profile' },
    { icon: Users, label: 'Communities', path: '/communities' },
    { icon: Bookmark, label: 'Saved Posts', path: '/saved' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];
  
  return (
    <div className="w-full max-w-[240px] h-[calc(100vh-3.5rem)] overflow-y-auto scrollbar-hide flex flex-col bg-background border-r border-border/20 dark:border-border/10">
      <div className="p-4">
        <div className="flex items-center space-x-3 mb-6">
          <div className="flex-shrink-0 h-11 w-11 rounded-full overflow-hidden border border-border/40">
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
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-foreground truncate">
              {user?.displayName || user?.username}
            </h2>
            <p className="text-xs text-muted-foreground truncate">
              {user?.did ? `${user.did.substring(0, 11)}...` : 'Anonymous'}
            </p>
          </div>
        </div>
        
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <a
                className={`flex items-center px-3 py-2 text-sm rounded-md group transition-colors ${
                  isActive(item.path)
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <item.icon className={`h-5 w-5 mr-3 ${isActive(item.path) ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                <span>{item.label}</span>
              </a>
            </Link>
          ))}
        </nav>
      </div>
      
      <div className="mt-6 px-4">
        <h3 className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Device Sync
        </h3>
        <div className="space-y-2">
          <div className="flex items-center px-3 py-2 text-sm rounded-md text-foreground bg-muted/30 dark:bg-muted/10">
            <Laptop className="h-4 w-4 mr-3 text-green-500" />
            <span className="flex-1">Desktop</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              Synced
            </span>
          </div>
          <div className="flex items-center px-3 py-2 text-sm rounded-md text-foreground bg-muted/30 dark:bg-muted/10">
            <Smartphone className="h-4 w-4 mr-3 text-amber-500" />
            <span className="flex-1">Mobile</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              Syncing
            </span>
          </div>
        </div>
      </div>
      
      <div className="mt-4 px-4">
        <h3 className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Local Storage
        </h3>
        <div className="px-3">
          <div className="w-full h-2 rounded-full bg-muted/50 dark:bg-muted/20 overflow-hidden">
            <div className="h-full bg-primary" style={{ width: '46%' }}></div>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>456 MB used</span>
            <span>1 GB allocated</span>
          </div>
        </div>
      </div>
      
      <div className="mt-auto p-4 text-xs text-center text-muted-foreground">
        <p>© 2025 gHosted - Decentralized</p>
        <p className="mt-1">No central servers, just people.</p>
      </div>
    </div>
  );
}