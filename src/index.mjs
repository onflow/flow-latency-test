import dotenv from "dotenv";
import { createWalletClient, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { flowMainnet, flowTestnet } from "viem/chains";
import { waitForTransactionReceipt, createConfig, http } from "@wagmi/core";

// Use dotenv to load environment variables from a .env file
dotenv.config();

// Load EVM Private Key from environment variable
const privateKey = process.env.PRIVATE_KEY;
const networkName = process.env.NETWORK || "testnet";
const chainNetwork = networkName === "mainnet" ? flowMainnet : flowTestnet;

const config = createConfig({
  chains: [chainNetwork],
  connectors: [],
  transports: {
    [chainNetwork.id]: http(),
  },
});

function logTimeWrapper(fn) {
  return async (...args) => {
    console.time(`Function Call [${fn.name}]`);
    const result = await fn(...args);
    console.timeEnd(`Function Call [${fn.name}]`);
    return result;
  };
}

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

  // Send a transaction of transfer 0 FLOW to self
  const callSentTransaction = logTimeWrapper(async function sendTransaction() {
    hash = await client.sendTransaction({
      to: account.address, // Send to self
      value: parseEther("0"), // 0 FLOW
      data: "0x", // Empty data
    });
  });
  await callSentTransaction();

  console.log(`--- Transaction sent with Hash: ${hash}`);

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
  return receipt;
}

// Main wrapper function
const wrappedSendTest = logTimeWrapper(sentTestTransaction);

// Run the main function
try {
  console.log("---- Transaction Receipt: ", await wrappedSendTest());
} catch (error) {
  console.error("Error sending transaction:", error);
}
