import { flowMainnet, flowTestnet } from "viem/chains";
import { createConfig, http } from "@wagmi/core";

export const networkName = process.env.NETWORK || "testnet";
export const chainNetwork =
	networkName === "mainnet" ? flowMainnet : flowTestnet;

export const config = createConfig({
	chains: [chainNetwork],
	connectors: [],
	transports: {
		[flowMainnet.id]: http(
			process.env.EVM_MAINNET_RPC_ENDPOINT_URL || undefined,
		),
		[flowTestnet.id]: http(
			process.env.EVM_TESTNET_RPC_ENDPOINT_URL || undefined,
		),
	},
});