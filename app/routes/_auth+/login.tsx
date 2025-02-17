import { json, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useFetcher } from "@remix-run/react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { generateNonce } from "~/utils/solana.server";
import { authService } from "~/services/auth.server";
import { useCallback, useState, useEffect } from "react";
import { createTimer } from "~/utils/timer"

export async function loader({ request }: LoaderFunctionArgs) {
  // Check if user is already authenticated
  const user = await authService.isAuthenticated(request);
  if (user) {
    throw new Response(null, {
      status: 302,
      headers: { Location: "/user/dashboard" },
    });
  }
  const nonce = await generateNonce();
  return json({ nonce });
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    // This will return a redirect response if successful
    return await authService.authenticate("form", request, {
      successRedirect: "/user/dashboard",
      failureRedirect: "/login",
    });
  } catch (error) {
    // If it's a redirect response, return it (it means authentication succeeded)
    if (error instanceof Response && error.status === 302) {
      return error;
    }

    console.error("Authentication error:", error);
    return json(
      { error: error instanceof Error ? error.message : "Authentication failed" },
      { status: 400 }
    );
  }
}

export default function SolanaLogin() {
  const { nonce } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const { publicKey, signMessage, connected } = useWallet();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const fetcher = useFetcher();
  const MAX_RETRIES = 3;

  const handleSignIn = useCallback(async () => {
    if (!connected || !publicKey || isAuthenticating || retryCount >= MAX_RETRIES) return;

    try {
      setIsAuthenticating(true);
      setError(null);
      const message = `Sign this message to authenticate with our app. Nonce: ${nonce}`;
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await signMessage?.(encodedMessage);
      
      if (!signature) {
        throw new Error("Failed to sign message");
      }

      fetcher.submit(
        {
          publicKey: publicKey.toBase58(),
          signature: Array.from(signature).toString(),
          message,
          nonce,
        },
        { method: "post" }
      );
    } catch (error) {
      console.error("Error signing message:", error);
      setError(error instanceof Error ? error.message : "Failed to sign message");
      setRetryCount(prev => prev + 1);
    } finally {
      setIsAuthenticating(false);
    }
  }, [connected, publicKey, signMessage, nonce, isAuthenticating, fetcher, retryCount]);

  // Automatically trigger sign-in when wallet connects
  useEffect(() => {
    if (connected && publicKey && !isAuthenticating && retryCount < MAX_RETRIES) {
      handleSignIn();
    }
  }, [connected, publicKey, handleSignIn, isAuthenticating, retryCount]);

  // Handle fetcher states
  useEffect(() => {
    if (fetcher.type === "done") {
      if (fetcher.data?.error) {
        setError(fetcher.data.error);
        setRetryCount(prev => prev + 1);
      } else if (!fetcher.data) {
        // No data means successful redirect
        window.location.reload();
      }
    }
  }, [fetcher]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Connect with Solana</h2>
          <p className="mt-2 text-sm text-gray-600">
            Connect your wallet to continue
          </p>
          
          {retryCount >= MAX_RETRIES ? (
            <div className="mt-4 rounded-md bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800">
                Too many failed attempts. Please disconnect and try again.
              </p>
            </div>
          ) : (error || actionData?.error) && (
            <div className="mt-4 rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">
                    {error || actionData?.error}
                    {retryCount > 0 && retryCount < MAX_RETRIES && (
                      <span className="block mt-1">
                        Attempts remaining: {MAX_RETRIES - retryCount}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 space-y-4">
          <WalletMultiButton className="w-full rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2" />
          
          {isAuthenticating && (
            <div className="text-center text-sm text-gray-600">
              Please sign the message in your wallet...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}