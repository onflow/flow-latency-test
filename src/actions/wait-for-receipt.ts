import { waitForTransactionReceipt } from "@wagmi/core";
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
		const receipt = await waitForTransactionReceipt(config, {
			chainId: chainNetwork.id,
			hash: `0x${hash?.substring(2)}`,
		});
		ctx.receipt = receipt;
		console.log("---- Transaction Receipt: status = ", receipt.status);
	}
}
