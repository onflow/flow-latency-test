import type {
  PrivateKeyAccount,
  WaitForTransactionReceiptReturnType,
} from "viem";
import type { ArgsFn } from "@onflow/fcl-core/types/exec/args";
import type { Account } from "@onflow/typedefs";

export interface Context extends Record<string, unknown> {
  latencies: Record<string, Record<"waiting" | "completed", number>>;
}

export type EVMBlockchainContext = {
  account: PrivateKeyAccount;
  hash?: string;
  receipt?: WaitForTransactionReceiptReturnType;
} & Context;

export type Authz = (account: Account) => Promise<object> | object;

export interface IFlowScriptExecutor {
  /**
   * Execute a script
   * @param code Cadence code
   * @param args Cadence arguments
   */
  executeScript<T>(code: string, args: ArgsFn, defaultValue: T): Promise<T>;
}

/**
 * Signer interface
 */
export interface IFlowSigner {
  /**
   * Send a transaction
   */
  sendTransaction(code: string, args: ArgsFn, authz?: Authz): Promise<string>;

  /**
   * Build authorization
   */
  buildAuthorization(accountIndex?: number, privateKey?: string): Authz;
}
