"use client";

import { ReactNode } from "react";
import { getDefaultConfig, RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { defineChain } from "viem";
import { ToastContainer } from "react-toastify";
import "@rainbow-me/rainbowkit/styles.css";
import "react-toastify/dist/ReactToastify.css";

// Define Rootstock Testnet chain
const rskTestnet = defineChain({
  id: 31,
  name: "Rootstock Testnet",
  nativeCurrency: {
    name: "tRBTC",
    symbol: "tRBTC",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      // Use RPC URL from env or fallback to Rootstock Portal API
      // Portal API supports CORS and eth_getLogs (required for browser)
      // Note: PublicNode and dRPC have CORS issues in browser
      http: [
        process.env.NEXT_PUBLIC_RPC_URL || 
        "https://rpc.testnet.rootstock.io/eB6SwV0sOgFuotmD35JzhuCqpnYf8W-T"
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Rootstock Explorer",
      url: "https://explorer.testnet.rsk.co",
    },
  },
  testnet: true,
});

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo";

// getDefaultConfig has incomplete type definitions for custom chains
const config = getDefaultConfig({
  appName: "RNS Bulk Manager",
  projectId,
  chains: [rskTestnet],
  ssr: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}>
          {children}
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={true}
            closeOnClick
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
