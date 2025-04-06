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
    <div className="bg-card dark:bg-card/90 rounded-lg shadow-sm p-4 mb-4">
      <div className="flex space-x-3">
        <div className="flex-shrink-0 h-10 w-10 rounded-full overflow-hidden border border-border/40">
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
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <textarea
                placeholder="What's on your mind?"
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                className="w-full border-0 bg-transparent resize-none rounded-md focus:ring-0 text-foreground placeholder:text-muted-foreground min-h-[80px]"
              />
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t border-border/20">
              <div className="flex space-x-2">
                <button
                  type="button"
                  className="inline-flex items-center px-3 py-1.5 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50"
                >
                  <Image className="h-4 w-4 mr-2" />
                  Photo
                </button>
                <button
                  type="button"
                  className="inline-flex items-center px-3 py-1.5 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  File
                </button>
              </div>
              
              <button
                type="submit"
                disabled={!postText.trim()}
                className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
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