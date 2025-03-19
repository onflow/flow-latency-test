import { getBalance } from "@wagmi/core";
import { BaseAction, config } from "../utils";
import type { EVMBlockchainContext } from "../utils/types";

export class GetBalanceAction extends BaseAction<EVMBlockchainContext> {
	private _field: string;
	private _change: string | undefined;

	constructor(awaitField?: string, awaitChange?: string) {
		super();
		this._field = awaitField ?? "hash";
		this._change = awaitChange;
	}

	get name() {
        return `GetBalance_Await_${this._field}${this.awaitChange ? "->Change" : ""}`;
	}
	get awaitField() {
		return this._field;
	}
	get awaitChange() {
		return this._change;
	}

	async fn(ctx: EVMBlockchainContext) {
		const { account } = ctx;
		// get the account balance
		const balance = await getBalance(config, { address: account.address });
		console.log("--- Account Balance:", balance.formatted);
		ctx[`balance:await_${this.awaitField}`] = balance.value;
		return balance.value;
	}
}
