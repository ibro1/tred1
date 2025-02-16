import { webcrypto } from "crypto";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { generateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { db } from "~/libs/db.server";

export async function generateNonce(): Promise<string> {
  const array = new Uint8Array(32);
  webcrypto.getRandomValues(array);
  const nonce = Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");

  await db.nonce.create({
    data: {
      value: nonce,
      createdAt: new Date(),
    },
  });

  return nonce;
}

export async function verifySignature(
  message: string,
  signature: string,
  publicKey: string
): Promise<boolean> {
  try {
    const encodedMessage = new TextEncoder().encode(message);
    const signatureUint8 = Uint8Array.from(signature.split(',').map(Number));
    const publicKeyUint8 = bs58.decode(publicKey);

    return nacl.verify(
      signatureUint8,
      encodedMessage,
      publicKeyUint8
    );
  } catch (error) {
    console.error("Error verifying signature:", error);
    return false;
  }
}

export function generateWallet(): { mnemonic: string; publicKey: string } {
  const mnemonic = generateMnemonic(wordlist); // Uses English wordlist for 12 words
  // In a real implementation, you would derive the public key from the mnemonic
  // For now, we'll return a placeholder
  return {
    mnemonic,
    publicKey: "placeholder", // This should be derived from the mnemonic
  };
}
