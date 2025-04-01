import { BaseAction } from "../utils";
import type { CadenceBlockchainContext } from "../utils/types";

export class WaitForTransactionSealed extends BaseAction<CadenceBlockchainContext> {
    get name() {
        return `${this.order ? `${this.order}_` : ""}WaitForTransactionSealed`;
    }
    get awaitField() {
        return "hash";
    }
    async fn(ctx: CadenceBlockchainContext) {
        const { wallet } = ctx;
        if (!ctx.hash) {
            throw new Error("No hash to await");
        }

        const receipt = await wallet.connector.onceTransactionSealed(ctx.hash);
        ctx.receipt = receipt;
        console.log("---- Transaction Status: ", receipt.statusString);
    }
}