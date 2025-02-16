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
