import { sendTransaction } from "@wagmi/core";
import { parseEther } from "viem";
import { flowMainnet, flowTestnet } from "viem/chains";
import { BaseAction, config, networkName } from "../utils";
import type { EVMBlockchainContext } from "../utils/types";

export class TransferERC20Action extends BaseAction<EVMBlockchainContext> {
    get name() {
        return `${this.order ?? 0}_TransferAction`;
    }
    get awaitField() {
        return "account";
    }
    get resultField() {
        return "hash";
    }

    async fn(ctx: EVMBlockchainContext) {
        const { account } = ctx;

        // Send to self if no recipient address is provided
        const recipient = process.env.RECIPIENT ?? account.address;
        const no0xRecipient = recipient.startsWith("0x") ? recipient.substring(2) : recipient;
        const amount = 0.000001 * 1e6;
        const hash = await sendTransaction(config, {
            account: account,
            chainId: networkName === "mainnet" ? flowMainnet.id : flowTestnet.id,
            to: "0x5e65b6b04fba51d95409712978cb91e99d93ae73", // The USDF contract address
            value: parseEther("0.0"), // No value transfer
            // Build the ERC20 transfer data
            data: `0xa9059cbb000000000000000000000000${no0xRecipient}${amount.toString(16).padStart(64, "0")}`,
        });
        console.log(`--- Transaction sent with Hash: ${hash}`);
        return hash;
    }
}
