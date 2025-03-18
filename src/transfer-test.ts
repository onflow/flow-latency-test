import { createWalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { http } from "@wagmi/core";

import { networkName, chainNetwork, Batch } from "./utils";
import type { EVMBlockchainContext } from "./utils/types";
import {
	GetBalanceAction,
	TransferAction,
	WaitForTransactionReceiptAction,
} from "./actions";

async function sentTestTransaction() {
	// Load EVM Private Key from environment variable
	const privateKey = process.env.PRIVATE_KEY || "";
	if (!privateKey) {
		throw new Error("No private key found in the environment variable");
	}

	// Create a private key from the environment variable
	const priv = privateKey.startsWith("0x")
		? privateKey.substring(2)
		: privateKey;

	// Create an account from the private key
	const account = privateKeyToAccount(`0x${priv}`);
	const client = createWalletClient({
		account,
		chain: chainNetwork,
		transport: http(),
	});

	console.log(`[Address: ${account.address} @${networkName}]`);

	const ctx = { account, client, latencies: {} } as EVMBlockchainContext;
	const batch = new Batch(ctx, [
		new TransferAction(),
		new GetBalanceAction("hash"),
		new WaitForTransactionReceiptAction(),
		new GetBalanceAction("receipt", "balance:await_hash"),
	]);

	await batch.run();

	batch.printLatencies();
}
// Run the main function
try {
	await sentTestTransaction();
} catch (error) {
	console.error("Error sending transaction:", error);
}
