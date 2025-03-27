import type {
  PrivateKeyAccount,
  WaitForTransactionReceiptReturnType,
} from "viem";
import type { ArgsFn } from "@onflow/fcl-core/types/exec/args";
import type { Account, TransactionStatus } from "@onflow/typedefs";
import type { FlowWallet } from "./flow";

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

export interface LatencyData {
    providerKey: string;
    runner: string;
    outputs: string[];
}

export interface ParsedLatency {
    order: number;
    name: string;
    waiting: number;
    completed: number;
}

export interface LatencyResult {
    timestamp: string;
    tests: Array<{
        runner: string;
        providerKey: string;
        metrics: Record<string, { waiting: number; completed: number }>;
    }>;
}

export interface ResultJson {
    timestamp: string;
    results: Array<LatencyResult>;
}