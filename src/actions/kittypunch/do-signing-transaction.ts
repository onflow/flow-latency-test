import type { BrowserContext } from "../../types/context";
import { BaseAction } from "../../utils";

export class DoSigningTransaction extends BaseAction<BrowserContext> {
    get name() {
        return `${this.order ? `${this.order}_` : ""}DoSigningTransaction`;
    }
    get awaitField() {
        return "swap-clicked";
    }
    get resultField() {
        return "transaction-signed";
    }

    async fn(ctx: BrowserContext) {
        const { websites } = ctx;
        if (!websites.kittypunch) {
            throw new Error("Kittypunch website not found");
        }

        await websites.kittypunch.doSignTransaction();
        return true;
    }
}
