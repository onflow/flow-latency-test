import type { BrowserContext } from "../types/context";
import { HeadlessBrowser } from "./brower";
import { KittyPunch } from "./websites";

export async function buildHeadlessBrowerContextWithMetamask() {
    const browser = new HeadlessBrowser("metamask");

    try {
        await browser.initialize();
        await browser.ensureExtensionLoaded();
    } catch (error) {
        console.error("Error initializing browser:", error);
        throw error;
    }

    return { browser, websites: {} } as BrowserContext;
}

export async function enableKittypunch(ctx: BrowserContext) {
    const kittypunch = new KittyPunch(ctx.browser);
    ctx.websites.kittypunch = kittypunch;
}
