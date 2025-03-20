import * as fcl from "@onflow/fcl";
import type { ArgsFn } from "@onflow/fcl-core/types/exec/args";
import type { authz as AuthzObject } from "@onflow/fcl";
import type { CompositeSignature, Account } from "@onflow/typedefs";
import type { FlowConnector } from "./flow.connector";
import { signWithKey } from "./pure.signer";
import type { IFlowScriptExecutor, IFlowSigner } from "../types";

/**
 * Flow wallet Provider
 */
export class FlowWallet implements IFlowSigner, IFlowScriptExecutor {
	private readonly privateKeyHex?: string;
	private readonly address: string;
	// Runtime data
	private account: Account | null = null;
	public maxKeyIndex = 0;

	constructor(private readonly connector: FlowConnector) {
		const signerAddr = process.env.FLOW_ADDRESS;
		if (!signerAddr) {
			throw new Error("No signer info");
		}
		this.address = signerAddr;

		const privateKey = process.env.FLOW_PRIVATE_KEY;
		if (!privateKey) {
			console.warn(
				`The default Flow wallet ${this.address} has no private key`,
			);
		} else {
			this.privateKeyHex = privateKey.startsWith("0x")
				? privateKey.slice(2)
				: privateKey;
		}
	}

	/**
	 * Get the network type
	 */
	get network() {
		return this.connector.network;
	}

	/**
	 * Send a transaction
	 * @param code Cadence code
	 * @param args Cadence arguments
	 */
	async sendTransaction(
		code: string,
		args: ArgsFn,
		authz?: typeof AuthzObject,
	) {
		return await this.connector.sendTransaction(
			code,
			args,
			authz ?? (await this.buildAuthorization()),
		);
	}

	/**
	 * Execute a script
	 * @param code Cadence code
	 * @param args Cadence arguments
	 */
	async executeScript<T>(
		code: string,
		args: ArgsFn,
		defaultValue: T,
	): Promise<T> {
		return await this.connector.executeScript(code, args, defaultValue);
	}

	/**
	 * Build authorization
	 */
	buildAuthorization(accountIndex = 0, privateKey = this.privateKeyHex) {
		if (this.account) {
			if (accountIndex > this.maxKeyIndex) {
				throw new Error("Invalid account index");
			}
		}
		const address = this.address;
		if (!privateKey) {
			throw new Error("No private key provided");
		}
		return async (account: Account) => {
			return {
				...account,
				addr: fcl.sansPrefix(address),
				keyId: Number(accountIndex),
				signingFunction: (
					signable: fcl.SigningData,
				): Promise<CompositeSignature> => {
					return Promise.resolve({
						f_type: "CompositeSignature",
						f_vsn: "1.0.0",
						addr: fcl.withPrefix(address),
						keyId: Number(accountIndex),
						signature: this.signMessage(signable.message, privateKey),
					});
				},
			};
		};
	}

	/**
	 * Sign a message
	 * @param message Message to sign
	 */
	signMessage(message: string, privateKey = this.privateKeyHex) {
		if (!privateKey) {
			throw new Error("No private key provided");
		}
		return signWithKey(privateKey, message);
	}
}
