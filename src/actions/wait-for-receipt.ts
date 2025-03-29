import { waitForTransactionReceipt, type WaitForTransactionReceiptReturnType } from "@wagmi/core";
import { BaseAction, chainNetwork, config } from "../utils";
import type { EVMBlockchainContext } from "../utils/types";

export class WaitForTransactionReceiptAction extends BaseAction<EVMBlockchainContext> {
	get name() {
		return "WaitForTransactionReceiptAction";
	}
	get awaitField() {
		return "hash";
	}

	async fn(ctx: EVMBlockchainContext) {
		const { hash } = ctx;
        console.log("---- Waiting for transaction receipt: hash = ", hash);
        let receipt: WaitForTransactionReceiptReturnType;
        try {
            receipt = await waitForTransactionReceipt(config, {
                chainId: chainNetwork.id,
                hash: `0x${hash?.substring(2)}`,
                pollingInterval: 200, // default is 1000
                timeout: 90000, // 1.5 minutes timeout for the wait
            });
            ctx.receipt = receipt;
            console.log("---- Transaction Receipt: status = ", receipt.status);
        } catch (e: unknown) {
            const error = e as Error;
            console.error("---- Error waiting for transaction receipt: ", error);
        }
	}
}
