import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import type { BrowserContext, Page, Worker } from "playwright";
import { type ExtensionConfig, type ExtensionType, extensionTypes } from "./types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MetaMask extension path - you'll need to download the extension and place it in this directory
const EXTENSION_FOLDER_PATH = path.join(__dirname, "../../extensions");
// User data directory to persist browser state
const USER_DATA_DIR = path.join(__dirname, "../../user-data");

const UNLOCK_PASSWORD = process.env.CHROME_METAMASK_PASSWORD || "123456";

const extensionPaths: Record<ExtensionType, ExtensionConfig> = {
    metamask: {
        path: path.join(EXTENSION_FOLDER_PATH, "metamask-chrome"),
        extensionId: "jjceigejfnjmjoinfeinjhgpaagkpneh",
    },
    flowwallet: {
        path: path.join(EXTENSION_FOLDER_PATH, "flow-wallet-chrome"),
        extensionId: "hpclkefagolihohboafpheddmmgdffjm",
    },
};

export class HeadlessBrowser {
    private page: Page | undefined = undefined;
    private context: BrowserContext | undefined = undefined;
    private extensionWorker: Worker | undefined = undefined;
    private extensionPage: Page | undefined = undefined;

    constructor(private readonly extension: ExtensionType) {
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

    get expectedExtensionUrlPrefix() {
        return `chrome-extension://${this.extensionConfig.extensionId}`;
    }

    async initialize() {
        const args = [
            `--disable-extensions-except=${this.extensionConfig.path}`,
            `--load-extension=${this.extensionConfig.path}`,
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--disable-software-rasterizer",
        ];
        console.log("Starting browser with args:", args);

        try {
            const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
                channel: "chromium",
                headless: false,
                args,
                ignoreDefaultArgs: ["--disable-extensions"],
            });

            // For persistent context, browser() returns null
            // We can still use the context directly
            this.context = context;

            console.log("Chrome launched with persistent context");

            // 等待一段时间让扩展加载
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // 获取并打印扩展信息
            const workers = context.serviceWorkers();
            if (workers.length === 0) {
                this.extensionWorker = await context.waitForEvent("serviceworker");
            } else {
                this.extensionWorker = workers[0];
            }
            console.log("Extension worker loaded, URL:", this.extensionWorker?.url());

            console.log("Browser initialized successfully");
        } catch (error) {
            console.error("Failed to initialize browser:", error);
            throw error;
        }
    }

    async bringPageToFront() {
        if (!this.page) {
            throw new Error("Page not initialized");
        }
        await this.page.bringToFront();
    }

    async activateExtensionPage() {
        if (!this.context) {
            throw new Error("Browser context not initialized");
        }

        // Get the first page
        const pages = this.context.pages();
        let page: Page | undefined = undefined;
        if (pages.length > 0) {
            page = pages.find((page) => page.url().includes(this.expectedExtensionUrlPrefix));
        }
        if (!page) {
            page = await this.context.newPage();
            await page.goto(this.expectedExtensionUrlPrefix);
        }
        this.page = page;
        this.extensionPage = page;

        console.log("Current page URL:", this.page.url());

        await this.bringPageToFront();

        // Input password
        await this.page.getByTestId("unlock-password").fill(UNLOCK_PASSWORD);
        // Click unlock button
        await this.page.getByTestId("unlock-submit").click();
    }

    async ensureExtensionLoaded() {
        if (!this.context) {
            throw new Error("Browser context not initialized");
        }

        if (!this.extensionWorker) {
            // 获取并打印扩展信息
            const workers = this.context.serviceWorkers();
            if (workers.length === 0) {
                this.extensionWorker = await this.context.waitForEvent("serviceworker");
            } else {
                this.extensionWorker = workers[0];
            }
            console.log("Extension worker loaded, URL:", this.extensionWorker?.url());
        }

        // Check if MetaMask background page exists
        const extensionLoaded = this.extensionWorker
            ?.url()
            .includes(this.expectedExtensionUrlPrefix);

        if (!extensionLoaded) {
            throw new Error(`${this.extension} extension not found or not properly loaded`);
        }

        this.activateExtensionPage();
    }

    async close() {
        if (this.context) {
            await this.context.close();
            this.context = undefined;
            this.page = undefined;
            this.extensionWorker = undefined;
        }
    }

    getPage(): Page {
        if (!this.page) {
            throw new Error("Browser not initialized");
        }
        return this.page;
    }
}