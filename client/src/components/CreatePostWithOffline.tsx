import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Image as ImageIcon, Smile, Send, Loader2, WifiOff, X } from 'lucide-react';
import { useOfflineContent } from '@/hooks/use-offline-content';
import { useAuth } from '@/hooks/use-auth';
import { useSync } from '@/contexts/SyncContext';
import { useToast } from '@/hooks/use-toast';

export function CreatePostWithOffline() {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaBlob, setMediaBlob] = useState<Blob | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { createPost } = useOfflineContent();
  const { user } = useAuth();
  const { isOffline } = useSync();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Only images are supported',
        variant: 'destructive',
      });
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: 'File too large',
        description: 'Images must be smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }
    
    // Create preview URL and store the blob
    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setMediaBlob(file);
  };
  
  const handleRemoveMedia = () => {
    setMediaPreview(null);
    setMediaBlob(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() && !mediaBlob) {
      toast({
        title: 'Empty post',
        description: 'Please enter some content or add an image for your post',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Create post using the offline-capable function
      await createPost(content, undefined, mediaBlob || undefined);
      
      // Reset form
      setContent('');
      setMediaPreview(null);
      setMediaBlob(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Success toast based on connection status
      toast({
        title: isOffline ? 'Post saved locally' : 'Post created',
        description: isOffline
          ? 'Your post will be synced when you reconnect'
          : 'Your post has been published successfully',
      });
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: 'Error',
        description: 'Failed to create post. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mb-6 bg-[#242526] border-[#3a3b3c]">
      <form onSubmit={handleSubmit}>
        <CardContent className="p-4">
          <div className="flex space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src="" alt={user?.displayName || 'User'} />
              <AvatarFallback>{user?.displayName?.substring(0, 2).toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <Textarea
              placeholder={isOffline 
                ? "What's on your mind? (You're offline, but this will sync later)" 
                : "What's on your mind?"}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="bg-[#3a3b3c] border-[#3a3b3c] text-[#e4e6eb] placeholder:text-[#b0b3b8] min-h-[80px] flex-1 resize-none"
            />
          </div>
          
          {/* Media preview section */}
          {mediaPreview && (
            <div className="mt-3 relative">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/50 hover:bg-black/70 text-white" 
                onClick={handleRemoveMedia}
              >
                <X className="h-4 w-4" />
              </Button>
              <img 
                src={mediaPreview} 
                alt="Post attachment" 
                className="rounded-md max-h-60 max-w-full object-contain border border-[#3a3b3c]"
              />
            </div>
          )}
          
          {/* Offline indicator */}
          {isOffline && (
            <div className="mt-2 flex items-center text-amber-500 text-xs">
              <WifiOff className="h-3 w-3 mr-1" />
              <span>You're offline. Posts will be saved locally and synced when you're back online.</span>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="p-3 pt-0 border-t border-[#3a3b3c] flex justify-between">
          <div className="flex space-x-1">
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
              disabled={isSubmitting}
            />
            
            {/* Photo button */}
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              className="text-[#e4e6eb] hover:bg-[#3a3b3c]"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting}
            >
              <ImageIcon className="h-4 w-4 mr-1" />
              <span className="text-xs">Photo</span>
            </Button>
            
            {/* Emoji button (just for UI, not functional) */}
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              className="text-[#e4e6eb] hover:bg-[#3a3b3c]"
              disabled={isSubmitting}
            >
              <Smile className="h-4 w-4 mr-1" />
              <span className="text-xs">Emoji</span>
            </Button>
          </div>
          
          <Button 
            type="submit" 
            size="sm" 
            className="bg-[#2374e1] hover:bg-[#2374e1]/90 text-white"
            disabled={isSubmitting || (!content.trim() && !mediaBlob)}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                <span>Posting...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-1" />
                <span>Post</span>
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}