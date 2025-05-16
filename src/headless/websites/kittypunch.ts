import type { HeadlessBrowser } from "../brower";
import { FLOW_EVM_TOKENS, type SupportedToken } from "../constants";

export class KittyPunch {
    static getSwapUrl(from: SupportedToken, to: SupportedToken) {
        if (from === to) {
            throw new Error("From and to tokens cannot be the same");
        }
        return `https://swap.kittypunch.xyz/swap?tokens=${FLOW_EVM_TOKENS[from]}-${FLOW_EVM_TOKENS[to]}`;
    }

    constructor(private readonly browser: HeadlessBrowser) {}

    async openSwapFlowToUsdfUrl() {
        const url = KittyPunch.getSwapUrl("FLOW", "USDF");
        await this.browser.openNewPageWithUrl(url);
    }

    async connectWallet() {
        const page = this.browser.getCurrentPage();

        await page.waitForTimeout(1000);

        // check if the wallet is already connected
        const connectBtn = page.getByRole("button", { name: "Connect Wallet" });
        if (!(await connectBtn.isVisible())) {
            return;
        }

        await connectBtn.click();

        await page.getByTestId("rk-wallet-option-io.metamask").click();

        // wait for notification page to be opened
        await this.browser.waitForNotificationPageAndClickConfirm();
    }

    async doSwap(from: SupportedToken, to: SupportedToken, amountButtonText: string) {
        const url = KittyPunch.getSwapUrl(from, to);
        await this.browser.setPageWithUrl(url);

        const page = this.browser.getCurrentPage();
        await page.waitForLoadState("networkidle");

        console.log(`Clicking ${amountButtonText} button...`);

        // Input amount
        await page.getByRole("button", { name: amountButtonText }).click();

        // Get swap butturn
        const swapBtn = page
            .locator("div")
            .filter({ hasText: /^Swap$/ })
            .getByRole("button");

        console.log("Waiting for the swap button to be enabled...");

        // Wait for the swap button to be visible
        await swapBtn.waitFor({ state: "visible", timeout: 10000 });

        // Wait for the swap button to be enabled
        const timeout = 60000;
        const startTime = Date.now();
        while (await swapBtn.isDisabled()) {
            if (Date.now() - startTime > timeout) {
                throw new Error("Swap button is not enabled");
            }
            await page.waitForTimeout(100);
        }

        console.log("Swap button is enabled, clicking...");

        // Click on the swap button
        await swapBtn.click();
    }

    async inTransactionFailedCheck() {
        const page = this.browser.getCurrentPage();
        if (
            (await page
                .locator("button")
                .filter({ hasText: /^Close$/ })
                .isVisible()) &&
            (await page
                .locator("p")
                .filter({ hasText: "reverted with the following reason" })
                .isVisible())
        ) {
            return true;
        }
        return false;
    }

    async isApprovingTokens() {
        const page = this.browser.getCurrentPage();
        return await page.locator("p").filter({ hasText: "Approving" }).isVisible();
    }

    async waitForTransactionCompleted() {
        const page = this.browser.getCurrentPage();
        await page
            .locator("p")
            .filter({ hasText: /^Transaction completed$/ })
            .waitFor({ state: "visible", timeout: 60000 });
        console.log("Transaction completed");
    }
}
