import { privateKeyToAccount } from "viem/accounts";
import { getWalletClient } from "@wagmi/core";
import { chainNetwork, config, networkName } from "./config";
import type { Context, EVMBlockchainContext } from "./types";

export * from "./config";

export function logTimeWrapper(fn: (...args: unknown[]) => Promise<unknown>) {
  return async (...args: unknown[]) => {
    console.time(`Function Call [${fn.name}]`);
    const result = await fn(...args);
    console.timeEnd(`Function Call [${fn.name}]`);
    return result;
  };
}

export interface Action<T extends Context> {
  get name(): string;
  handler: (ctx: T) => Promise<unknown>;
}

export abstract class BaseAction<T extends Context> implements Action<T> {
  abstract get name(): string;
  abstract get awaitField(): string | undefined;
  abstract fn(ctx: T): Promise<unknown>;

  get awaitChange(): string | undefined {
    return undefined;
  }

  async handler(ctx: T): Promise<unknown> {
    const startAt = Date.now();
    console.time(`Action [${this.name}]`);

    const record = { waiting: 0, completed: 0 };

    // Wait for the awaitField to be non-undefined
    if (this.awaitField) {
      const awaitField = this.awaitField;
      const maxTimeout = 60000;
      const delta = 50;
      let timeout = 0;
      while (typeof ctx[awaitField] === "undefined") {
        if (timeout >= maxTimeout) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, delta));
        timeout += delta;
      }
      record.waiting = timeout;
    }

    let result = await this.fn(ctx);
    if (this.awaitChange) {
      const oldValue = ctx[this.awaitChange];
      while (result === oldValue) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        result = await this.fn(ctx);
      }
    }

    record.completed = Date.now() - startAt;
    console.timeEnd(`Action [${this.name}]`);

    ctx.latencies[this.name] = record;
    return result;
  }
}

export class Batch<T extends Context> {
  private _actions: Action<T>[] = [];
  private _context: T;

  constructor(context: T, actions: Action<T>[]) {
    this._context = Object.assign({}, context);
    this._actions = actions;
  }

  get context(): T {
    return this._context;
  }

  async run(): Promise<void> {
    // Run all the action parallelly
    await Promise.all(
      this._actions.map((action) => action.handler(this._context)),
    );
  }

  printLatencies() {
    // Print the latencies in the console with a nice format
    console.log("\n ---- Latencies ----");
    for (const [action, record] of Object.entries(this._context.latencies)) {
      console.log(
        `- ${action}: ${record.waiting}ms(waiting) - ${record.completed}ms(completed)`,
      );
    }
  }
}

export async function buildEVMBlockchainContext(privKey: string) {
  // Create a private key from the environment variable
  const key = privKey.startsWith("0x") ? privKey.substring(2) : privKey;

  const account = privateKeyToAccount(`0x${key}`);
  console.log(`[Address: ${account.address} @${networkName}]`);

  return { account, latencies: {} } as EVMBlockchainContext;
}