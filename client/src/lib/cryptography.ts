/**
 * Cryptography Module
 * 
 * This module provides cryptographic functions for secure user identification,
 * message signing, encryption, and decryption.
 * 
 * The implementation uses the Web Crypto API for secure cryptographic operations.
 */

// Type definitions for cryptographic operations
export interface KeyPair {
  publicKey: string; // Base64 encoded public key
  privateKey: string; // Base64 encoded private key
}

export interface EncryptedData {
  iv: string; // Base64 encoded initialization vector
  ciphertext: string; // Base64 encoded encrypted data
}

export interface SignedMessage {
  message: string;
  signature: string; // Base64 encoded signature
  publicKey: string; // Base64 encoded public key of the signer
}

// Generate a new cryptographic key pair
export async function generateKeyPair(): Promise<KeyPair> {
  try {
    // Use WebCrypto to generate RSA key pair
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // 65537
        hash: { name: 'SHA-256' },
      },
      true, // extractable
      ['encrypt', 'decrypt'] // usages
    );

    // Export the public key
    const publicKeyBuffer = await window.crypto.subtle.exportKey(
      'spki',
      keyPair.publicKey
    );

    // Export the private key
    const privateKeyBuffer = await window.crypto.subtle.exportKey(
      'pkcs8',
      keyPair.privateKey
    );

    // Convert to base64
    const publicKey = bufferToBase64(publicKeyBuffer);
    const privateKey = bufferToBase64(privateKeyBuffer);

    return { publicKey, privateKey };
  } catch (error) {
    console.error('Error generating key pair:', error);
    throw new Error('Failed to generate cryptographic keys');
  }
}

// Sign a message using a private key
export async function signMessage(message: string, privateKeyBase64: string): Promise<string> {
  try {
    // Convert base64 private key to buffer
    const privateKeyBuffer = base64ToBuffer(privateKeyBase64);

    // Import the private key
    const privateKey = await window.crypto.subtle.importKey(
      'pkcs8',
      privateKeyBuffer,
      {
        name: 'RSA-PSS',
        hash: { name: 'SHA-256' },
      },
      false, // not extractable
      ['sign']
    );

    // Convert message to buffer
    const messageBuffer = new TextEncoder().encode(message);

    // Sign the message
    const signatureBuffer = await window.crypto.subtle.sign(
      {
        name: 'RSA-PSS',
        saltLength: 32,
      },
      privateKey,
      messageBuffer
    );

    // Convert signature to base64
    return bufferToBase64(signatureBuffer);
  } catch (error) {
    console.error('Error signing message:', error);
    throw new Error('Failed to sign message');
  }
}

// Verify a signature using a public key
export async function verifySignature(
  message: string,
  signature: string,
  publicKeyBase64: string
): Promise<boolean> {
  try {
    // Convert base64 public key to buffer
    const publicKeyBuffer = base64ToBuffer(publicKeyBase64);

    // Import the public key
    const publicKey = await window.crypto.subtle.importKey(
      'spki',
      publicKeyBuffer,
      {
        name: 'RSA-PSS',
        hash: { name: 'SHA-256' },
      },
      false, // not extractable
      ['verify']
    );

    // Convert message and signature to buffer
    const messageBuffer = new TextEncoder().encode(message);
    const signatureBuffer = base64ToBuffer(signature);

    // Verify the signature
    return await window.crypto.subtle.verify(
      {
        name: 'RSA-PSS',
        saltLength: 32,
      },
      publicKey,
      signatureBuffer,
      messageBuffer
    );
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

// Encrypt data using a public key
export async function encryptData(data: string, publicKeyBase64: string): Promise<EncryptedData> {
  try {
    // Convert base64 public key to buffer
    const publicKeyBuffer = base64ToBuffer(publicKeyBase64);

    // Import the public key
    const publicKey = await window.crypto.subtle.importKey(
      'spki',
      publicKeyBuffer,
      {
        name: 'RSA-OAEP',
        hash: { name: 'SHA-256' },
      },
      false, // not extractable
      ['encrypt']
    );

    // Generate IV
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // Convert data to buffer
    const dataBuffer = new TextEncoder().encode(data);

    // Encrypt the data
    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'RSA-OAEP',
      },
      publicKey,
      dataBuffer
    );

    // Convert to base64
    const ciphertext = bufferToBase64(ciphertextBuffer);
    const ivBase64 = bufferToBase64(iv);

    return { iv: ivBase64, ciphertext };
  } catch (error) {
    console.error('Error encrypting data:', error);
    throw new Error('Failed to encrypt data');
  }
}

