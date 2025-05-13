import { HeadlessBrowser } from "../brower";
import { KittyPunch } from "../websites/kittypunch";

async function testMetaMask() {
    const browser = new HeadlessBrowser("metamask");
    try {
        await browser.initialize();

        await browser.ensureExtensionLoaded();

        const kittypunch = new KittyPunch(browser);
        await kittypunch.openSwapFlowToUsdfUrl();
        await kittypunch.connectWallet();
        await kittypunch.swapFlowToUsdf();
        await kittypunch.swapUsdfToFlow();

        console.log("Test completed successfully!");
    } catch (error) {
        console.error("Test failed:", error);
    } finally {
        await browser.close();
    }
}

testMetaMask().catch(console.error);
