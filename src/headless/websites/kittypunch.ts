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
        const context = this.browser.getContext();
        await context.waitForEvent("page", { timeout: 1000 });

        const notificationPage = this.browser.findPageByUrl(
            this.browser.expectedExtensionNotificationUrl,
        );
        await notificationPage?.getByTestId("confirm-btn").click();
    }

    async swapFlowToUsdf() {
        await this.doSwap("FLOW", "USDF", "25%");
    }

    async swapUsdfToFlow() {
        await this.doSwap("USDF", "FLOW", "Max");
    }

    private async doSwap(from: SupportedToken, to: SupportedToken, amountButtonText: string) {
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
        await swapBtn.waitFor({ state: "visible" });

        // Wait for the swap button to be enabled
        while (await swapBtn.isDisabled()) {
            await page.waitForTimeout(200);
        }

        console.log("Swap button is enabled, clicking...");

        // Click on the swap button
        await swapBtn.click();

        console.log(
            "Swapping, waiting for the notification page to be opened, timeout in 120 seconds...",
        );

        // Wait for the notification page to be opened
        const context = this.browser.getContext();
        await context.waitForEvent("page", { timeout: 120000 });

        const notificationPage = this.browser.findPageByUrl(
            this.browser.expectedExtensionNotificationUrl,
        );
        console.log("Notification page is opened, clicking confirm button...");

        await notificationPage?.getByTestId("confirm-footer-button").click();

        // Wait a "p" div with text "Transaction completed" to be visible
        await page
            .locator("p")
            .filter({ hasText: /^Transaction completed$/ })
            .waitFor({ state: "visible" });

        console.log("Transaction completed");
    }
}
