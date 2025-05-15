import { Batch, buildEVMBlockchainContext } from "./utils";

import { GetBalanceAction, TransferAction, WaitForTransactionReceiptAction } from "./actions";

async function sentTestTransaction() {
    // Load EVM Private Key from environment variable
    const privateKey = process.env.PRIVATE_KEY || "";
    if (!privateKey) {
        throw new Error("No private key found in the environment variable");
    }

    const ctx = await buildEVMBlockchainContext(privateKey);
    const batch = new Batch(ctx, [
        new TransferAction(0),
        new GetBalanceAction("hash", undefined, 1),
        new WaitForTransactionReceiptAction(2),
        new GetBalanceAction("receipt", "balance:await_hash", 3),
    ]);

    await batch.run();

    batch.printLatencies();
}
// Run the main function
try {
    await sentTestTransaction();
} catch (error) {
    console.error("Error sending transaction:", error);
} finally {
    process.exit(0);
}
