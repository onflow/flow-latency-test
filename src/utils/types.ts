import type {
	PrivateKeyAccount,
	WaitForTransactionReceiptReturnType,
} from "viem";

export interface Context extends Record<string, unknown> {
	latencies: Record<string, Record<"waiting" | "completed", number>>;
}

export type EVMBlockchainContext = {
		account: PrivateKeyAccount;
		hash?: string;
		receipt?: WaitForTransactionReceiptReturnType;
	} & Context;
