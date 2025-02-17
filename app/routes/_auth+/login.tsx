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
  const fetcher = useFetcher();

  const handleSignIn = useCallback(async () => {
    if (!connected || !publicKey || isAuthenticating) return;

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
        { 
          method: "post",
          action: "/login"
        }
      );
    } catch (error) {
      console.error("Error signing message:", error);
      setError(error instanceof Error ? error.message : "Failed to sign message");
    } finally {
      setIsAuthenticating(false);
    }
  }, [connected, publicKey, signMessage, nonce, isAuthenticating, fetcher]);

  useEffect(() => {
    if (fetcher.type === "done" && fetcher.data === null) {
      // No data means we got a redirect response - reload to follow it
      window.location.reload();
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
          {(error || actionData?.error) && (
            <div className="mt-4 rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">
                    {error || actionData?.error}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 space-y-4">
          <WalletMultiButton
            className={`w-full rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              connected ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' : 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500'
            }`}
          >
            {connected ? 'Connected' : 'Connect Wallet'}
          </WalletMultiButton>

          {useEffect(() => {
            if (connected && publicKey && !isAuthenticating) {
              handleSignIn();
            }
          }, [connected, publicKey, handleSignIn, isAuthenticating])}

          {(error || actionData?.error || fetcher.data?.error) && (
            <div className="mt-4 rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">
                    {error || fetcher.data?.error || actionData?.error}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}