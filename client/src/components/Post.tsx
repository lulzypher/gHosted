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
    <div className="bg-card dark:bg-card/90 rounded-lg shadow-sm mb-4 overflow-hidden">
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center space-x-3">
            <Link href={`/profile/${post.authorId}`}>
              <a className="flex-shrink-0 h-10 w-10 rounded-full overflow-hidden border border-border/40">
                {post.authorAvatar ? (
                  <img
                    src={`https://ipfs.io/ipfs/${post.authorAvatar}`}
                    alt={post.authorName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                    {post.authorName.charAt(0)}
                  </div>
                )}
              </a>
            </Link>
            <div>
              <Link href={`/profile/${post.authorId}`}>
                <a className="font-medium text-foreground hover:underline">
                  {post.authorName}
                </a>
              </Link>
              <div className="flex items-center text-xs text-muted-foreground">
                <span className="mr-1">@{post.authorUsername}</span>
                <span className="mx-1">•</span>
                <span>{formatDate(post.createdAt)}</span>
                {post.cid && (
                  <>
                    <span className="mx-1">•</span>
                    <span className="inline-flex items-center bg-muted/50 dark:bg-muted/20 px-1.5 py-0.5 rounded text-[0.65rem]">
                      {post.cid.substring(0, 6)}...
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button className="p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/50">
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>
        
        <div className="mb-3">
          <p className="text-foreground whitespace-pre-line">{post.content}</p>
        </div>
        
        {post.mediaCid && (
          <div className="my-3 rounded-lg overflow-hidden bg-muted/30 dark:bg-muted/10">
            <img
              src={`https://ipfs.io/ipfs/${post.mediaCid}`}
              alt="Post media"
              className="w-full h-auto object-cover max-h-96"
            />
          </div>
        )}
        
        <div className="flex items-center text-xs text-muted-foreground pt-2">
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
      
      <div className="flex border-t border-border/20 divide-x divide-border/20">
        <button
          onClick={handleLike}
          className={`flex items-center justify-center py-2.5 flex-1 text-sm font-medium ${
            liked
              ? 'text-rose-600 dark:text-rose-500'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Heart className={`h-4 w-4 mr-2 ${liked ? 'fill-rose-600 text-rose-600 dark:fill-rose-500 dark:text-rose-500' : ''}`} />
          Like
        </button>
        <button
          onClick={handleLove}
          className={`flex items-center justify-center py-2.5 flex-1 text-sm font-medium ${
            loved
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Save className={`h-4 w-4 mr-2 ${loved ? 'fill-primary text-primary' : ''}`} />
          {loved ? 'Saved to PC+Mobile' : 'Save to PC'}
        </button>
        <button className="flex items-center justify-center py-2.5 flex-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <MessageCircle className="h-4 w-4 mr-2" />
          Comment
        </button>
        <button className="flex items-center justify-center py-2.5 flex-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </button>
      </div>
    </div>
  );
}