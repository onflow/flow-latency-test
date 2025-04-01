import { sendTransaction } from "@wagmi/core";
import { parseEther } from "viem";
import { BaseAction, config } from "../utils";
import type { EVMBlockchainContext } from "../utils/types";

export class TransferAction extends BaseAction<EVMBlockchainContext> {
    get name() {
        return `${this.order ?? 0}_TransferAction`;
    }
    get awaitField() {
        return "account";
    }

    async fn(ctx: EVMBlockchainContext) {
        const { account } = ctx;
        // Send to self if no recipient address is provided
        const recipient = process.env.RECIPIENT ?? account.address;
        const no0xRecipient = recipient.startsWith("0x") ? recipient.substring(2) : recipient;

        const hash = await sendTransaction(config, {
            account: account,
            to: `0x${no0xRecipient}`,
            value: parseEther("0.0001"),
        });
        ctx.hash = hash;
        console.log(`--- Transaction sent with Hash: ${hash}`);
    }
}
