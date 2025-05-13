import { type WaitForTransactionReceiptReturnType, waitForTransactionReceipt } from "@wagmi/core";
import { flowMainnet, flowTestnet } from "viem/chains";
import type { EVMBlockchainContext } from "../types";
import { BaseAction, config, networkName } from "../utils";

export class WaitForTransactionReceiptAction extends BaseAction<EVMBlockchainContext> {
    get name() {
        return `${this.order ? `${this.order}_` : ""}WaitForTransactionReceipt`;
    }
    get awaitField() {
        return "hash";
    }
    get resultField() {
        return "receipt";
    }

    async fn(ctx: EVMBlockchainContext) {
        const { hash } = ctx;
        console.log("---- Waiting for transaction receipt: hash = ", hash);
        let receipt: WaitForTransactionReceiptReturnType;
        try {
            receipt = await waitForTransactionReceipt(config, {
                chainId: networkName === "mainnet" ? flowMainnet.id : flowTestnet.id,
                hash: `0x${hash?.substring(2)}`,
                pollingInterval: 200, // default is 1000
                timeout: 90000, // 1.5 minutes timeout for the wait
            });
            console.log("---- Transaction Receipt: status = ", receipt.status);
            return receipt;
        } catch (e: unknown) {
            const error = e as Error;
            console.error("---- Error waiting for transaction receipt: ", error);
        }
    }
}
