import { privateKeyToAccount } from "viem/accounts";
import type { CadenceBlockchainContext, EVMBlockchainContext } from "../types/context";
import { networkName } from "./config";
import { FlowConnector, FlowWallet, type NetworkType } from "./flow";

import flowJSON from "../../flow.json" assert { type: "json" };

export async function buildEVMBlockchainContext(privKey: string) {
    // Create a private key from the environment variable
    const key = privKey.startsWith("0x") ? privKey.substring(2) : privKey;

    const account = privateKeyToAccount(`0x${key}`);
    console.log(`[Address: ${account.address} @${networkName}]`);

    return { account, latencies: {} } as EVMBlockchainContext;
}

export async function buildCadenceBlockchainContext(useSoftFinality = false) {
    const connecter = new FlowConnector(flowJSON, networkName as NetworkType, useSoftFinality);
    const wallet = new FlowWallet(connecter);

    return { wallet, latencies: {} } as CadenceBlockchainContext;
}
