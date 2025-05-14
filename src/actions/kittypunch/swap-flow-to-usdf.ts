import type { BrowserContext } from "../../types/context";
import { BaseAction } from "../../utils";

export class SwapFlowToUsdf extends BaseAction<BrowserContext> {
    get name() {
        return `${typeof this.order === "number" ? `${this.order}_` : ""}SwapFlowToUsdf`;
    }
    get awaitField() {
        return "kittypunch-swap-initialized";
    }
    get resultField() {
        return "swap-clicked";
    }

    async fn(ctx: BrowserContext) {
        const { websites } = ctx;
        if (!websites.kittypunch) {
            throw new Error("Kittypunch website not found");
        }

        await websites.kittypunch.doSwap("FLOW", "USDF", "50%");
        return true;
    }
}
