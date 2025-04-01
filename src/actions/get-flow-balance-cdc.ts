import { BaseAction } from "../utils";
import type { CadenceBlockchainContext } from "../utils/types";

export class GetCadenceBalanceAction extends BaseAction<CadenceBlockchainContext> {
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

    async fn(ctx: CadenceBlockchainContext) {
        const { wallet } = ctx;

        const account = await wallet.connector.getAccount(wallet.address);
        console.log("--- Account Balance:", account.balance);
        ctx[`balance:await_${this.awaitField}`] = account.balance;
        return account.balance;
    }
}