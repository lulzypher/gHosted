import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './use-auth';
import { 
  generateKeyPair, 
  encryptPrivateKey, 
  decryptPrivateKey, 
  signMessage, 
  verifySignature,
  generateDID
} from '@/lib/cryptography';

// TypeScript type augmentation for localStorage
declare global {
  interface Window {
    localStorage: {
      getItem(key: string): string | null;
      setItem(key: string, value: string): void;
      removeItem(key: string): void;
      clear(): void;
      length: number;
      key(index: number): string | null;
      [key: string]: any;
    };
  }
}

interface CryptoIdentity {
  publicKey: string | null;
  did: string | null;
  encryptedPrivateKey: string | null;
  hasLoadedKeys: boolean;
  isGeneratingKeys: boolean;
  
  // Generate new keys for a user
  generateNewKeys: (password: string) => Promise<{
    publicKey: string;
    did: string;
    encryptedPrivateKey: string;
  }>;
  
  // Sign data with the user's private key
  signData: (data: string, password: string) => Promise<string>;
  
  // Verify data with the user's public key
  verifyData: (data: string, signature: string) => Promise<boolean>;
  
  // Verify data with any public key
  verifyWithKey: (data: string, signature: string, publicKey: string) => Promise<boolean>;
}

// Local storage keys
const PUBLIC_KEY_STORAGE_KEY = 'ghosted_public_key';
const ENCRYPTED_PRIVATE_KEY_STORAGE_KEY = 'ghosted_encrypted_private_key';
const DID_STORAGE_KEY = 'ghosted_did';

/**
 * Hook for managing the user's cryptographic identity
 */
