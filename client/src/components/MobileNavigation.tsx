import React from 'react';
import { Link, useLocation } from 'wouter';
import { 
  Home, 
  User, 
  PlusCircle, 
  HardDrive, 
  Settings,
  LogOut 
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

const MobileNavigation: React.FC = () => {
  const [location] = useLocation();
  const { logoutMutation } = useAuth();
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200 z-50">
      <div className="grid grid-cols-5">
        <Link href="/">
          <a className={`py-3 flex flex-col items-center ${location === '/' ? 'text-primary' : 'text-gray-500'}`}>
            <Home className="h-5 w-5" />
            <span className="text-xs mt-1">Home</span>
          </a>
        </Link>
        
        <Link href="/profile">
          <a className={`py-3 flex flex-col items-center ${location === '/profile' ? 'text-primary' : 'text-gray-500'}`}>
            <User className="h-5 w-5" />
            <span className="text-xs mt-1">Profile</span>
          </a>
        </Link>
        
        <Link href="/">
          <a className="py-3 flex flex-col items-center text-gray-500" onClick={(e) => {
            e.preventDefault();
            // Scroll to the create post component and focus on the input
            const createPostInput = document.querySelector('input[placeholder="What\'s on your mind?"]');
            if (createPostInput) {
              createPostInput.scrollIntoView({ behavior: 'smooth' });
              (createPostInput as HTMLInputElement).focus();
            }
          }}>
            <PlusCircle className="h-6 w-6 text-primary" />
            <span className="text-xs mt-1">Post</span>
          </a>
        </Link>
        
        <Link href="/storage">
          <a className={`py-3 flex flex-col items-center ${location === '/storage' ? 'text-primary' : 'text-gray-500'}`}>
            <HardDrive className="h-5 w-5" />
            <span className="text-xs mt-1">Storage</span>
          </a>
        </Link>

        <button 
          onClick={handleLogout}
          className="py-3 flex flex-col items-center text-red-500 bg-transparent border-none"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-xs mt-1">Logout</span>
        </button>
      </div>
    </nav>
  );
};

export default MobileNavigation;
