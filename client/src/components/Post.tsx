import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Post as PostType, PinType } from '@/types';
import { usePostPins } from '@/hooks/use-posts';
import { Pin, MessageCircle, Repeat, User, HardDrive, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PostProps {
  post: PostType;
}

const Post: React.FC<PostProps> = ({ post }) => {
  const { isLiked, isLoved, likePost, lovePost } = usePostPins(post);
  const [showComments, setShowComments] = useState(false);

  // Format date for display
  const formattedDate = post.createdAt 
    ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })
    : 'recently';

  // Extract the first part of the CID for display
  const shortenedCid = post.contentCid ? 
    `${post.contentCid.substring(0, 7)}...` : 
    'Unknown';

  return (
    <div className={`bg-white rounded-xl shadow-sm p-4 post-transition ${
      isLoved ? 'border-2 border-accent' : isLiked ? 'border border-accent' : ''
    }`}>
      {/* Post Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex space-x-3">
          <div className="h-10 w-10 rounded-full overflow-hidden">
            {post.user?.avatarCid ? (
              <img 
                src={`https://ipfs.io/ipfs/${post.user.avatarCid}`}
                alt={`${post.user.displayName} profile`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gray-200 text-gray-600">
                <User className="h-5 w-5" />
              </div>
            )}
          </div>
          <div>
            <h3 className="font-medium">{post.user?.displayName || 'Unknown User'}</h3>
            <p className="text-xs text-gray-500 flex items-center">
              <span>{formattedDate}</span>
              <span className="mx-1">•</span>
              <i className="ri-earth-line"></i>
            </p>
          </div>
        </div>
        
        {/* IPFS Hash */}
        <div className="relative group">
          <div className={`flex items-center text-xs ${
            isLoved || isLiked ? 'bg-accent bg-opacity-10' : 'bg-gray-100'
          } px-2 py-1 rounded-md`}>
            {isLoved || isLiked ? (
              <>
                {isLoved ? (
                  <div className="flex">
                    <HardDrive className="mr-1 h-3 w-3 text-accent" />
                    <Smartphone className="mr-1 h-3 w-3 text-accent" />
                  </div>
                ) : (
                  <Pin className="mr-1 h-3 w-3 text-accent" />
                )}
                <span className="text-gray-700 truncate max-w-[80px]">{shortenedCid}</span>
              </>
            ) : (
              <>
                <HardDrive className="mr-1 h-3 w-3 text-accent" />
                <span className="text-gray-500 truncate max-w-[80px]">{shortenedCid}</span>
              </>
            )}
          </div>
          <div className="hidden group-hover:block absolute bg-black text-white text-xs p-2 rounded whitespace-nowrap right-0 mt-1 z-10">
            {isLoved 
              ? 'Pinned to all your devices | ' 
              : isLiked 
                ? 'Pinned to your PC | ' 
                : ''}
            IPFS CID: {post.contentCid}
          </div>
        </div>
      </div>
      
      {/* Post Content */}
      <div className="mb-4">
        <p className="mb-3">{post.content}</p>
        {post.imageCid && (
          <div className="rounded-lg overflow-hidden">
            <img 
              src={`https://ipfs.io/ipfs/${post.imageCid}`}
              alt="Post image" 
              className="w-full h-auto"
            />
          </div>
        )}
      </div>
      
      {/* Post Engagement Stats - Mock data for now */}
      <div className="flex justify-between items-center text-sm text-gray-500 mb-3 pb-3 border-b border-gray-100">
        <div className="flex items-center space-x-1">
          <div className="flex -space-x-1">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-500 text-xs">❤️</span>
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-500 text-xs">❤️‍🔥</span>
          </div>
          <span>{Math.floor(Math.random() * 100)}</span>
        </div>
        <div>
          <span>{Math.floor(Math.random() * 30)} comments</span>
          <span className="mx-1">•</span>
          <span>{Math.floor(Math.random() * 20)} reposts</span>
        </div>
      </div>
      
      {/* Post Actions */}
      <div className="flex justify-between items-center">
        {/* Like Button - Pins to PC */}
        <Button
          variant="ghost"
          className={`flex items-center justify-center space-x-1 px-3 py-1.5 rounded-lg ${
            isLiked ? 'bg-red-50 text-red-500' : 'hover:bg-gray-100 text-gray-600'
          } flex-1`}
          onClick={likePost}
        >
          <span className="text-red-500">❤️</span>
          <span className="text-sm">{isLiked ? 'Liked' : 'Like'}</span>
          {isLiked && <Pin className="h-3 w-3 text-accent" />}
        </Button>
        
        {/* Love Button - Pins to PC and Mobile */}
        <Button
          variant="ghost"
          className={`flex items-center justify-center space-x-1 px-3 py-1.5 rounded-lg ${
            isLoved ? 'bg-red-50 text-red-500' : 'hover:bg-gray-100 text-gray-600'
          } flex-1`}
          onClick={lovePost}
        >
          <span className="text-red-500">❤️‍🔥</span>
          <span className="text-sm">{isLoved ? 'Loved' : 'Love'}</span>
          {isLoved && (
            <div className="flex items-center text-accent text-sm">
              <HardDrive className="h-3 w-3" />
              <Smartphone className="h-3 w-3" />
            </div>
          )}
        </Button>
        
        {/* Comment Button */}
        <Button
          variant="ghost"
          className="flex items-center justify-center space-x-1 px-3 py-1.5 rounded-lg hover:bg-gray-100 flex-1"
          onClick={() => setShowComments(!showComments)}
        >
          <MessageCircle className="h-4 w-4" />
          <span className="text-sm text-gray-600">Comment</span>
        </Button>
        
        {/* Repost Button */}
        <Button
          variant="ghost"
          className="flex items-center justify-center space-x-1 px-3 py-1.5 rounded-lg hover:bg-gray-100 flex-1"
        >
          <Repeat className="h-4 w-4" />
          <span className="text-sm text-gray-600">Repost</span>
        </Button>
      </div>
      
      {/* Comments section - To be implemented */}
      {showComments && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-sm text-gray-500 text-center">
            Comments feature coming soon
          </p>
        </div>
      )}
    </div>
  );
};

export default Post;
