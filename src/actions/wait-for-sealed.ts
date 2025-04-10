import { BaseAction } from "../utils";
import type { CadenceBlockchainContext } from "../utils/types";

export class WaitForTransactionSealed extends BaseAction<CadenceBlockchainContext> {
    get name() {
        return `${this.order ? `${this.order}_` : ""}WaitForTransactionSealed`;
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

        const receipt = await wallet.connector.onceTransactionSealed(ctx.hash);
        console.log("---- Transaction Status: ", receipt.statusString);
        return receipt;
    }
}