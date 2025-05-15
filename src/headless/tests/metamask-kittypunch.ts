import { HeadlessBrowser } from "../brower";
import { KittyPunch } from "../websites/kittypunch";

async function testMetaMask() {
    const browser = new HeadlessBrowser("metamask");
    try {
        await browser.initialize();
        await browser.ensureExtensionLoaded();
        await browser.activateMetamask();
        await browser.switchToFlowMainnet();

        const kittypunch = new KittyPunch(browser);
        await kittypunch.openSwapFlowToUsdfUrl();
        await kittypunch.connectWallet();

        await kittypunch.doSwap("FLOW", "USDF", "25%");
        await kittypunch.doSignTransaction();
        await kittypunch.waitForTransactionCompleted();

        await kittypunch.doSwap("USDF", "FLOW", "Max");
        await kittypunch.doSignTransaction();
        if (await kittypunch.isApprovingTokens()) {
            await browser.waitForNotificationPageAndClickConfirm();
        }
        await kittypunch.waitForTransactionCompleted();

        console.log("Test completed successfully!");
    } catch (error) {
        console.error("Test failed:", error);
    } finally {
        await browser.close();
    }
}

testMetaMask().catch(console.error);
