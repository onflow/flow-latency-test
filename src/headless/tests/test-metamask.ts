import { HeadlessBrowser } from "..";

async function testMetaMask() {
    const browser = new HeadlessBrowser("metamask");
    try {
        await browser.initialize();
        await browser.checkMetaMaskExtension();
        console.log("Test completed successfully!");
    } catch (error) {
        console.error("Test failed:", error);
    } finally {
        await browser.close();
    }
}

testMetaMask().catch(console.error);
