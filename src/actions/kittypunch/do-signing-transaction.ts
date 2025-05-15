import type { BrowserContext } from "../../types/context";
import { BaseAction } from "../../utils";

export class DoSigningTransaction extends BaseAction<BrowserContext> {
    get name() {
        return `${typeof this.order === "number" ? `${this.order}_` : ""}DoSigningTransaction`;
    }
    get awaitField() {
        return "swap-clicked";
    }
    get resultField() {
        return "transaction-signed";
    }

    async fn(ctx: BrowserContext) {
        const { websites, browser } = ctx;
        if (!websites.kittypunch) {
            throw new Error("Kittypunch website not found");
        }

        await websites.kittypunch.doSignTransaction();
        if (await websites.kittypunch.isApprovingTokens()) {
            await browser.waitForNotificationPageAndClickConfirm();
        }
        return true;
    }
}
