import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useActionData } from "@remix-run/react";
import { generateNonce } from "~/utils/solana.server";
import { authService } from "~/services/auth.server";

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
          <button
            onClick={async () => {
              try {
                const message = `Sign this message to authenticate with our app. Nonce: ${nonce}`;
                
                // Connect wallet and get public key
                // const publicKey = await connectWallet();
                
                // Sign message
                // const signature = await signMessage(message);
                
                // Submit form with credentials
                const form = document.createElement("form");
                form.method = "post";
                form.style.display = "none";
                
                const fields = {
                  publicKey: "placeholder", // Replace with actual public key
                  signature: "placeholder", // Replace with actual signature
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
                console.error("Error connecting wallet:", error);
              }
            }}
            className="w-full rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            Connect Wallet
          </button>

          <button
            onClick={async () => {
              // Implement create new wallet logic using generateWallet
              try {
                const message = `Sign this message to authenticate with our app. Nonce: ${nonce}`;
                // Generate new wallet logic here
                // const { publicKey, mnemonic } = await generateWallet();
                // Show mnemonic to user and ask them to save it
                // const signature = await signMessage(message);
                
                // Submit form with credentials
                const form = document.createElement("form");
                form.method = "post";
                form.style.display = "none";
                
                const fields = {
                  publicKey: "placeholder", // Replace with actual public key
                  signature: "placeholder", // Replace with actual signature
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
                console.error("Error creating wallet:", error);
              }
            }}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            Create New Wallet
          </button>

          <button
            onClick={async () => {
              // Implement import wallet logic
              try {
                const message = `Sign this message to authenticate with our app. Nonce: ${nonce}`;
                // Import wallet logic here
                // const publicKey = await importWallet();
                // const signature = await signMessage(message);
                
                // Submit form with credentials
                const form = document.createElement("form");
                form.method = "post";
                form.style.display = "none";
                
                const fields = {
                  publicKey: "placeholder", // Replace with actual public key
                  signature: "placeholder", // Replace with actual signature
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
                console.error("Error importing wallet:", error);
              }
            }}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            Import Existing Wallet
          </button>
        </div>
      </div>
    </div>
  );
}
