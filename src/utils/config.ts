import { http, createConfig } from "@wagmi/core";
import { flowMainnet, flowTestnet } from "viem/chains";

export const networkName = process.env.NETWORK || "testnet";

export const config = createConfig({
    chains: [flowMainnet, flowTestnet],
    connectors: [],
    transports: {
        [flowMainnet.id]: http(process.env.EVM_MAINNET_RPC_ENDPOINT_URL || undefined),
        [flowTestnet.id]: http(process.env.EVM_TESTNET_RPC_ENDPOINT_URL || undefined),
    },
});