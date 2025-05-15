import { Batch, buildEVMBlockchainContext } from "./utils";

import {
    GeERC20BalanceAction,
    TransferERC20Action,
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
        new TransferERC20Action(0),
        new GeERC20BalanceAction("hash", undefined, 1),
        new WaitForTransactionReceiptAction(2),
        new GeERC20BalanceAction("receipt", "balance:await_hash", 3),
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
