import * as fcl from "@onflow/fcl";
import type { ArgsFn } from "@onflow/fcl-core/types/exec/args";
import type { Account, TransactionStatus } from "@onflow/typedefs";
import type { Authz, IFlowScriptExecutor } from "../types";

export type NetworkType = "mainnet" | "testnet" | "emulator";

let isGloballyInited = false;
let globallyPromise: Promise<void> | null = null;

export class FlowConnector implements IFlowScriptExecutor {
    /**
     * Initialize the Flow SDK
     */
    constructor(
        private readonly flowJSON: object,
        public readonly network: NetworkType = "mainnet",
        public readonly useSoftFinality: boolean = false,
        private readonly defaultRpcEndpoint: string | undefined = undefined,
    ) { }

    /**
     * Get the RPC endpoint
     */
    get rpcEndpoint() {
        switch (this.network) {
            case "mainnet":
                return this.defaultRpcEndpoint ?? "https://mainnet.onflow.org";
            case "testnet":
                return this.defaultRpcEndpoint ?? "https://testnet.onflow.org";
            case "emulator":
                return "http://localhost:8888";
            default:
                throw new Error(`Network type ${this.network} is not supported`);
        }
    }

    /**
     * Initialize the Flow SDK
     */
    async onModuleInit() {
        if (isGloballyInited) return;

        const cfg = fcl.config();
        // Required
        cfg.put("flow.network", this.network);
        // Set soft finality
        if (this.useSoftFinality) {
            cfg.put("fcl.experimental.softFinality", true)
        }
        // Set the maximum of gas limit
        cfg.put("fcl.limit", 9999);
        // Set the RPC endpoint
        cfg.put("accessNode.api", this.rpcEndpoint);
        // Load Flow JSON
        await cfg.load({ flowJSON: this.flowJSON as Record<string, unknown> });

        isGloballyInited = true;
    }

    /**
     * Ensure the Flow SDK is initialized
     */
    private async ensureInited() {
        if (isGloballyInited) return;
        if (!globallyPromise) {
            globallyPromise = this.onModuleInit();
        }
        return await globallyPromise;
    }

    /**
     * Get account information
     */
    async getAccount(addr: string): Promise<Account> {
        await this.ensureInited();
        return await fcl.send([fcl.getAccount(addr)]).then(fcl.decode);
    }

    /**
     * General method of sending transaction
     */
    async sendTransaction(code: string, args: ArgsFn, mainAuthz: Authz) {
        await this.ensureInited();
        if (typeof mainAuthz !== "undefined") {
            return await fcl.mutate({
                cadence: code,
                args: args,
                proposer: mainAuthz,
                payer: mainAuthz,
                authorizations: [mainAuthz],
            });
        }
        return await fcl.mutate({
            cadence: code,
            args: args,
        });
    }

    /**
     * Get chain id
     */
    async getChainId() {
        await this.ensureInited();
        return await fcl.getChainId();
    }

    /**
     * Get transaction status
     */
    async getTransactionStatus(transactionId: string): Promise<TransactionStatus> {
        await this.ensureInited();
        return await fcl.tx(transactionId).onceExecuted();
    }

    async onceTransactionSealed(transactionId: string): Promise<TransactionStatus> {
        await this.ensureInited();
        return fcl.tx(transactionId).onceSealed();
    }

    async onceTransactionExecuted(transactionId: string): Promise<TransactionStatus> {
        await this.ensureInited();
        return fcl.tx(transactionId).onceExecuted();
    }

    /**
     * Get block object
     * @param blockId
     */
    async getBlockHeaderObject(blockId: string) {
        await this.ensureInited();
        return await fcl.send([fcl.getBlockHeader(), fcl.atBlockId(blockId)]).then(fcl.decode);
    }

    /**
     * Send script
     */
    async executeScript<T>(code: string, args: ArgsFn, defaultValue: T): Promise<T> {
        await this.ensureInited();
        try {
            const queryResult = await fcl.query({
                cadence: code,
                args,
            });
            return (queryResult as T) ?? defaultValue;
        } catch (e) {
            console.error(e);
            return defaultValue;
        }
    }
}

export default FlowConnector;
