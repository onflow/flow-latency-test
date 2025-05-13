import { buildHeadlessBrowerContextWithMetamask, enableKittypunch } from "./headless/context";
import { Batch } from "./utils";

import {
    DoSigningTransaction,
    InitKittypunchSwap,
    SwapUsdfToFlow,
    WaitForCompleted,
} from "./actions/kittypunch";

async function start() {
    const ctx = await buildHeadlessBrowerContextWithMetamask();
    await enableKittypunch(ctx);

    const batch = new Batch(ctx, [
        new InitKittypunchSwap(0),
        new SwapUsdfToFlow(1),
        new DoSigningTransaction(2),
        new WaitForCompleted(3),
    ]);

    await batch.run();

    batch.printLatencies();

    process.exit(0);
}
// Run the main function
try {
    await start();
} catch (error) {
    console.error("Error:", error);
}
