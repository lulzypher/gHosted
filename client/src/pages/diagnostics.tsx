import React from 'react';
import { Link } from 'wouter';
import { Wifi, Info, ArrowLeft, Settings } from 'lucide-react';
import NetworkDiagnosticTool from '@/components/NetworkDiagnosticTool';
import WebSocketStatus from '@/components/WebSocketStatus';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/contexts/UserContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { usePeerDiscovery } from '@/contexts/PeerDiscoveryContext';

const DiagnosticsPage: React.FC = () => {
  const { user } = useUser();
  const { isConnected: wsConnected, lastActivity } = useWebSocket();
  const { localPeers, connectionStatus } = usePeerDiscovery();
  
  // Calculate connected peers
  const connectedPeers = localPeers.filter(peer => peer.status === 'connected').length;
  const totalPeers = localPeers.length;
  
  // Format the last activity time if it exists
  const formatLastActivity = () => {
    if (!lastActivity) return 'No recent activity';
    
    const now = new Date();
    const diff = now.getTime() - lastActivity.getTime();
    
    if (diff < 60000) {
      return 'Just now';
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)} minute(s) ago`;
    } else {
      return lastActivity.toLocaleTimeString();
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 container mx-auto p-4 md:p-6">
        <div className="flex items-center mb-6 gap-4">
          <Link to="/home">
            <Button variant="outline" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Network Diagnostics</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <NetworkDiagnosticTool />
          </div>
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Connection Status</CardTitle>
                <CardDescription>Current network status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm text-muted-foreground">WebSocket</span>
                    <div className="flex items-center space-x-2">
                      <div className={`h-2 w-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span>{wsConnected ? 'Connected' : 'Disconnected'}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {wsConnected ? formatLastActivity() : 'Using fallback mode'}
                    </span>
                  </div>
                  
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm text-muted-foreground">Peer Network</span>
                    <div className="flex items-center space-x-2">
                      <div className={`h-2 w-2 rounded-full ${
                        connectedPeers > 0 ? 'bg-green-500' : 
                        totalPeers > 0 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                      <span>{
                        connectedPeers > 0 ? 'Connected' : 
                        totalPeers > 0 ? 'Discovered' : 'No Peers'
                      }</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {connectedPeers} connected of {totalPeers} peers
                    </span>
                  </div>
                </div>
                
                <div className="text-sm">
                  <WebSocketStatus showReconnect={true} />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Info className="h-4 w-4 mr-2" />
                  Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>
                  <strong>Not seeing peers?</strong> Make sure other devices are on the same WiFi network.
                </p>
                <p>
                  <strong>WebSocket issues?</strong> This is for real-time updates only. The app will work in offline mode.
                </p>
                <p>
                  <strong>IPFS errors?</strong> Content will sync when connection is restored.
                </p>
                <div className="pt-2">
                  <Link to="/settings">
                    <Button variant="outline" size="sm" className="w-full gap-1">
                      <Settings className="h-4 w-4" /> Adjust Connection Settings
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DiagnosticsPage;