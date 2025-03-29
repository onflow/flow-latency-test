import { privateKeyToAccount } from "viem/accounts";
import { networkName } from "./config";
import type { CadenceBlockchainContext, Context, EVMBlockchainContext, LatencyResult } from "./types";
import { FlowConnector, FlowWallet, type NetworkType } from "./flow";

import flowJSON from '../../flow.json' assert { type: "json" };

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

        const delta = 50;
        const maxTimeout = 60000;
        // Wait for the awaitField to be non-undefined
        if (this.awaitField) {
            const awaitField = this.awaitField;
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
            let timeout = 0;
            while (result === oldValue) {
                if (timeout >= maxTimeout) {
                    break;
                }
                await new Promise((resolve) => setTimeout(resolve, delta));
                result = await this.fn(ctx);
                timeout += delta;
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

export async function buildCadenceBlockchainContext(useSoftFinality = false) {
    const connecter = new FlowConnector(flowJSON, networkName as NetworkType, useSoftFinality);
    const wallet = new FlowWallet(connecter)

    return { wallet, latencies: {} } as CadenceBlockchainContext;
}

export function generateFlattenJson(results: LatencyResult[]) {
    const flattenedResults = results.flatMap((result: LatencyResult) => {
        // Clean ISO timestamp (remove microseconds, force 'Z')
        const dt = new Date(result.timestamp);
        const timestamp = `${dt.toISOString().split('.')[0]}Z`;

        return result.tests.flatMap((test) => {
            const runner = test.runner;
            const provider = test.providerKey;
            const metrics = test.metrics;

            return Object.entries(metrics).map(([metricName, values]) => ({
                timestamp,
                runner,
                provider,
                metric: metricName,
                latency: values.completed - values.waiting,
                details: values,
            }));
        });
    });
    return flattenedResults;
}