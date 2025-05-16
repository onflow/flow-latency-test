import type { TransactionStatus } from "@onflow/typedefs";
import type { PrivateKeyAccount, WaitForTransactionReceiptReturnType } from "viem";
import type { HeadlessBrowser, KittyPunch } from "../headless";
import type { FlowWallet } from "../utils/flow";

export interface Context extends Record<string, unknown> {
    latencies: Record<string, Record<"waiting" | "completed", number>>;
}

export type EVMBlockchainContext = {
    account: PrivateKeyAccount;
    hash?: string;
    receipt?: WaitForTransactionReceiptReturnType;
} & Context;

export type CadenceBlockchainContext = {
    wallet: FlowWallet;
    hash?: string;
    receipt?: TransactionStatus;
} & Context;

export type BrowserContext = {
    browser: HeadlessBrowser;
    websites: {
        kittypunch?: KittyPunch;
    };
} & Context;
