import { parseEther } from "viem";
import { sendTransaction } from "@wagmi/core";
import { BaseAction, config } from "../utils";
import type { EVMBlockchainContext } from "../utils/types";

export class TransferERC20Action extends BaseAction<EVMBlockchainContext> {
	get name() {
		return "0_TransferAction";
	}
	get awaitField() {
		return "account";
	}

	async fn(ctx: EVMBlockchainContext) {
        const { account } = ctx;

		// Send to self if no recipient address is provided
		const recipient = process.env.RECIPIENT ?? account.address;
		const no0xRecipient = recipient.startsWith("0x")
			? recipient.substring(2)
			: recipient;
		const amount = 0.001 * 1e18;
		const hash = await sendTransaction(config, {
			account: account,
			to: "0x5e65b6b04fba51d95409712978cb91e99d93ae73", // The USDF contract address
			value: parseEther("0.0"), // No value transfer
			// Build the ERC20 transfer data
			data: `0xa9059cbb000000000000000000000000${no0xRecipient}${amount.toString(16).padStart(64, "0")}`,
		});
		ctx.hash = hash;
		console.log(`--- Transaction sent with Hash: ${hash}`);
	}
}