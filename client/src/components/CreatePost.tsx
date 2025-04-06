import React, { useState, useRef } from 'react';
import { useUser } from '@/contexts/UserContext';
import { usePosts } from '@/hooks/use-posts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader, Image, File, SendIcon, User } from 'lucide-react';

const CreatePost: React.FC = () => {
  const { user } = useUser();
  const { createPost, isCreatingPost } = usePosts();
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) return;
    
    createPost({
      content,
      image: imageFile || undefined
    });
    
    // Reset form
    setContent('');
    setImageFile(null);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImageFile(e.target.files[0]);
    }
  };
  
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <form onSubmit={handleSubmit}>
        <div className="flex space-x-3">
          <div className="h-10 w-10 rounded-full overflow-hidden">
            {user.avatarCid ? (
              <img 
                src={`https://ipfs.io/ipfs/${user.avatarCid}`}
                alt={`${user.displayName}'s profile`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gray-200 text-gray-600">
                <User className="h-5 w-5" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <Input
              type="text"
              placeholder="What's on your mind?"
              className="w-full px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-1 focus:ring-primary"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isCreatingPost}
            />
            
            {imageFile && (
              <div className="mt-2 relative">
                <div className="w-full rounded-lg overflow-hidden bg-gray-100 p-2">
                  <div className="flex items-center">
                    <Image className="h-5 w-5 mr-2 text-gray-500" />
                    <span className="text-sm truncate">{imageFile.name}</span>
                  </div>
                </div>
                <button 
                  type="button"
                  className="absolute -top-1 -right-1 bg-gray-200 rounded-full p-1 text-gray-600 hover:bg-gray-300"
                  onClick={() => setImageFile(null)}
                >
                  <span className="text-xs">✕</span>
                </button>
              </div>
            )}
            
            <div className="flex mt-3 space-x-2">
              <Button
                type="button"
                variant="ghost"
                className="flex items-center justify-center space-x-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex-1"
                onClick={triggerFileInput}
                disabled={isCreatingPost}
              >
                <Image className="h-4 w-4" />
                <span className="text-sm">Photo</span>
              </Button>
              
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
                disabled={isCreatingPost}
              />
              
              <Button
                type="button"
                variant="ghost"
                className="flex items-center justify-center space-x-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex-1"
                onClick={() => {}} // This would be for attaching files other than images
                disabled={isCreatingPost}
              >
                <File className="h-4 w-4" />
                <span className="text-sm">File</span>
              </Button>
              
              <Button
                type="submit"
                className="flex items-center justify-center space-x-1 px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-blue-600 flex-1"
                disabled={!content.trim() || isCreatingPost}
              >
                {isCreatingPost ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <SendIcon className="h-4 w-4" />
                )}
                <span className="text-sm">Post</span>
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreatePost;
