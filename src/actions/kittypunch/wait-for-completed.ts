import type { BrowserContext } from "../../types/context";
import { BaseAction } from "../../utils";

export class WaitForCompleted extends BaseAction<BrowserContext> {
    get name() {
        return `${typeof this.order === "number" ? `${this.order}_` : ""}TransactionComplete`;
    }
    get awaitField() {
        return "transaction-signed";
    }
    get resultField() {
        return "transaction-completed";
    }

    async fn(ctx: BrowserContext) {
        const { websites } = ctx;
        if (!websites.kittypunch) {
            throw new Error("Kittypunch website not found");
        }

        await websites.kittypunch.waitForTransactionCompleted();
        return true;
    }
}
