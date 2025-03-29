import { Batch, buildEVMBlockchainContext } from "./utils";

import {
	TransferERC20Action,
	GeERC20BalanceAction,
	WaitForTransactionReceiptAction,
} from "./actions";

async function sentTestTransaction() {
	// Load EVM Private Key from environment variable
	const privateKey = process.env.PRIVATE_KEY || "";
	if (!privateKey) {
		throw new Error("No private key found in the environment variable");
	}

	const ctx = await buildEVMBlockchainContext(privateKey);
	const batch = new Batch(ctx, [
		new TransferERC20Action(),
		new GeERC20BalanceAction("hash"),
		new WaitForTransactionReceiptAction(),
		new GeERC20BalanceAction("receipt", "balance:await_hash"),
	]);

	await batch.run();

    batch.printLatencies();

    process.exit(0);
}
// Run the main function
try {
	await sentTestTransaction();
} catch (error) {
	console.error("Error sending transaction:", error);
}
