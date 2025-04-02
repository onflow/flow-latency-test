import { getBalance } from "@wagmi/core";
import { flowMainnet, flowTestnet } from "viem/chains";
import { BaseAction, config, networkName } from "../utils";
import type { EVMBlockchainContext } from "../utils/types";

export class GetBalanceAction extends BaseAction<EVMBlockchainContext> {
    private _field: string;
    private _change: string | undefined;

    constructor(awaitField?: string, awaitChange?: string, order?: number) {
        super(order);
        this._field = awaitField ?? "hash";
        this._change = awaitChange;
    }

    get name() {
        return `${this.order ? `${this.order}_` : ""}GetBalance_Await_${this._field}${this.awaitChange ? "->Change" : ""}`;
    }
    get awaitField() {
        return this._field;
    }
    get awaitChange() {
        return this._change;
    }
    get resultField() {
        return `balance:await_${this.awaitField}`;
    }

    async fn(ctx: EVMBlockchainContext) {
        const { account } = ctx;
        // get the account balance
        const balance = await getBalance(config, {
            address: account.address,
            chainId: networkName === "mainnet" ? flowMainnet.id : flowTestnet.id,
        });
        console.log("--- Account Balance:", balance.formatted);
        return balance.value;
    }
}
