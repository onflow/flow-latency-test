import type { BrowserContext } from "../../types/context";
import { BaseAction } from "../../utils";

export class DoSigningTransaction extends BaseAction<BrowserContext> {
    get name() {
        return `${typeof this.order === "number" ? `${this.order}_` : ""}SignTransaction`;
    }
    get awaitField() {
        return "swap-clicked";
    }
    get resultField() {
        return "transaction-signed";
    }

    async fn(ctx: BrowserContext) {
        const { websites, browser } = ctx;
        if (websites.kittypunch === undefined) {
            throw new Error("Kittypunch website not found");
        }

        console.log(
            "Swapping, waiting for the notification page to be opened, timeout in 60 seconds...",
        );

        // Wait for the notification page to be opened
        await browser.waitForNotificationPageAndClickConfirm({
            failCheck: async () => (await websites.kittypunch?.inTransactionFailedCheck()) ?? false,
            failMessage: "Transaction Request reverted or failed, App shows an error",
        });

        if (await websites.kittypunch.isApprovingTokens()) {
            await browser.waitForNotificationPageAndClickConfirm({
                failCheck: async () =>
                    (await websites.kittypunch?.inTransactionFailedCheck()) ?? false,
                failMessage: "Transaction Request reverted or failed, App shows an error",
            });
        }
        return true;
    }
}
