import { readContract } from "@wagmi/core";
import { BaseAction, config } from "../utils";
import type { EVMBlockchainContext } from "../utils/types";

export class GeERC20BalanceAction extends BaseAction<EVMBlockchainContext> {
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

    async fn(ctx: EVMBlockchainContext) {
        const { account } = ctx;

        // ERC20 standard ABI with balanceOf function signature
        const abi = [
            {
                constant: true,
                inputs: [
                    {
                        name: "_owner",
                        type: "address",
                    },
                ],
                name: "balanceOf",
                outputs: [
                    {
                        name: "balance",
                        type: "uint256",
                    },
                ],
                payable: false,
                stateMutability: "view",
                type: "function",
            },
        ];
        // get erc20 balance
        const result = await readContract(config, {
            account: account,
            abi,
            address: "0x5e65b6b04fba51d95409712978cb91e99d93ae73",
            args: [account.address],
            functionName: "balanceOf",
        });

        console.log("--- Account Balance:", result);
        ctx[`balance:await_${this.awaitField}`] = result;
        return result;
    }
}
