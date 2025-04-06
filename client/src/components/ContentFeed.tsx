import React from 'react';
import { usePosts } from '@/hooks/use-posts';
import CreatePost from './CreatePost';
import Post from './Post';
import { Skeleton } from '@/components/ui/skeleton';

const ContentFeed: React.FC = () => {
  const { posts, isLoadingPosts, postsError } = usePosts();

  return (
    <div className="flex-1 space-y-4 max-w-2xl mx-auto w-full">
      {/* Create Post Component */}
      <CreatePost />
      
      {/* Loading State */}
      {isLoadingPosts && (
        <>
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-4 space-y-4">
              <div className="flex items-start space-x-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-48 w-full rounded-lg" />
              </div>
              <div className="pt-2 flex justify-between">
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-8 w-1/4" />
              </div>
            </div>
          ))}
        </>
      )}
      
      {/* Error State */}
      {postsError && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-red-500 text-center">
            Error loading posts. Please try again later.
          </p>
          <p className="text-gray-500 text-center text-sm mt-2">
            {postsError instanceof Error ? postsError.message : 'Unknown error'}
          </p>
        </div>
      )}
      
      {/* Empty State */}
      {!isLoadingPosts && !postsError && posts.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <h3 className="font-semibold mb-2">No Posts Yet</h3>
          <p className="text-gray-500">
            Be the first to create a post and share with the network!
          </p>
        </div>
      )}
      
      {/* Posts */}
      {!isLoadingPosts && !postsError && posts.length > 0 && (
        <>
          {posts.map((post) => (
            <Post key={post.id} post={post} />
          ))}
        </>
      )}
    </div>
  );
};

export default ContentFeed;
