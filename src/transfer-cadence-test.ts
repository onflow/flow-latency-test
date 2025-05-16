import { Batch, buildCadenceBlockchainContext } from "./utils";

import {
    CadenceTransferAction,
    GetCadenceBalanceAction,
    WaitForTransactionExecuted,
    WaitForTransactionSealed,
} from "./actions";

async function sentTestTransaction() {
    const ctx = await buildCadenceBlockchainContext();
    const batch = new Batch(ctx, [
        new CadenceTransferAction(0),
        new GetCadenceBalanceAction("hash", undefined, 1),
        new WaitForTransactionExecuted(2),
        new GetCadenceBalanceAction("receipt", "balance:await_hash", 3),
        new WaitForTransactionSealed(4),
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
