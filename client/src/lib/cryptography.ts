/**
 * Cryptography utilities for gHosted
 * This module provides functions for generating and managing cryptographic keys,
 * signing data, and verifying signatures.
 */

// TypeScript type augmentation to add crypto to Window
declare global {
  interface Window {
    crypto: Crypto;
  }
}

/**
 * Generate a new key pair for a user
 * @returns {Promise<{publicKey: string, privateKey: string}>} Public and private key pair
 */
export async function generateKeyPair(): Promise<{publicKey: string, privateKey: string}> {
  // Use the Web Crypto API to generate an RSA key pair
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // 65537
      hash: "SHA-256",
    },
    true, // extractable
    ["sign", "verify"] // key usages
  );

  // Export the keys to JWK format
  const publicKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);

  // Convert JWK to strings for storage
  return {
    publicKey: JSON.stringify(publicKeyJwk),
    privateKey: JSON.stringify(privateKeyJwk)
  };
}

/**
 * Import a public key from JWK format string
 * @param {string} publicKeyJwk - Public key in JWK format as a string
 * @returns {Promise<CryptoKey>} Imported public key
 */
export async function importPublicKey(publicKeyJwk: string): Promise<CryptoKey> {
  const jwk = JSON.parse(publicKeyJwk);
  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    true,
    ["verify"]
  );
}

/**
 * Import a private key from JWK format string
 * @param {string} privateKeyJwk - Private key in JWK format as a string
 * @returns {Promise<CryptoKey>} Imported private key
 */
export async function importPrivateKey(privateKeyJwk: string): Promise<CryptoKey> {
  const jwk = JSON.parse(privateKeyJwk);
  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    true,
    ["sign"]
  );
}

/**
 * Sign data with a private key
 * @param {string} privateKeyJwk - Private key in JWK format as a string
 * @param {string} data - Data to sign
 * @returns {Promise<string>} Base64-encoded signature
 */
export async function signData(privateKeyJwk: string, data: string): Promise<string> {
  const privateKey = await importPrivateKey(privateKeyJwk);
  const encodedData = new TextEncoder().encode(data);
  const signature = await window.crypto.subtle.sign(
    {
      name: "RSASSA-PKCS1-v1_5",
    },
    privateKey,
    encodedData
  );
  return arrayBufferToBase64(signature);
}

/**
 * Verify a signature with a public key
 * @param {string} publicKeyJwk - Public key in JWK format as a string
 * @param {string} signature - Base64-encoded signature
 * @param {string} data - Original data that was signed
 * @returns {Promise<boolean>} Whether the signature is valid
 */
export async function verifySignature(
  publicKeyJwk: string,
  signature: string,
  data: string
): Promise<boolean> {
  const publicKey = await importPublicKey(publicKeyJwk);
  const encodedData = new TextEncoder().encode(data);
  const signatureBuffer = base64ToArrayBuffer(signature);
  return await window.crypto.subtle.verify(
    {
      name: "RSASSA-PKCS1-v1_5",
    },
    publicKey,
    signatureBuffer,
    encodedData
  );
}

/**
 * Generate a deterministic DID from a public key
 * @param {string} publicKeyJwk - Public key in JWK format as a string
 * @returns {Promise<string>} did:key: identifier
 */
export async function generateDID(publicKeyJwk: string): Promise<string> {
  // Create a hash of the public key
  const publicKeyObj = JSON.parse(publicKeyJwk);
  const publicKeyStr = publicKeyObj.n; // Use modulus as the identifying factor
  const encoder = new TextEncoder();
  const data = encoder.encode(publicKeyStr);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Return a did:key identifier with the hash
  return `did:key:z${hashHex}`;
}

/**
 * Helper function to convert an ArrayBuffer to a Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Helper function to convert a Base64 string to an ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Encrypt a private key with a user's password before storage
 * @param {string} privateKeyJwk - Private key in JWK format as a string
 * @param {string} password - User's password
 * @returns {Promise<string>} Encrypted private key
 */
export async function encryptPrivateKey(
  privateKeyJwk: string, 
  password: string
): Promise<string> {
  // Derive an encryption key from the password
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    passwordData,
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );
  
  const key = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  
  // Encrypt the private key
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const privateKeyData = encoder.encode(privateKeyJwk);
  
  const encryptedData = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv
    },
    key,
    privateKeyData
  );
  
  // Combine the encrypted data with the salt and IV for later decryption
  const encryptedArray = new Uint8Array(encryptedData);
  const result = new Uint8Array(salt.length + iv.length + encryptedArray.length);
  result.set(salt, 0);
  result.set(iv, salt.length);
  result.set(encryptedArray, salt.length + iv.length);
  
  return arrayBufferToBase64(result.buffer);
}

/**
 * Decrypt an encrypted private key with a user's password
 * @param {string} encryptedPrivateKey - Encrypted private key as a Base64 string
 * @param {string} password - User's password
 * @returns {Promise<string>} Decrypted private key in JWK format
 */
export async function decryptPrivateKey(
  encryptedPrivateKey: string, 
  password: string
): Promise<string> {
  // Decode the encrypted data
  const encryptedData = base64ToArrayBuffer(encryptedPrivateKey);
  const encryptedBytes = new Uint8Array(encryptedData);
  
  // Extract the salt, IV, and encrypted private key
  const salt = encryptedBytes.slice(0, 16);
  const iv = encryptedBytes.slice(16, 28);
  const ciphertext = encryptedBytes.slice(28);
  
  // Derive the key from the password using the same parameters
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    passwordData,
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );
  
  const key = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  
  // Decrypt the private key
  try {
    const decryptedData = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv
      },
      key,
      ciphertext
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (err) {
    // If decryption fails, the password was likely incorrect
    throw new Error("Failed to decrypt private key. Incorrect password?");
  }
}