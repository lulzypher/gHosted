import React, { useState } from 'react';
import { Link } from 'wouter';
import { Heart, MessageCircle, Share2, MoreHorizontal, Save } from 'lucide-react';

export interface PostType {
  id: number;
  authorId: number;
  authorName: string;
  authorUsername: string;
  authorAvatar?: string;
  content: string;
  mediaCid?: string;
  createdAt: string;
  cid: string;
  likes: number;
  comments: number;
  reposts: number;
  isLiked?: boolean;
  isLoved?: boolean;
}

export function Post({ post }: { post: PostType }) {
  const [liked, setLiked] = useState(post.isLiked || false);
  const [loved, setLoved] = useState(post.isLoved || false);
  const [likeCount, setLikeCount] = useState(post.likes);
  
  const handleLike = () => {
    if (liked) {
      setLiked(false);
      setLikeCount(prev => prev - 1);
    } else {
      setLiked(true);
      setLikeCount(prev => prev + 1);
    }
  };
  
  const handleLove = () => {
    setLoved(prev => !prev);
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };
  
  return (
    <div className="bg-[#242526] rounded-lg shadow-sm mb-4 overflow-hidden">
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center space-x-3">
            <Link href={`/profile/${post.authorId}`}>
              <a className="flex-shrink-0 h-10 w-10 rounded-full overflow-hidden border border-[#3a3b3c]">
                {post.authorAvatar ? (
                  <img
                    src={`https://ipfs.io/ipfs/${post.authorAvatar}`}
                    alt={post.authorName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-[#3a3b3c] flex items-center justify-center text-[#e4e6eb] font-medium">
                    {post.authorName.charAt(0)}
                  </div>
                )}
              </a>
            </Link>
            <div>
              <Link href={`/profile/${post.authorId}`}>
                <a className="font-medium text-[#e4e6eb] hover:underline">
                  {post.authorName}
                </a>
              </Link>
              <div className="flex items-center text-xs text-[#b0b3b8]">
                <span className="mr-1">@{post.authorUsername}</span>
                <span className="mx-1">•</span>
                <span>{formatDate(post.createdAt)}</span>
                {post.cid && (
                  <>
                    <span className="mx-1">•</span>
                    <span className="inline-flex items-center bg-[#3a3b3c] px-1.5 py-0.5 rounded text-[0.65rem]">
                      {post.cid.substring(0, 6)}...
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button className="p-1 text-[#b0b3b8] hover:text-[#e4e6eb] rounded-full hover:bg-[#3a3b3c]">
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>
        
        <div className="mb-3">
          <p className="text-[#e4e6eb] whitespace-pre-line">{post.content}</p>
        </div>
        
        {post.mediaCid && (
          <div className="my-3 rounded-lg overflow-hidden bg-[#3a3b3c]">
            <img
              src={`https://ipfs.io/ipfs/${post.mediaCid}`}
              alt="Post media"
              className="w-full h-auto object-cover max-h-96"
            />
          </div>
        )}
        
        <div className="flex items-center text-xs text-[#b0b3b8] pt-2">
          <div className="flex items-center mr-4">
            <Heart className="h-3.5 w-3.5 mr-1 fill-rose-500 text-rose-500" />
            <span>{likeCount}</span>
          </div>
          <div className="mr-4">
            <span>{post.comments} comments</span>
          </div>
          <div>
            <span>{post.reposts} reposts</span>
          </div>
        </div>
      </div>
      
      <div className="flex border-t border-[#3a3b3c] divide-x divide-[#3a3b3c]">
        <button
          onClick={handleLike}
          className={`flex items-center justify-center py-2.5 flex-1 text-sm font-medium ${
            liked
              ? 'text-rose-500'
              : 'text-[#b0b3b8] hover:text-[#e4e6eb] hover:bg-[#3a3b3c]'
          }`}
        >
          <Heart className={`h-4 w-4 mr-2 ${liked ? 'fill-rose-500 text-rose-500' : ''}`} />
          Like
        </button>
        <button
          onClick={handleLove}
          className={`flex items-center justify-center py-2.5 flex-1 text-sm font-medium ${
            loved
              ? 'text-[#3499f0]'
              : 'text-[#b0b3b8] hover:text-[#e4e6eb] hover:bg-[#3a3b3c]'
          }`}
        >
          <Save className={`h-4 w-4 mr-2 ${loved ? 'fill-[#3499f0] text-[#3499f0]' : ''}`} />
          {loved ? 'Saved to PC+Mobile' : 'Save to PC'}
        </button>
        <button className="flex items-center justify-center py-2.5 flex-1 text-sm font-medium text-[#b0b3b8] hover:text-[#e4e6eb] hover:bg-[#3a3b3c]">
          <MessageCircle className="h-4 w-4 mr-2" />
          Comment
        </button>
        <button className="flex items-center justify-center py-2.5 flex-1 text-sm font-medium text-[#b0b3b8] hover:text-[#e4e6eb] hover:bg-[#3a3b3c]">
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </button>
      </div>
    </div>
  );
}