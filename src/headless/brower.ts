import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import type { BrowserContext, Page, Worker } from "playwright";
import { networkName } from "../utils/config";
import { importAccountBySeedPhrase } from "./helper";
import { type ExtensionConfig, type ExtensionType, extensionTypes } from "./types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MetaMask extension path - you'll need to download the extension and place it in this directory
const EXTENSION_FOLDER_PATH = path.join(__dirname, "../../extensions");
// User data directory to persist browser state
const USER_DATA_DIR = path.join(__dirname, "../../user-data");

const UNLOCK_PASSWORD = process.env.CHROME_METAMASK_PASSWORD || "123456";
const MNEMONIC = process.env.CHROME_METAMASK_MNEMONIC;

const FLOW_WALLET_MNEMONIC = process.env.FLOW_WALLET_MNEMONIC || MNEMONIC;
const FLOW_WALLET_PASSWORD = process.env.FLOW_WALLET_PASSWORD || UNLOCK_PASSWORD;
const FLOW_WALLET_USERNAME = process.env.FLOW_WALLET_USERNAME || "latency";
const FLOW_WALLET_ADDRESS =
    process.env[`${networkName.toUpperCase()}_FLOW_ADDRESS`] || process.env.FLOW_ADDRESS;

const extensionPaths: Record<ExtensionType, ExtensionConfig> = {
    metamask: {
        path: path.join(EXTENSION_FOLDER_PATH, "metamask"),
        extensionId: "mnpjmeobhidmnodbplgdkpoolebhegfj",
    },
    flowwallet: {
        path: path.join(EXTENSION_FOLDER_PATH, "flow-wallet"),
        extensionId: "hpclkefagolihohboafpheddmmgdffjm",
    },
};

function logWithTimestamp(message: string) {
    const now = new Date();
    const timestamp = now.toISOString();
    // Add some color and formatting for better visibility
    console.log(`\x1b[35m[HeadlessBrowser][${timestamp}]\x1b[0m ${message}`);
}

export class HeadlessBrowser {
    private page: Page | undefined = undefined;
    private context: BrowserContext | undefined = undefined;
    private extensionWorker: Worker | undefined = undefined;
    private extensionPage: Page | undefined = undefined;
    private cachedExtensionId: string | undefined = undefined;

    constructor(public readonly extension: ExtensionType) {
        if (!extensionTypes.includes(extension)) {
            throw new Error(`Invalid extension type: ${extension}`);
        }
        if (!extensionPaths[extension]) {
            throw new Error(`Extension path not found for type: ${extension}`);
        }
    }

    get extensionConfig() {
        return extensionPaths[this.extension];
    }

    get extensionId() {
        return this.cachedExtensionId ?? this.extensionConfig.extensionId;
    }

    get expectedExtensionUrlPrefix() {
        return `chrome-extension://${this.extensionId}`;
    }

    get expectedExtensionHomeUrl() {
        if (this.extension === "flowwallet") {
            return `chrome-extension://${this.extensionId}/index.html`;
        }
        return `chrome-extension://${this.extensionId}/home.html`;
    }

    get expectedExtensionNotificationUrl() {
        return `chrome-extension://${this.extensionId}/notification.html`;
    }

    async initialize() {
        const args = [
            `--disable-extensions-except=${this.extensionConfig.path}`,
            `--load-extension=${this.extensionConfig.path}`,
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--disable-software-rasterizer",
            "--allow-read-clipboard",
            "--allow-write-clipboard",
            "--lang=en-US",
        ];
        logWithTimestamp(`Starting browser with args: ${JSON.stringify(args)}`);

        try {
            const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
                channel: "chromium",
                headless: true,
                args,
                ignoreDefaultArgs: ["--disable-extensions"],
                env: {
                    LANGUAGE: "en_US",
                },
                permissions: ["clipboard-read", "clipboard-write"],
            });

            // For persistent context, browser() returns null
            // We can still use the context directly
            this.context = context;

            logWithTimestamp("Chrome launched with persistent context");

            await new Promise((resolve) => setTimeout(resolve, 1000));

            const workers = context.serviceWorkers();
            if (workers.length === 0) {
                this.extensionWorker = await context.waitForEvent("serviceworker");
            } else {
                this.extensionWorker = workers[0];
            }
            const url = this.extensionWorker?.url();
            logWithTimestamp(`Extension worker loaded, URL: ${url}`);
            this.cachedExtensionId = url?.split("/")[2];

