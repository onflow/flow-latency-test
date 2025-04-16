import { sendTransaction } from "@wagmi/core";
import { parseEther } from "viem";
import { flowMainnet, flowTestnet } from "viem/chains";
import { BaseAction, config, networkName } from "../utils";
import type { EVMBlockchainContext } from "../utils/types";

export class TransferAction extends BaseAction<EVMBlockchainContext> {
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

        console.log("Network:", networkName);
        console.log("Chain ID:", networkName === "mainnet" ? flowMainnet.id : flowTestnet.id);
        console.log("Network RPC:", networkName === "mainnet" ? process.env.EVM_MAINNET_RPC_ENDPOINT_URL : process.env.EVM_TESTNET_RPC_ENDPOINT_URL);

        const hash = await sendTransaction(config, {
            account: account,
            chainId: networkName === "mainnet" ? flowMainnet.id : flowTestnet.id,
            to: `0x${no0xRecipient}`,
            value: parseEther("0.0001"),
        });
        console.log(`--- Transaction sent with Hash: ${hash}`);
        return hash;
    }
}
