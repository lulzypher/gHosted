import React, { useState, useEffect } from 'react';
import { getUnresolvedConflicts, resolveConflict } from '@/lib/localStore';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { Clock, CloudOff, Database, Merge, ArrowDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ConflictData {
  id: string;
  entityType: 'post' | 'profile' | 'pin';
  entityId: string;
  timestamp: number;
  data: {
    local: any;
    remote: any;
  };
}

export function ConflictResolution() {
  const [conflicts, setConflicts] = useState<ConflictData[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);
  
  // Load conflicts
  useEffect(() => {
    const checkForConflicts = async () => {
      try {
        setLoading(true);
        const unresolvedConflicts = await getUnresolvedConflicts();
        
        if (unresolvedConflicts.length > 0) {
          setConflicts(unresolvedConflicts as ConflictData[]);
          setOpen(true);
        } else {
          setConflicts([]);
          setOpen(false);
        }
      } catch (error) {
        console.error('Error checking for conflicts:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkForConflicts();
    
    // Check for new conflicts periodically
    const interval = setInterval(checkForConflicts, 60000);
    return () => clearInterval(interval);
  }, []);
  
  // Handle resolving a conflict
  const handleResolve = async (conflictId: string, resolution: 'local' | 'remote' | 'merged') => {
    try {
      setResolving(conflictId);
      await resolveConflict(conflictId, resolution);
      
      // Remove this conflict from the list
      setConflicts(conflicts.filter(conflict => conflict.id !== conflictId));
      
      // Close dialog if no more conflicts
      if (conflicts.length <= 1) {
        setOpen(false);
      }
    } catch (error) {
      console.error('Error resolving conflict:', error);
    } finally {
      setResolving(null);
    }
  };
  
  // Format the conflict data for display
  const formatConflictContent = (conflict: ConflictData) => {
    if (conflict.entityType === 'post') {
      return {
        title: 'Post Content Conflict',
        localContent: conflict.data.local.content,
        remoteContent: conflict.data.remote.content,
        timestamp: conflict.timestamp
      };
    }
    
    if (conflict.entityType === 'profile') {
      return {
        title: 'Profile Data Conflict',
        localContent: `${conflict.data.local.displayName || ''} - ${conflict.data.local.bio || ''}`,
        remoteContent: `${conflict.data.remote.displayName || ''} - ${conflict.data.remote.bio || ''}`,
        timestamp: conflict.timestamp
      };
    }
    
    return {
      title: 'Data Conflict',
      localContent: JSON.stringify(conflict.data.local),
      remoteContent: JSON.stringify(conflict.data.remote),
      timestamp: conflict.timestamp
    };
  };
  
  if (conflicts.length === 0 && !loading) {
    return null;
  }
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Sync Conflicts Detected</DialogTitle>
          <DialogDescription>
            We found differences between your local data and what's on the network.
            Please review and choose which version to keep.
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-[100px] w-full" />
            <Skeleton className="h-[100px] w-full" />
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 py-4">
              {conflicts.map(conflict => {
                const { title, localContent, remoteContent, timestamp } = formatConflictContent(conflict);
                const timeAgo = formatDistanceToNow(new Date(timestamp), { addSuffix: true });
                const isResolving = resolving === conflict.id;
                
                return (
                  <Card key={conflict.id} className="border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Merge className="h-4 w-4" />
                        {title}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> 
                        Conflict detected {timeAgo}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                            <CloudOff className="h-3 w-3" /> 
                            <span>Local version (this device)</span>
                          </div>
                          <Alert variant="outline" className="h-32 overflow-auto">
                            <AlertDescription className="text-xs">
                              {localContent}
                            </AlertDescription>
                          </Alert>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                            <Database className="h-3 w-3" /> 
                            <span>Remote version (from server/peers)</span>
                          </div>
                          <Alert variant="outline" className="h-32 overflow-auto">
                            <AlertDescription className="text-xs">
                              {remoteContent}
                            </AlertDescription>
                          </Alert>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <div className="flex justify-between w-full gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={isResolving}
                          onClick={() => handleResolve(conflict.id, 'local')}
                        >
                          {isResolving ? (
                            <>
                              <ArrowDown className="mr-1 h-3 w-3 animate-bounce" />
                              Keeping local...
                            </>
                          ) : (
                            'Keep local'
                          )}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={isResolving}
                          onClick={() => handleResolve(conflict.id, 'remote')}
                        >
                          {isResolving ? (
                            <>
                              <ArrowDown className="mr-1 h-3 w-3 animate-bounce" />
                              Keeping remote...
                            </>
                          ) : (
                            'Keep remote'
                          )}
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}
        
        <DialogFooter>
          <div className="flex items-center justify-end gap-2">
            <Button 
              variant="ghost"
              disabled={conflicts.length === 0 || loading}
              onClick={() => setOpen(false)}
            >
              Later
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}