            logWithTimestamp("Browser initialized successfully");
        } catch (error) {
            logWithTimestamp(
                `Failed to initialize browser: ${error instanceof Error ? error.message : String(error)}`,
            );
            throw error;
        }
    }

    async ensureExtensionLoaded() {
        if (!this.context) {
            logWithTimestamp("Browser context not initialized");
            throw new Error("Browser context not initialized");
        }

        if (!this.extensionWorker) {
            const workers = this.context.serviceWorkers();
            if (workers.length === 0) {
                this.extensionWorker = await this.context.waitForEvent("serviceworker");
            } else {
                this.extensionWorker = workers[0];
            }
            logWithTimestamp(`Extension worker loaded, URL: ${this.extensionWorker?.url()}`);
        }

        // Check if MetaMask background page exists
        const extensionLoaded = this.extensionWorker
            ?.url()
            .includes(this.expectedExtensionUrlPrefix);

        if (!extensionLoaded) {
            logWithTimestamp(`${this.extension} extension not found or not properly loaded`);
            throw new Error(`${this.extension} extension not found or not properly loaded`);
        }

        // wait for 1 second
        await new Promise((resolve) => setTimeout(resolve, 1000));
        logWithTimestamp("Extension loaded and ready");
    }

    async activateWalletHomePage(reload = false) {
        if (!this.context) {
            logWithTimestamp("Browser context not initialized");
            throw new Error("Browser context not initialized");
        }

        // Get the first page
        const pages = this.context.pages();
        let page: Page | undefined = undefined;
        if (pages.length > 0) {
            page = pages.find((page) => page.url().includes(this.expectedExtensionUrlPrefix));
        }
        if (!page) {
            logWithTimestamp("No page found, creating new page");
            page = await this.context.newPage();
        }
        if (reload || !page.url().includes(this.expectedExtensionUrlPrefix)) {
            await page.goto(this.expectedExtensionHomeUrl);
        }
        this.extensionPage = page;
        this.page = page;

        logWithTimestamp(`Extension page URL: ${this.extensionPage.url()}`);
        await this.extensionPage.waitForLoadState("domcontentloaded");
        await this.bringPageToFront();
        logWithTimestamp("Extension home page activated and brought to front");
    }

    async activateMetamask(reload = false) {
        logWithTimestamp("Activating MetaMask extension...");
        await this.activateWalletHomePage(reload);

        if (this.extensionPage === undefined) {
            logWithTimestamp("Extension page not initialized");
            throw new Error("Extension page not initialized");
        }

        // wait for 1 second
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const unlockPassword = this.extensionPage.getByTestId("unlock-password");
        if (await unlockPassword.isVisible()) {
            logWithTimestamp("Unlocking MetaMask with password");
            // Input password
            await unlockPassword.fill(UNLOCK_PASSWORD);
            // Click unlock button
            await this.extensionPage.getByTestId("unlock-submit").click();
        } else {
            logWithTimestamp("MetaMask onboarding: accepting terms and importing wallet");
            await this.extensionPage.getByTestId("onboarding-terms-checkbox").click();

            const importWalletButton = this.extensionPage.getByTestId("onboarding-import-wallet");
            await importWalletButton.waitFor({ state: "visible" });
            if (await importWalletButton.isEnabled()) {
                await importWalletButton.click();
            } else {
                logWithTimestamp("Import wallet button not found");
                throw new Error("Import wallet button not found");
            }

            const noThanksButton = this.extensionPage.getByTestId("metametrics-no-thanks");
            if (await noThanksButton.isVisible()) {
                await noThanksButton.click();
            }

            const mnemonicWords = MNEMONIC?.split(" ") ?? [];
            if (mnemonicWords.length !== 12) {
                logWithTimestamp("Invalid mnemonic");
                throw new Error("Invalid mnemonic");
            }

            for (let i = 0; i < 12; i++) {
                if (typeof mnemonicWords[i] === "string") {
                    const word: string = mnemonicWords[i] as string;
                    await this.extensionPage.getByTestId(`import-srp__srp-word-${i}`).fill(word);
                } else {
                    logWithTimestamp("Invalid mnemonic word");
                    throw new Error("Invalid mnemonic word");
                }
            }

            await this.extensionPage.getByTestId("import-srp-confirm").click();

            // To create password
            const createPassworText = this.extensionPage.getByTestId("create-password-new");
            await createPassworText.waitFor({ state: "visible" });
            await createPassworText.fill(UNLOCK_PASSWORD);
            await this.extensionPage.getByTestId("create-password-confirm").fill(UNLOCK_PASSWORD);

            // accept terms
            const createPasswordTerms = this.extensionPage.getByTestId("create-password-terms");
            if (await createPasswordTerms.isVisible()) {
                await createPasswordTerms.click();
            }
            // click input
            const createPasswordButton = this.extensionPage.getByTestId("create-password-import");
            await createPasswordButton.waitFor({ state: "visible" });
            if (await createPasswordButton.isEnabled()) {
                await createPasswordButton.click();
            }

            // done
            const doneButton = this.extensionPage.getByTestId("onboarding-complete-done");
            await doneButton.waitFor({ state: "visible" });
            if (await doneButton.isEnabled()) {
                await doneButton.click();
            }

            const next1Btn = this.extensionPage.getByTestId("pin-extension-next");
            if (await next1Btn.isVisible()) {
                await next1Btn.click();
            }

            const next2Btn = this.extensionPage.getByTestId("pin-extension-done");
            if (await next2Btn.isVisible()) {
                await next2Btn.click();
            }

            // wait for network display to be visible
            await this.extensionPage.getByTestId("network-display").waitFor({ state: "visible" });

            // avoid onboarding popup
            const notNowBtn = this.extensionPage.getByTestId("not-now-button");
            if (await notNowBtn.isVisible()) {
                logWithTimestamp("Not now button found, clicking");
                await notNowBtn.click();
            }

            // wait for network idle
            await this.extensionPage.waitForLoadState("networkidle");
        }
        logWithTimestamp("MetaMask activated and ready");
    }

    async activateFlowWallet() {
        const pages = this.context?.pages();
        if (pages && pages.length === 0) {
            logWithTimestamp("No page found, creating new page");
            this.extensionPage = await this.context?.newPage();
        }
        if (this.extensionPage === undefined && pages && pages.length > 0) {
            this.extensionPage = pages[pages.length - 1];
        }
        logWithTimestamp("Flow Wallet about to import account");

        if (!this.extensionPage) {
            logWithTimestamp("Extension page not initialized");
            throw new Error("Extension page not initialized");
        }

        // ensure all the env variables are set
        if (
            !FLOW_WALLET_MNEMONIC ||
            !FLOW_WALLET_USERNAME ||
            !FLOW_WALLET_PASSWORD ||
            !FLOW_WALLET_ADDRESS
        ) {
            logWithTimestamp("Flow wallet mnemonic, username, password, and address are not set");
            throw new Error("Flow wallet mnemonic, username, password, and address are not set");
        }

        await importAccountBySeedPhrase({
            page: this.extensionPage,
            extensionId: this.extensionId,
            seedPhrase: FLOW_WALLET_MNEMONIC,
            username: FLOW_WALLET_USERNAME,
            password: FLOW_WALLET_PASSWORD,
            accountAddr: FLOW_WALLET_ADDRESS,
        });

        logWithTimestamp("Flow Wallet activated and ready");
    }
    async switchToFlowMainnet() {
        if (this.extension === "flowwallet") {
            // TODO: switch to flow mainnet
            return;
        }
        logWithTimestamp("Switching to Flow Mainnet network...");
        await this.activateWalletHomePage();

        if (this.context === undefined) {
            logWithTimestamp("Browser context not initialized");
            throw new Error("Browser context not initialized");
        }
        if (this.extensionPage === undefined) {
            logWithTimestamp("Extension page not initialized");
            throw new Error("Extension page not initialized");
        }

        const networkButton = this.extensionPage.getByTestId("network-display");
        // get the text of the network button
        const networkText = await networkButton.locator("p").textContent();
        if (networkText?.includes("Flow EVM")) {
            logWithTimestamp("Already on Flow Mainnet");
            return;
        }

        logWithTimestamp("Go to flow doc to add network");

        // goto flow doc to add
        const page = await this.context.newPage();
        await page.goto("https://developers.flow.com/evm/using");
        await page.waitForLoadState("domcontentloaded");

        logWithTimestamp("Page loaded, waiting for network item to be visible");

        const networkItem = page.getByText("Add Flow EVM Network");
        await networkItem.waitFor({ state: "visible" });
        logWithTimestamp("Network item visible, clicking");
        await networkItem.click();

        logWithTimestamp("Clicked, waiting for notification page to be opened");

        // wait for notification page to be opened
        await this.waitForNotificationPageAndClickConfirm();

        logWithTimestamp("Notification page confirmed, closing page");

        if (!page.isClosed()) {
            await page.close();
        }
    }

    async waitForNotificationPageAndClickConfirm(opts?: {
        failCheck?: () => Promise<boolean>;
        failMessage?: string;
    }) {
        if (!this.context) {
            logWithTimestamp("Browser context not initialized");
            throw new Error("Browser context not initialized");
        }

        const timeout = 60000;
        const timeToOpenNotificationPage = 15000;
        const startTime = Date.now();
        let page: Page | undefined = undefined;
        logWithTimestamp("Waiting for notification page to open...");
        while (true) {
            const notificationPage = this.findPageByUrl(this.expectedExtensionNotificationUrl);
            if (notificationPage) {
                page = notificationPage;
                logWithTimestamp("Notification page found");
                break;
            }
            if (typeof opts?.failCheck === "function") {
                const result = await opts.failCheck();
                if (result) {
                    if (typeof opts.failMessage === "string") {
                        logWithTimestamp(opts.failMessage);
                        throw new Error(opts.failMessage);
                    }
                    break;
                }
            }
            const timeElapsed = Date.now() - startTime;
            if (timeElapsed > timeout) {
                logWithTimestamp("Timeout waiting for notification page");
                break;
            }
            if (timeElapsed > timeToOpenNotificationPage) {
                logWithTimestamp("No notification page found, forcing to open");
                page = await this.context.newPage();
                await page.goto(this.expectedExtensionNotificationUrl);
                break;
            }
            await new Promise((resolve) => setTimeout(resolve, 200));
        }

        if (!page) {
            logWithTimestamp(
                `Timeout, existing pages: ${this.context
                    .pages()
                    .map((page) => page.url())
                    .join(", ")}`,
            );
            throw new Error("Notification page not found");
        }
        await page.waitForLoadState("domcontentloaded");
        const btn1 = page.getByTestId("confirmation-submit-button");
        const btn2 = page.getByTestId("confirm-btn");
        const btn3 = page.getByTestId("confirm-footer-button");
        const btn4 = page.getByTestId("confirm-button");
        const btn5 = page
            .getByRole("button", { name: "Connect", disabled: false, exact: true })
            .first();
        const btn6 = page
            .getByRole("button", { name: "Approve", disabled: false, exact: true })
            .first();
        const btn7 = page
            .getByRole("button", { name: "Confirm", disabled: false, exact: true })
            .first();

        // Wait until one of these three button visible and click it
        try {
            logWithTimestamp("Confirmed in notification page, waiting for button to be visible.");
            const btn = btn1
                .or(btn2)
                .or(btn3)
                .or(btn4)
                .or(btn5)
                .or(btn6)
                .or(btn7)
                .filter({ visible: true });
            await btn.waitFor({ state: "visible", timeout: 10000 });
            logWithTimestamp("Button visible and not disabled, clicking");
            await btn.click();
        } catch (error) {
            logWithTimestamp(`${error instanceof Error ? error.message : String(error)}`);
            throw new Error("Failed to click notification page button");
        }

        try {
            logWithTimestamp("Button clicked, waiting for page to be closed.");
            await page.waitForEvent("close", { timeout: 500 });
        } catch (_error) {
        } finally {
            // Ensure the page is closed
            if (!page.isClosed()) {
                await page.close();
            }
        }
    }

    async close() {
        if (this.context) {
            logWithTimestamp("Closing browser context...");
            await this.context.close();
            this.context = undefined;
            this.page = undefined;
            this.extensionWorker = undefined;
            logWithTimestamp("Browser context closed.");
        }
    }

    async bringPageToFront() {
        if (!this.page) {
            logWithTimestamp("Page not initialized");
            throw new Error("Page not initialized");
        }
        await this.page.bringToFront();
        logWithTimestamp("Page brought to front");
    }

    async openNewPageWithUrl(url: string) {
        if (!this.context) {
            logWithTimestamp("Browser context not initialized");
            throw new Error("Browser context not initialized");
        }
        // ensure URL is valid
        const urlObj = new URL(url);
        if (!urlObj.protocol) {
            logWithTimestamp("Invalid URL");
            throw new Error("Invalid URL");
        }

        const page = await this.context.newPage();
        await page.goto(urlObj.href, { waitUntil: "domcontentloaded" });

        this.page = page;

        await this.bringPageToFront();
        logWithTimestamp(`New page opened with URL: ${urlObj.href}`);

        return page;
    }

    async setPageWithUrl(url: string) {
        if (!this.context) {
            logWithTimestamp("Browser context not initialized");
            throw new Error("Browser context not initialized");
        }
        if (!this.page) {
            this.page = await this.context.newPage();
        }
        if (this.page.url().includes(url)) {
            logWithTimestamp(`Page already at URL: ${url}`);
            return this.page;
        }

        await this.page.goto(url, { waitUntil: "domcontentloaded" });
        await this.bringPageToFront();
        logWithTimestamp(`Page navigated to URL: ${url}`);

        return this.page;
    }

    findPageByUrl(url: string) {
        if (!this.context) {
            logWithTimestamp("Browser context not initialized");
            throw new Error("Browser context not initialized");
        }
        const found = this.context.pages().find((page) => page.url().includes(url));
        if (found) {
            logWithTimestamp(`Found page with URL containing: ${url}`);
        }
        return found;
    }

    getCurrentPage(): Page {
        if (!this.page) {
            logWithTimestamp("Current page not initialized");
            throw new Error("Current page not initialized");
        }
        return this.page;
    }

    getContext(): BrowserContext {
        if (!this.context) {
            logWithTimestamp("Browser context not initialized");
            throw new Error("Browser context not initialized");
        }
        return this.context;
    }
}