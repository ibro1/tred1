import { AuthorizationError } from "remix-auth";
import { Strategy } from "remix-auth";
import { db } from "~/libs/db.server";
import { generateNonce, verifySignature } from "~/utils/solana.server";

export interface SolanaStrategyVerifyParams {
  publicKey: string;
  signature: string;
  message: string;
  nonce: string;
  email?: string;
  fullname?: string;
}

function generateUsername(publicKey: string): string {
  // Take first 6 characters of public key and add random numbers
  const prefix = publicKey.slice(0, 6).toLowerCase();
  const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}${randomNum}`;
}

async function ensureUniqueUsername(baseUsername: string): Promise<string> {
  let username = baseUsername;
  let counter = 1;
  
  while (true) {
    const existingUser = await db.user.findUnique({
      where: { username },
    });
    
    if (!existingUser) {
      return username;
    }
    
    username = `${baseUsername}${counter}`;
    counter++;
  }
}

export class SolanaStrategy extends Strategy<any, SolanaStrategyVerifyParams> {
  name = "solana";

  async authenticate(
    request: Request,
    sessionStorage: any,
    options: any
  ): Promise<any> {
    const form = await request.formData();
    const publicKey = form.get("publicKey")?.toString();
    const signature = form.get("signature")?.toString();
    const message = form.get("message")?.toString();
    const nonce = form.get("nonce")?.toString();
    const email = form.get("email")?.toString();
    const fullname = form.get("fullname")?.toString();

    if (!publicKey || !signature || !message || !nonce) {
      throw new AuthorizationError("Missing credentials");
    }

    try {
      // Verify the nonce
      const storedNonce = await db.nonce.findUnique({
        where: { value: nonce },
      });

      if (!storedNonce) {
        throw new AuthorizationError("Invalid nonce");
      }

      // Check if nonce is expired (5 minutes)
      const now = new Date();
      if (now.getTime() - storedNonce.createdAt.getTime() > 5 * 60 * 1000) {
        await db.nonce.delete({ where: { value: nonce } });
        throw new AuthorizationError("Nonce expired");
      }

      // Verify the signature
      const isValid = await verifySignature(message, signature, publicKey);
      if (!isValid) {
        throw new AuthorizationError("Invalid signature");
      }

      // Delete the used nonce
      await db.nonce.delete({ where: { value: nonce } });

      // Find existing user
      let user = await db.user.findUnique({
        where: { walletAddress: publicKey },
      });

      if (user) {
        // Existing user - just return the user data
        return {
          id: user.id,
          walletAddress: user.walletAddress,
          email: user.email,
          username: user.username,
        };
      } else {
        // Generate unique username
        const baseUsername = generateUsername(publicKey);
        const username = await ensureUniqueUsername(baseUsername);

        // Create new user
        user = await db.user.create({
          data: {
            username,
            email: email || "",
            fullname: fullname || "",
            walletAddress: publicKey,
            authStrategy: "solana",
          },
        });

        return {
          id: user.id,
          walletAddress: user.walletAddress,
          email: user.email,
          username: user.username,
        };
      }
    } catch (error) {
      if (error instanceof AuthorizationError) {
        throw error;
      }
      throw new AuthorizationError(
        error instanceof Error ? error.message : "Failed to authenticate with Solana"
      );
    }
  }
}
