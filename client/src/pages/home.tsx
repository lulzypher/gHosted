import React from 'react';
import { useUser } from '@/contexts/UserContext';
import Header from '@/components/Header';
import LeftSidebar from '@/components/LeftSidebar';
import ContentFeed from '@/components/ContentFeed';
import RightSidebar from '@/components/RightSidebar';
import MobileNavigation from '@/components/MobileNavigation';
import Login from './login';

const Home: React.FC = () => {
  const { user, isLoading } = useUser();

  // If user is not logged in, show login page
  if (!isLoading && !user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-1 container mx-auto px-4 py-4 flex flex-col md:flex-row gap-4">
        {/* Left Sidebar */}
        <LeftSidebar />
        
        {/* Content Feed */}
        <ContentFeed />
        
        {/* Right Sidebar */}
        <RightSidebar />
      </main>
      
      {/* Mobile Navigation */}
      <MobileNavigation />
    </div>
  );
};

export default Home;
