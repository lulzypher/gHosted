import React from 'react';
import { Bell, Search, Settings, MessageSquare } from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '@/hooks/use-auth';

export function Header() {
  const { user } = useAuth();
  
  return (
    <header className="sticky top-0 z-10 w-full bg-[#242526] border-b border-[#3a3b3c] shadow-sm">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="flex items-center mr-4">
          <Link href="/">
            <div className="flex items-center space-x-2 cursor-pointer">
              <img 
                src="/assets/logo.png" 
                alt="gHosted Logo" 
                className="h-9 w-auto"
              />
              <span className="bg-[#3499f0]/10 text-[#3499f0] px-2 py-0.5 rounded-full text-xs font-medium">
                Online
              </span>
            </div>
          </Link>
        </div>
        
        <div className="flex-1 flex items-center justify-center px-2">
          <div className="w-full max-w-md relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#b0b3b8]" />
            <input
              type="search"
              placeholder="Search gHosted"
              className="w-full bg-[#3a3b3c] rounded-full py-2 pl-8 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#3499f0] text-[#e4e6eb] placeholder:text-[#b0b3b8]"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Link href="/messages">
            <button className="p-2 text-[#b0b3b8] hover:text-[#e4e6eb] rounded-full hover:bg-[#3a3b3c]">
              <MessageSquare className="h-5 w-5" />
            </button>
          </Link>
          <button className="p-2 text-[#b0b3b8] hover:text-[#e4e6eb] rounded-full hover:bg-[#3a3b3c] relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#3499f0] text-[0.65rem] font-medium text-white">
              2
            </span>
          </button>
          <button className="p-2 text-[#b0b3b8] hover:text-[#e4e6eb] rounded-full hover:bg-[#3a3b3c]">
            <Settings className="h-5 w-5" />
          </button>
          <Link href="/profile">
            <div className="ml-2 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-[#3a3b3c] hover:border-[#4e4f50] cursor-pointer">
              {user?.avatarCid ? (
                <img
                  src={`https://ipfs.io/ipfs/${user.avatarCid}`}
                  alt={user.displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-[#3a3b3c] flex items-center justify-center text-[#e4e6eb] font-medium">
                  {user?.displayName?.charAt(0) || user?.username?.charAt(0) || '?'}
                </div>
              )}
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}