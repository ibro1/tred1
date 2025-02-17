import { AuthorizationError } from "remix-auth";
import { Strategy } from "remix-auth";
import { db } from "~/libs/db.server";
import { generateNonce, verifySignature } from "~/utils/solana.server";
import type { UserSession } from "~/services/auth.server";

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

export class SolanaStrategy extends Strategy<UserSession, SolanaStrategyVerifyParams> {
  name = "solana";

  async authenticate(
    request: Request,
    sessionStorage: any,
    options: any
  ): Promise<UserSession> {
    try {
      const form = await request.formData();
      const publicKey = form.get("publicKey")?.toString();
      const signature = form.get("signature")?.toString();
      const message = form.get("message")?.toString();
      const nonce = form.get("nonce")?.toString();
      const email = form.get("email")?.toString();
      const fullname = form.get("fullname")?.toString();

      // Validate input parameters
      if (!publicKey) throw new AuthorizationError("Public key is required");
      if (!signature) throw new AuthorizationError("Signature is required");
      if (!message) throw new AuthorizationError("Message is required");
      if (!nonce) throw new AuthorizationError("Nonce is required");

      console.log("Debug - Received params:", {
        publicKey,
        messageLength: message?.length,
        signatureLength: signature?.length,
        nonce,
      });

      // Verify the nonce
      const storedNonce = await db.nonce.findUnique({
        where: { value: nonce },
      });

      if (!storedNonce) {
        console.error("Nonce not found in database:", nonce);
        throw new AuthorizationError("Invalid or expired nonce");
      }

      // Check if nonce is expired (5 minutes)
      const now = new Date();
      const nonceAge = now.getTime() - storedNonce.createdAt.getTime();
      if (nonceAge > 5 * 60 * 1000) {
        console.error("Nonce expired. Age:", nonceAge, "ms");
        await db.nonce.delete({ where: { value: nonce } });
        throw new AuthorizationError("Authentication timeout - please try again");
      }

      // Verify the signature
      console.log("Debug - Verifying signature...");
      const isValid = await verifySignature(message, signature, publicKey);
      
      if (!isValid) {
        console.error("Signature verification failed for:", {
          message,
          publicKey,
          signatureLength: signature.length,
        });
        throw new AuthorizationError("Invalid signature - please try signing again");
      }

      console.log("Debug - Signature verified successfully");

      // Delete the used nonce
      await db.nonce.delete({ where: { value: nonce } });

      // Find or create user
      let user = await db.user.findUnique({
        where: { walletAddress: publicKey },
        select: {
          id: true,
          email: true,
          username: true,
          walletAddress: true,
        },
      });

      if (!user) {
        console.log("Debug - Creating new user for wallet:", publicKey);
        const baseUsername = generateUsername(publicKey);
        const username = await ensureUniqueUsername(baseUsername);

        user = await db.user.create({
          data: {
            username,
            email: email || "",
            fullname: fullname || "",
            walletAddress: publicKey,
          },
          select: {
            id: true,
            email: true,
            username: true,
            walletAddress: true,
          },
        });
      }

      if (!user?.id) {
        throw new AuthorizationError("Failed to create or retrieve user");
      }

      console.log("Debug - Authentication successful for user:", user.id);

      // Return the session data
      return {
        id: user.id,
      };

    } catch (error) {
      console.error("Authentication error details:", error);
      
      if (error instanceof AuthorizationError) {
        throw error;
      }
      
      // Handle specific error types
      if (error instanceof TypeError) {
        throw new AuthorizationError("Invalid data format received");
      }
      
      if (error instanceof Error) {
        throw new AuthorizationError(`Authentication failed: ${error.message}`);
      }

      throw new AuthorizationError("An unexpected error occurred during authentication");
    }
  }
}
