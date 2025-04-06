import React, { useState } from 'react';
import { Image, FileText, Send } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export function CreatePost() {
  const { user } = useAuth();
  const [postText, setPostText] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle post submission here - would connect to IPFS
    console.log('Submitting post:', postText);
    setPostText('');
  };
  
  return (
    <div className="bg-[#242526] rounded-lg shadow-sm p-4 mb-4">
      <div className="flex space-x-3">
        <div className="flex-shrink-0 h-10 w-10 rounded-full overflow-hidden border border-[#3a3b3c]">
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
        
        <div className="flex-1 min-w-0">
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <textarea
                placeholder="What's on your mind?"
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                className="w-full border-0 bg-transparent resize-none rounded-md focus:ring-0 text-[#e4e6eb] placeholder:text-[#b0b3b8] min-h-[80px]"
              />
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t border-[#3a3b3c]">
              <div className="flex space-x-2">
                <button
                  type="button"
                  className="inline-flex items-center px-3 py-1.5 text-sm rounded-md text-[#b0b3b8] hover:text-[#e4e6eb] hover:bg-[#3a3b3c]"
                >
                  <Image className="h-4 w-4 mr-2 text-green-500" />
                  Photo
                </button>
                <button
                  type="button"
                  className="inline-flex items-center px-3 py-1.5 text-sm rounded-md text-[#b0b3b8] hover:text-[#e4e6eb] hover:bg-[#3a3b3c]"
                >
                  <FileText className="h-4 w-4 mr-2 text-blue-400" />
                  File
                </button>
              </div>
              
              <button
                type="submit"
                disabled={!postText.trim()}
                className="inline-flex items-center px-4 py-2 rounded-md bg-[#3499f0] text-white hover:bg-[#2d88d8] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4 mr-2" />
                Post
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}