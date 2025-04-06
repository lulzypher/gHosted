import React, { useState, useEffect } from 'react';
import { QrCode, Copy, Smartphone, Laptop, ArrowRight, Check, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { usePeerDiscovery } from '@/contexts/PeerDiscoveryContext';
import { useToast } from '@/hooks/use-toast';

export function DevicePairing() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { connectionStatus } = usePeerDiscovery();
  
  const [pairingCode, setPairingCode] = useState<string>('');
  const [isGeneratingCode, setIsGeneratingCode] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [showQrCode, setShowQrCode] = useState<boolean>(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  
  // Generate a random pairing code
  const generatePairingCode = () => {
    setIsGeneratingCode(true);
    
    // Generate a random 6-character code (in production, this would come from the server)
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    setPairingCode(result);
    
    // Create a QR code URL (in production we would generate this on server side)
    // For now, we'll use a placeholder service
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const width = window.innerWidth <= 640 ? 200 : 250; // Smaller for mobile
    
    // In a real implementation, this would point to a deep link for your app
    const pairingUrl = `https://ghosted.u/pair?code=${result}&uid=${user?.id}`;
    setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=${width}x${width}&data=${encodeURIComponent(pairingUrl)}`);
    
    setTimeout(() => {
      setIsGeneratingCode(false);
    }, 1000);
  };
  
  // Copy code to clipboard
  const copyToClipboard = async () => {
    if (!pairingCode) return;
    
    try {
      await navigator.clipboard.writeText(pairingCode);
      setIsCopied(true);
      
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
      
      toast({
        title: "Code copied!",
        description: "Paste this code on your other device",
      });
    } catch (error) {
      console.error('Failed to copy: ', error);
      toast({
        title: "Failed to copy",
        description: "Please manually select and copy the code",
        variant: "destructive"
      });
    }
  };
  
  // Generate a pairing code on mount
  useEffect(() => {
    if (connectionStatus === 'ready' && user) {
      generatePairingCode();
    }
  }, [connectionStatus, user]);
  
  if (connectionStatus !== 'ready') {
    return (
      <div className="p-4 bg-[#242526] rounded-lg border border-[#3a3b3c]">
        <div className="text-center py-4">
          <p className="text-[#b0b3b8]">
            Waiting for connection...
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-4 bg-[#242526] rounded-lg border border-[#3a3b3c]">
      <h3 className="text-[#e4e6eb] font-medium mb-3">Device Pairing</h3>
      
      {/* Tabs for QR/Code switching */}
      <div className="flex border-b border-[#3a3b3c] mb-4">
        <button
          className={`px-4 py-2 text-sm font-medium ${!showQrCode ? 'text-[#3499f0] border-b-2 border-[#3499f0]' : 'text-[#b0b3b8]'}`}
          onClick={() => setShowQrCode(false)}
        >
          Pairing Code
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${showQrCode ? 'text-[#3499f0] border-b-2 border-[#3499f0]' : 'text-[#b0b3b8]'}`}
          onClick={() => setShowQrCode(true)}
        >
          QR Code
        </button>
      </div>
      
      {/* QR Code View */}
      {showQrCode && (
        <div className="flex flex-col items-center py-2">
          <div className="bg-white p-3 rounded-lg mb-3">
            {isGeneratingCode ? (
              <div className="flex items-center justify-center" style={{ width: '200px', height: '200px' }}>
                <RefreshCw className="h-8 w-8 text-[#3499f0] animate-spin" />
              </div>
            ) : (
              <img 
                src={qrCodeUrl} 
                alt="Pairing QR Code" 
                className="max-w-full"
              />
            )}
          </div>
          <p className="text-sm text-[#b0b3b8] text-center mb-3">
            Scan this QR code with your mobile device to connect it to your account
          </p>
          <button
            onClick={generatePairingCode}
            disabled={isGeneratingCode}
            className="text-xs flex items-center px-3 py-1.5 bg-[#3a3b3c] text-[#e4e6eb] rounded hover:bg-[#4e4f50] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isGeneratingCode ? 'animate-spin' : ''}`} />
            Generate New Code
          </button>
        </div>
      )}
      
      {/* Code View */}
      {!showQrCode && (
        <div className="flex flex-col items-center py-2">
          <div className="flex items-center justify-center mb-4">
            <div className="flex flex-col items-center p-3 bg-[#18191a] rounded-lg border border-[#3a3b3c] mx-2">
              <Laptop className="h-8 w-8 text-[#b0b3b8] mb-2" />
              <span className="text-xs text-[#b0b3b8]">This Device</span>
            </div>
            <ArrowRight className="h-5 w-5 text-[#b0b3b8] mx-2" />
            <div className="flex flex-col items-center p-3 bg-[#18191a] rounded-lg border border-[#3a3b3c] mx-2">
              <Smartphone className="h-8 w-8 text-[#b0b3b8] mb-2" />
              <span className="text-xs text-[#b0b3b8]">Mobile Device</span>
            </div>
          </div>
          
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="text-xl tracking-widest bg-[#18191a] py-3 px-6 rounded-lg border border-[#3a3b3c] font-mono">
                {isGeneratingCode ? (
                  <div className="flex items-center justify-center px-6">
                    <RefreshCw className="h-5 w-5 text-[#3499f0] animate-spin" />
                  </div>
                ) : (
                  <span className="text-[#e4e6eb]">{pairingCode}</span>
                )}
              </div>
              {!isGeneratingCode && (
                <button
                  onClick={copyToClipboard}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 text-[#b0b3b8] hover:text-[#e4e6eb] hover:bg-[#3a3b3c] rounded-full"
                  title="Copy to clipboard"
                >
                  {isCopied ? (
                    <Check className="h-4 w-4 text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
          </div>
          
          <p className="text-sm text-[#b0b3b8] text-center mb-3">
            Enter this code on your mobile device to connect it to your account
          </p>
          
          <button
            onClick={generatePairingCode}
            disabled={isGeneratingCode}
            className="text-xs flex items-center px-3 py-1.5 bg-[#3a3b3c] text-[#e4e6eb] rounded hover:bg-[#4e4f50] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isGeneratingCode ? 'animate-spin' : ''}`} />
            Generate New Code
          </button>
        </div>
      )}
    </div>
  );
}