import { webcrypto } from "crypto";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { generateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { mnemonicToSeedSync } from '@scure/bip39';
import { Keypair } from "@solana/web3.js";
import { derivePath } from "ed25519-hd-key";
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
    console.log("Debug - Starting signature verification with:", {
      messageLength: message.length,
      message,
      signatureFormat: signature.slice(0, 50) + "...",
      publicKey
    });

    const encodedMessage = new TextEncoder().encode(message);
    const signatureUint8 = Uint8Array.from(signature.split(',').map(Number));
    const publicKeyUint8 = bs58.decode(publicKey);

    console.log("Debug - Converted parameters:", {
      encodedMessageLength: encodedMessage.length,
      signatureBytes: signatureUint8.length,
      publicKeyBytes: publicKeyUint8.length
    });

    // Use nacl.sign.detached.verify instead of nacl.verify
    const verified = nacl.sign.detached.verify(
      encodedMessage,
      signatureUint8,
      publicKeyUint8
    );

    console.log("Debug - Verification result:", verified);
    return verified;
  } catch (error) {
    console.error("Error in verifySignature:", error);
    throw new Error(`Signature verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function getKeypairFromMnemonic(mnemonic: string): Keypair {
  const seed = mnemonicToSeedSync(mnemonic);
  const derivedSeed = derivePath("m/44'/501'/0'/0'", seed).key;
  return Keypair.fromSeed(derivedSeed);
}

export function generateWallet(): { mnemonic: string; publicKey: string } {
  const mnemonic = generateMnemonic(wordlist);
  const keypair = getKeypairFromMnemonic(mnemonic);
  
  return {
    mnemonic,
    publicKey: keypair.publicKey.toBase58(),
  };
}
