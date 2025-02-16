import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useActionData } from "@remix-run/react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { generateNonce } from "~/utils/solana.server";
import { authService } from "~/services/auth.server";
import { useEffect } from "react";

export async function loader({ request }: LoaderFunctionArgs) {
  const nonce = await generateNonce();
  return json({ nonce });
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const user = await authService.authenticate("solana", request, {
      successRedirect: "/dashboard",
      failureRedirect: "/login/solana",
    });
    return json({ user });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Authentication failed" }, { status: 400 });
  }
}

export default function SolanaLogin() {
  const { nonce } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const { publicKey, signMessage, connected } = useWallet();

  useEffect(() => {
    const authenticate = async () => {
      if (connected && publicKey) {
        try {
          const message = `Sign this message to authenticate with our app. Nonce: ${nonce}`;
          const encodedMessage = new TextEncoder().encode(message);
          const signature = await signMessage?.(encodedMessage);
          
          if (!signature) {
            throw new Error("Failed to sign message");
          }

          const form = document.createElement("form");
          form.method = "post";
          form.style.display = "none";
          
          const fields = {
            publicKey: publicKey.toBase58(),
            signature: Array.from(signature).toString(),
            message,
            nonce,
          };
          
          Object.entries(fields).forEach(([key, value]) => {
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = key;
            input.value = value;
            form.appendChild(input);
          });
          
          document.body.appendChild(form);
          form.submit();
        } catch (error) {
          console.error("Error authenticating:", error);
        }
      }
    };

    authenticate();
  }, [connected, publicKey, signMessage, nonce]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Connect with Solana</h2>
          <p className="mt-2 text-sm text-gray-600">
            Choose how you want to connect your Solana wallet
          </p>
          {actionData?.error && (
            <p className="mt-2 text-sm text-red-600">{actionData.error}</p>
          )}
        </div>

        <div className="mt-8 space-y-4">
          <WalletMultiButton className="w-full rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2" />
        </div>
      </div>
    </div>
  );
}
