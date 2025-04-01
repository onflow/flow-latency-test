import { BaseAction } from "../utils";
import type { CadenceBlockchainContext } from "../utils/types";

export class WaitForTransactionExecuted extends BaseAction<CadenceBlockchainContext> {
    get name() {
        return `${this.order ? `${this.order}_` : ""}WaitForTransactionExecuted`;
    }
    get awaitField() {
        return "hash";
    }

    async fn(ctx: CadenceBlockchainContext) {
        const { wallet } = ctx;
        if (!ctx.hash) {
            throw new Error("No hash to await");
        }

        const receipt = await wallet.connector.onceTransactionExecuted(ctx.hash);
        ctx.receipt = receipt;
        console.log("---- Transaction Status: ", receipt.statusString);
    }
}