import type { CadenceBlockchainContext } from "../types";
import { BaseAction } from "../utils";

export class WaitForTransactionExecuted extends BaseAction<CadenceBlockchainContext> {
    get name() {
        return `${this.order ? `${this.order}_` : ""}WaitForTransactionExecuted`;
    }
    get awaitField() {
        return "hash";
    }
    get resultField() {
        return "receipt";
    }

    async fn(ctx: CadenceBlockchainContext) {
        const { wallet } = ctx;
        if (!ctx.hash) {
            throw new Error("No hash to await");
        }

        const receipt = await wallet.connector.onceTransactionExecuted(ctx.hash);
        console.log("---- Transaction Status: ", receipt.statusString);
        return receipt;
    }
}