// Decrypt data using a private key
export async function decryptData(
  encryptedData: EncryptedData,
  privateKeyBase64: string
): Promise<string> {
  try {
    // Convert base64 private key to buffer
    const privateKeyBuffer = base64ToBuffer(privateKeyBase64);

    // Import the private key
    const privateKey = await window.crypto.subtle.importKey(
      'pkcs8',
      privateKeyBuffer,
      {
        name: 'RSA-OAEP',
        hash: { name: 'SHA-256' },
      },
      false, // not extractable
      ['decrypt']
    );

    // Convert ciphertext and IV to buffer
    const ciphertextBuffer = base64ToBuffer(encryptedData.ciphertext);
    const ivBuffer = base64ToBuffer(encryptedData.iv);

    // Decrypt the data
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'RSA-OAEP',
        iv: ivBuffer,
      },
      privateKey,
      ciphertextBuffer
    );

    // Convert to string
    return new TextDecoder().decode(decryptedBuffer);
  } catch (error) {
    console.error('Error decrypting data:', error);
    throw new Error('Failed to decrypt data');
  }
}

// Encrypt private key using a password
export async function encryptPrivateKey(privateKey: string, password: string): Promise<EncryptedData> {
  try {
    // Derive a key from the password
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    const derivedKey = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    // Generate IV
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // Encrypt the private key
    const privateKeyBuffer = new TextEncoder().encode(privateKey);
    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      derivedKey,
      privateKeyBuffer
    );

    // Combine salt with ciphertext
    const combinedBuffer = new Uint8Array(salt.length + ciphertextBuffer.byteLength);
    combinedBuffer.set(salt);
    combinedBuffer.set(new Uint8Array(ciphertextBuffer), salt.length);

    // Convert to base64
    const ciphertext = bufferToBase64(combinedBuffer);
    const ivBase64 = bufferToBase64(iv);

    return { iv: ivBase64, ciphertext };
  } catch (error) {
    console.error('Error encrypting private key:', error);
    throw new Error('Failed to encrypt private key');
  }
}

// Decrypt private key using a password
export async function decryptPrivateKey(
  encryptedData: EncryptedData,
  password: string
): Promise<string> {
  try {
    // Convert ciphertext and IV to buffer
    const combinedBuffer = base64ToBuffer(encryptedData.ciphertext);
    const ivBuffer = base64ToBuffer(encryptedData.iv);

    // Extract salt from combined buffer
    const salt = combinedBuffer.slice(0, 16);
    const ciphertextBuffer = combinedBuffer.slice(16);

    // Derive a key from the password
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    const derivedKey = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    // Decrypt the private key
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBuffer,
      },
      derivedKey,
      ciphertextBuffer
    );

    // Convert to string
    return new TextDecoder().decode(decryptedBuffer);
  } catch (error) {
    console.error('Error decrypting private key:', error);
    throw new Error('Failed to decrypt private key');
  }
}

// Generate a Decentralized Identifier (DID) from a public key
export function generateDID(publicKey: string): string {
  try {
    // Create a DID using the did:key method
    // In a real implementation, this would hash the public key in a specific way
    // For simplicity, we're just taking the first 32 chars of the base64 public key
    const keyId = publicKey.substring(0, 32).replace(/[+/=]/g, '');
    return `did:key:z${keyId}`;
  } catch (error) {
    console.error('Error generating DID:', error);
    throw new Error('Failed to generate DID');
  }
}

// Helper function to convert an ArrayBuffer to a Base64 string
function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper function to convert a Base64 string to an ArrayBuffer
function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Generate a random seed for deterministic key generation
export function generateRandomSeed(): string {
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  return bufferToBase64(array);
}

// Create a fingerprint from a public key (for display purposes)
export function createKeyFingerprint(publicKey: string): string {
  // Take the first 8 characters of the base64 public key and format it
  const shortKey = publicKey.substring(0, 8).replace(/[+/=]/g, '');
  return shortKey.match(/.{1,4}/g)?.join(':') || '';
}