export function useCryptoIdentity(): CryptoIdentity {
  const { user } = useAuth();
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [encryptedPrivateKey, setEncryptedPrivateKey] = useState<string | null>(null);
  const [did, setDid] = useState<string | null>(null);
  const [hasLoadedKeys, setHasLoadedKeys] = useState(false);
  const [isGeneratingKeys, setIsGeneratingKeys] = useState(false);
  
  // Load keys from local storage on component mount or when user changes
  useEffect(() => {
    const loadKeysFromStorage = () => {
      try {
        // Check if localStorage is available (it will be in browsers but not in SSR)
        if (typeof window === 'undefined' || !window.localStorage) {
          console.warn("localStorage is not available");
          setHasLoadedKeys(true);
          return;
        }

        let storedPublicKey = window.localStorage.getItem(PUBLIC_KEY_STORAGE_KEY);
        let storedEncryptedPrivateKey = window.localStorage.getItem(ENCRYPTED_PRIVATE_KEY_STORAGE_KEY);
        let storedDid = window.localStorage.getItem(DID_STORAGE_KEY);
        
        // If we have a user logged in, try to use their stored keys
        if (user) {
          // Check if keys are stored for this user ID
          const userPublicKey = window.localStorage.getItem(`${PUBLIC_KEY_STORAGE_KEY}_${user.id}`);
          const userEncryptedPrivateKey = window.localStorage.getItem(`${ENCRYPTED_PRIVATE_KEY_STORAGE_KEY}_${user.id}`);
          const userDid = window.localStorage.getItem(`${DID_STORAGE_KEY}_${user.id}`);
          
          if (userPublicKey && userEncryptedPrivateKey && userDid) {
            // Use user-specific keys if available
            storedPublicKey = userPublicKey;
            storedEncryptedPrivateKey = userEncryptedPrivateKey;
            storedDid = userDid;
          }
          
          // If the user has keys from the server but not locally, use those
          if (!storedPublicKey && user.publicKey) {
            storedPublicKey = user.publicKey;
          }
          
          if (!storedDid && user.did) {
            storedDid = user.did;
          }
        }
        
        setPublicKey(storedPublicKey);
        setEncryptedPrivateKey(storedEncryptedPrivateKey);
        setDid(storedDid);
        setHasLoadedKeys(true);
      } catch (error) {
        console.error("Error loading cryptographic keys:", error);
        setHasLoadedKeys(true);
      }
    };
    
    loadKeysFromStorage();
  }, [user]);
  
  // Generate new keys for a user
  const generateNewKeys = useCallback(async (password: string): Promise<{
    publicKey: string;
    did: string;
    encryptedPrivateKey: string;
  }> => {
    setIsGeneratingKeys(true);
    
    try {
      // Check if localStorage is available
      if (typeof window === 'undefined' || !window.localStorage) {
        console.warn("localStorage is not available, keys will not be persisted");
      }
      
      // Generate a new key pair
      const { publicKey, privateKey } = await generateKeyPair();
      
      // Generate a DID from the public key
      const did = await generateDID(publicKey);
      
      // Encrypt the private key with the user's password
      const encryptedPrivateKeyObj = await encryptPrivateKey(privateKey, password);
      
      // Convert encrypted data to JSON string for storage
      const encryptedPrivateKeyString = JSON.stringify(encryptedPrivateKeyObj);
      
      // Store the keys if localStorage is available
      if (typeof window !== 'undefined' && window.localStorage) {
        if (user) {
          // Save with user-specific keys
          window.localStorage.setItem(`${PUBLIC_KEY_STORAGE_KEY}_${user.id}`, publicKey);
          window.localStorage.setItem(`${ENCRYPTED_PRIVATE_KEY_STORAGE_KEY}_${user.id}`, encryptedPrivateKeyString);
          window.localStorage.setItem(`${DID_STORAGE_KEY}_${user.id}`, did);
        }
        
        // Also store in the generic storage for non-logged-in state
        window.localStorage.setItem(PUBLIC_KEY_STORAGE_KEY, publicKey);
        window.localStorage.setItem(ENCRYPTED_PRIVATE_KEY_STORAGE_KEY, encryptedPrivateKeyString);
        window.localStorage.setItem(DID_STORAGE_KEY, did);
      }
      
      // Update state
      setPublicKey(publicKey);
      setEncryptedPrivateKey(encryptedPrivateKeyString);
      setDid(did);
      
      return { publicKey, did, encryptedPrivateKey: encryptedPrivateKeyString };
    } finally {
      setIsGeneratingKeys(false);
    }
  }, [user]);
  
  // Sign data with the user's private key
  const signDataWithPrivateKey = useCallback(async (
    data: string, 
    password: string
  ): Promise<string> => {
    if (!encryptedPrivateKey) {
      throw new Error("No private key available");
    }
    
    try {
      // Parse the encrypted private key string to EncryptedData object
      const encryptedPrivateKeyObj = JSON.parse(encryptedPrivateKey) as import('@/lib/cryptography').EncryptedData;
      
      // Decrypt the private key with the user's password
      const privateKey = await decryptPrivateKey(encryptedPrivateKeyObj, password);
      
      // Sign the data
      return await signMessage(data, privateKey);
    } catch (error) {
      console.error("Error signing data:", error);
      throw error;
    }
  }, [encryptedPrivateKey]);
  
  // Verify data with the user's public key
  const verifyDataWithPublicKey = useCallback(async (
    data: string, 
    signature: string
  ): Promise<boolean> => {
    if (!publicKey) {
      throw new Error("No public key available");
    }
    
    try {
      return await verifySignature(data, signature, publicKey);
    } catch (error) {
      console.error("Error verifying data:", error);
      return false;
    }
  }, [publicKey]);
  
  // Verify data with any public key
  const verifyWithKey = useCallback(async (
    data: string, 
    signature: string, 
    publicKey: string
  ): Promise<boolean> => {
    try {
      return await verifySignature(data, signature, publicKey);
    } catch (error) {
      console.error("Error verifying data with key:", error);
      return false;
    }
  }, []);
  
  return {
    publicKey,
    did,
    encryptedPrivateKey,
    hasLoadedKeys,
    isGeneratingKeys,
    generateNewKeys,
    signData: signDataWithPrivateKey,
    verifyData: verifyDataWithPublicKey,
    verifyWithKey
  };
}