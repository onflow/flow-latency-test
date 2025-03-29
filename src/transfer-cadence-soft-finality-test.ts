import { Batch, buildCadenceBlockchainContext } from "./utils";

import {
    GetCadenceBalanceAction,
    CadenceTransferAction,
    WaitForTransactionExecuted,
    WaitForTransactionSealed,
} from "./actions";

async function sentTestTransaction() {
    const ctx = await buildCadenceBlockchainContext(true);
    const batch = new Batch(ctx, [
        new CadenceTransferAction(),
        new GetCadenceBalanceAction("hash"),
        new WaitForTransactionExecuted(),
        new WaitForTransactionSealed(),
        new GetCadenceBalanceAction("receipt", "balance:await_hash"),
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
