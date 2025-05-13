export * from "./config";
export * from "./context";

import type { Context, LatencyResult } from "../types/index";

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
    constructor(protected readonly order?: number) {}

    abstract get name(): string;
    abstract get awaitField(): string | undefined;
    abstract fn(ctx: T): Promise<unknown>;

    get awaitChange(): string | undefined {
        return undefined;
    }
    get resultField(): string | undefined {
        return undefined;
    }

    async handler(ctx: T) {
        const startAt = Date.now();
        console.time(`Action [${this.name}]`);

        const record = { waiting: 0, completed: 0 };

        const delta = 50;
        const maxTimeout = 60000;
        let isTimeout = false;
        // Wait for the awaitField to be non-undefined
        if (this.awaitField) {
            const awaitField = this.awaitField;
            let timeout = 0;
            while (typeof ctx[awaitField] === "undefined") {
                if (timeout >= maxTimeout) {
                    isTimeout = true;
                    break;
                }
                timeout += delta;
                await new Promise((resolve) => setTimeout(resolve, delta));
            }
            record.waiting = isTimeout ? timeout : Date.now() - startAt;
        }

        let result: unknown;

        if (!isTimeout) {
            result = await this.fn(ctx);
            let isTimeout2 = false;
            if (this.awaitChange) {
                const oldValue = ctx[this.awaitChange];
                let timeout = 0;
                while (result === oldValue) {
                    if (timeout >= maxTimeout) {
                        isTimeout2 = true;
                        break;
                    }
                    await new Promise((resolve) => setTimeout(resolve, delta));
                    result = await this.fn(ctx);
                    timeout += delta;
                }
            }
            record.completed = Date.now() - startAt;
            if (isTimeout2) {
                console.log(`Action [${this.name}] await changes timed out after ${maxTimeout}ms`);
                record.completed += maxTimeout;
            }
        } else {
            record.completed = Date.now() + maxTimeout - startAt;
            console.log(`Action [${this.name}] timed out after ${maxTimeout}ms`);
        }

        ctx.latencies[this.name] = record;
        // Set the result to the context
        if (typeof this.resultField === "string") {
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            (ctx as any)[this.resultField] = result;
        }

        console.timeEnd(`Action [${this.name}]`);
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

export function generateFlattenJson(results: LatencyResult[]) {
    const flattenedResults = results.flatMap((result: LatencyResult) => {
        // Clean ISO timestamp (remove microseconds, force 'Z')
        const dt = new Date(result.timestamp);
        const timestamp = `${dt.toISOString().split('.')[0]}Z`;

        return result.tests.flatMap((test) => {
            const runner = test.runner;
            const network = test.network ?? "testnet";
            const provider = test.providerKey;
            const metrics = test.metrics;

            return Object.entries(metrics).map(([metricName, values]) => ({
                timestamp,
                runner,
                provider,
                network,
                metric: metricName,
                latency: values.completed - values.waiting,
                details: values,
            }));
        });
    });
    return flattenedResults;
}
