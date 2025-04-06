import { useQuery, useMutation } from '@tanstack/react-query';
import { PeerConnection, PeerConnectionStatus } from '@/types';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useUser } from '@/contexts/UserContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';

// Hook for peer connection operations
export const usePeerConnections = () => {
  const { user } = useUser();
  const { isConnected: isWebSocketConnected } = useWebSocket();
  const { toast } = useToast();
  const [onlinePeers, setOnlinePeers] = useState<number>(0);
  
  // Get user's peer connections
  const {
    data: peerConnections = [] as PeerConnection[],
    isLoading: isLoadingPeers,
    error: peersError,
    refetch: refetchPeers
  } = useQuery<PeerConnection[]>({
    queryKey: [`/api/users/${user?.id}/peer-connections`],
    enabled: !!user,
    refetchInterval: isWebSocketConnected ? undefined : 30000, // Only poll if WebSocket is disconnected
    staleTime: isWebSocketConnected ? Infinity : 30000 // Keep data fresh if WebSocket is connected
  });
  
  // Update state for online peers count
  useEffect(() => {
    if (Array.isArray(peerConnections)) {
      const onlineCount = peerConnections.filter(
        (peer) => peer && peer.status === PeerConnectionStatus.CONNECTED
      ).length;
      setOnlinePeers(onlineCount);
    }
  }, [peerConnections]);
  
  // Update peer connection status
  const updatePeerStatusMutation = useMutation({
    mutationFn: async ({ peerId, status }: { peerId: number, status: string }): Promise<PeerConnection> => {
      if (!user) throw new Error('User not logged in');
      
      const response = await apiRequest('PUT', `/api/peer-connections/${peerId}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate peers query to refresh the list
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/peer-connections`] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update peer status.",
      });
    }
  });
  
  // Register a new peer connection
  const registerPeerMutation = useMutation({
    mutationFn: async (peerId: string): Promise<PeerConnection> => {
      if (!user) throw new Error('User not logged in');
      
      const response = await apiRequest('POST', '/api/peer-connections', {
        userId: user.id,
        peerId,
        status: PeerConnectionStatus.CONNECTED
      });
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate peers query to refresh the list
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/peer-connections`] });
      
      toast({
        title: "Peer Connected",
        description: "New peer connection established.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to register peer connection.",
      });
    }
  });
  
  // Check if the WebSocket connection affects network status
  useEffect(() => {
    // If we're online and WebSocket is connected, trigger a refresh
    if (navigator.onLine && isWebSocketConnected && user) {
      refetchPeers();
    }
  }, [isWebSocketConnected, user, refetchPeers]);

  return {
    peerConnections,
    onlinePeers,
    isLoadingPeers,
    peersError,
    refetchPeers,
    updatePeerStatus: updatePeerStatusMutation.mutate,
    isUpdatingPeerStatus: updatePeerStatusMutation.isPending,
    registerPeer: registerPeerMutation.mutate,
    isRegisteringPeer: registerPeerMutation.isPending,
    isWebSocketConnected
  };
};
