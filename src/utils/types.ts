import type {
	PrivateKeyAccount,
	WaitForTransactionReceiptReturnType,
	WalletClient,
} from "viem";

export interface Context extends Record<string, unknown> {
	latencies: Record<string, Record<"waiting" | "completed", number>>;
}

export type EVMBlockchainContext = {
	account: PrivateKeyAccount;
	client: WalletClient;
	hash?: string;
	receipt?: WaitForTransactionReceiptReturnType;
} & Context;
