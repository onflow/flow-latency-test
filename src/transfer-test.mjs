import dotenv from "dotenv";
import { createWalletClient, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { flowMainnet, flowTestnet } from "viem/chains";
import {
  waitForTransactionReceipt,
  getBalance,
  createConfig,
  http,
} from "@wagmi/core";

import { logTimeWrapper } from "./utils/index.mjs";

// Use dotenv to load environment variables from a .env file
dotenv.config();

// Load EVM Private Key from environment variable
const privateKey = process.env.PRIVATE_KEY;
const networkName = process.env.NETWORK || "testnet";
const rpcEndpointURL = process.env.EVM_RPC_ENDPOINT_URL || undefined;
const chainNetwork = networkName === "mainnet" ? flowMainnet : flowTestnet;

const config = createConfig({
  chains: [chainNetwork],
  connectors: [],
  transports: {
    [chainNetwork.id]: http(rpcEndpointURL),
  },
});

async function sentTestTransaction() {
  // Create a private key from the environment variable
  const priv = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;

  // Create an account from the private key
  const account = privateKeyToAccount(priv);
  const client = createWalletClient({
    account,
    chain: chainNetwork,
    transport: http(),
  });

  console.log(
    `--- Account Address: ${account.address} ---- ${networkName} Network ----`
  );

  let hash;

  // Send to self if no recipient address is provided
  const recipient = process.env.RECIPIENT ?? account.address;

  // Send a transaction of transfer 0 FLOW to self
  const callSentTransaction = logTimeWrapper(async function sendTransaction() {
    hash = await client.sendTransaction({
      to: recipient,
      value: parseEther("0.1"), // 0.1 FLOW
      data: "0x", // Empty data
    });
  });
  await callSentTransaction();

  console.log(`--- Transaction sent with Hash: ${hash}`);

  const waitForGetBalance = logTimeWrapper(async function getAccountBalance() {
    // get the account balance
    const balance = await getBalance(config, { address: account.address });
    console.log("--- Account Balance:", balance.formatted);
  });
  waitForGetBalance();

  // Wait for the transaction receipt
  let receipt;
  const callWaitForTransactionReceipt = logTimeWrapper(
    async function waitForTransaction() {
      receipt = await waitForTransactionReceipt(config, {
        chainId: chainNetwork.id,
        hash,
      });
    }
  );
  await callWaitForTransactionReceipt();

  console.log("---- Transaction Receipt: status = ", receipt.status);

  await waitForGetBalance();
}

// Main wrapper function
const wrappedSendTest = logTimeWrapper(sentTestTransaction);

// Run the main function
try {
  await wrappedSendTest();
} catch (error) {
  console.error("Error sending transaction:", error);
}
