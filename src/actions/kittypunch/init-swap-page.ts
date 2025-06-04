import type { BrowserContext } from "../../types/context";
import { BaseAction } from "../../utils";

export class InitKittypunchSwap extends BaseAction<BrowserContext> {
    get name() {
        return `${typeof this.order === "number" ? `${this.order}_` : ""}KittypunchSwap_PageInit`;
    }
    get awaitField() {
        return undefined;
    }
    get resultField() {
        return "kittypunch-swap-initialized";
    }

    async fn(ctx: BrowserContext) {
        const { websites } = ctx;
        if (!websites.kittypunch) {
            throw new Error("Kittypunch website not found");
        }

        await websites.kittypunch.openSwapFlowToUsdfUrl();
        await websites.kittypunch.connectWallet();

        return true;
    }
}
