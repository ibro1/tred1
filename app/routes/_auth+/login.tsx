import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useActionData, useSubmit } from "@remix-run/react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { generateNonce } from "~/utils/solana.server";
import { authService } from "~/services/auth.server";
import { useCallback, useEffect, useState } from "react";

export async function loader({ request }: LoaderFunctionArgs) {
  // Check if user is already authenticated
  const user = await authService.isAuthenticated(request);
  if (user) {
    throw new Response(null, {
      status: 302,
      headers: { Location: "/dashboard" },
    });
  }
  const nonce = await generateNonce();
  return json({ nonce });
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    await authService.authenticate("form", request, {
      successRedirect: "/dashboard",
      failureRedirect: "/login",
    });
    return null
  } catch (error) {
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
  const MAX_RETRIES = 3;

  const submit = useSubmit();
  
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

      const formData = new FormData();
      formData.append("publicKey", publicKey.toBase58());
      formData.append("signature", Array.from(signature).toString());
      formData.append("message", message);
      formData.append("nonce", nonce);

      submit(formData, { method: "post" });
      // Reset retry count on submission
      setRetryCount(0);
    } catch (error) {
      console.error("Error signing message:", error);
      setError(error instanceof Error ? error.message : "Failed to sign message");
      // Increment retry count on failure
      setRetryCount((prev) => prev + 1);
      setIsAuthenticating(false);
    }
  }, [connected, publicKey, signMessage, nonce, isAuthenticating, submit]);

  // Attempt sign-in when wallet connects, with retry handling
  useEffect(() => {
    if (connected && publicKey && !isAuthenticating && retryCount < MAX_RETRIES) {
      handleSignIn();
    }
  }, [connected, publicKey, handleSignIn, isAuthenticating, retryCount, MAX_RETRIES]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Connect with Solana</h2>
          <p className="mt-2 text-sm text-gray-600">
            {connected ? 'Authenticating...' : 'Connect your wallet to continue'}
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
                  {retryCount > 0 && retryCount < MAX_RETRIES && (
                    <button
                      onClick={handleSignIn}
                      disabled={isAuthenticating}
                      className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
                    >
                      Click to retry ({MAX_RETRIES - retryCount} attempts remaining)
                    </button>
                  )}
                  {retryCount >= MAX_RETRIES && (
                    <p className="mt-2 text-sm text-red-600">
                      Too many failed attempts. Please disconnect and try again.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 space-y-4">
          <WalletMultiButton
            className={`w-full rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              connected ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' : 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500'
            } ${isAuthenticating ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          
          {isAuthenticating && (
            <div className="text-center text-sm text-gray-600">
              Please check your wallet to sign the message...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}