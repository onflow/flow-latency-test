import { BaseAction } from "../utils";
import type { CadenceBlockchainContext } from "../utils/types";
import cadenceCode from '../cadence/transactions/transfer_flow_to_cadence_or_evm.cdc?raw';

export class CadenceTransferAction extends BaseAction<CadenceBlockchainContext> {
    get name() {
        return "0_TransferAction";
    }
    get awaitField() {
        return "wallet";
    }

    async fn(ctx: CadenceBlockchainContext) {
        const { wallet } = ctx;
        // Send to self if no recipient address is provided
        const recipient = process.env.RECIPIENT ?? wallet.address;
        const no0xRecipient = recipient.startsWith("0x")
            ? recipient.substring(2)
            : recipient;

        const hash = await wallet.sendTransaction(cadenceCode, (arg, t) => [
            arg(no0xRecipient, t.String),
            arg("0.0001", t.UFix64),
        ])
        ctx.hash = hash;
        console.log(`--- Transaction sent with Hash: ${hash}`);
    }
}