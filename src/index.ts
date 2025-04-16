import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { generateFlattenJson } from "./utils";
import type { LatencyData, LatencyResult, ParsedLatency } from "./utils/types";

const runners = [
    {
        providerKey: undefined,
        tasks: [
            "transfer-test",
            "transfer-erc20-test",
            "transfer-cadence-soft-finality-test",
            "transfer-cadence-test",
        ],
        network: "testnet",
    },
    {
        providerKey: undefined,
        tasks: ["transfer-test", "transfer-cadence-soft-finality-test"],
        network: "mainnet",
    },
    {
        providerKey: "ALCHEMY_URL",
        tasks: ["transfer-test", "transfer-erc20-test"],
        network: "testnet",
    },
    {
        providerKey: "ALCHEMY_URL",
        tasks: ["transfer-test"],
        network: "mainnet",
    },
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runScript(scriptPath: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const outputs: string[] = [];
        const process = spawn("bun", [scriptPath], {
            stdio: ["inherit", "pipe", "inherit"],
        });

        process.stdout.on("data", (data) => {
            const output = data.toString().trim();
            if (output) {
                console.log(output);
                // 这里 output 需要对\n进行处理并分行 push 进 outputs
                outputs.push(...output.split("\n"));
            }
        });

        process.on("close", (code) => {
            if (code === 0) {
                resolve(outputs);
            } else {
                reject(new Error(`Process exited with code ${code}`));
            }
        });

        process.on("error", (err) => {
            reject(err);
        });
    });
}

function parseLatencyLine(line: string, index: number): ParsedLatency | null {
    const match = line.match(/- (.+): (\d+)ms\(waiting\) - (\d+)ms\(completed\)/);
    if (!match) return null;

    const [, name, waiting, completed] = match;
    if (!name || !waiting || !completed) return null;

    return {
        order: index,
        name,
        waiting: Number.parseInt(waiting, 10),
        completed: Number.parseInt(completed, 10),
    };
}

async function main() {
    const results: LatencyData[] = [];

    for (const runner of runners) {
        // Set environment variables based on provider key
        if (runner.providerKey) {
            process.env.EVM_MAINNET_RPC_ENDPOINT_URL =
                process.env[`MAINNET_${runner.providerKey}`];
            process.env.EVM_TESTNET_RPC_ENDPOINT_URL =
                process.env[`TESTNET_${runner.providerKey}`];
        }

        if (typeof runner.network === "string") {
            process.env.NETWORK = runner.network;
        }

        for (const task of runner.tasks) {
            const scriptPath = path.join(__dirname, `${task}.ts`);
            try {
                console.log(
                    `\n\n---\n\nRunning script: ${scriptPath} @${runner.providerKey || "default"} - ${runner.network}`,
                );
                const outputs = await runScript(scriptPath);
                await delay(2000); // 2 second delay between executions

                // Find the latency section
                const latencyIndex = outputs.findIndex((line) =>
                    line.includes("---- Latencies ----"),
                );
                if (latencyIndex !== -1) {
                    const latencyOutputs = outputs.slice(latencyIndex + 1);
                    results.push({
                        network: runner.network,
                        providerKey: runner.providerKey || "default",
                        runner: task,
                        outputs: latencyOutputs,
                    });
                }
            } catch (error) {
                console.error(`Error running ${scriptPath}:`, error);
            }
        }
    }

    // Parse all latency data
    const parsedResults = results.map((result) => {
        const parsedOutputs = result.outputs
            .map(parseLatencyLine)
            .filter((output): output is ParsedLatency => output !== null);
        return {
            network: result.network,
            providerKey: result.providerKey,
            runner: result.runner,
            latencies: parsedOutputs,
        };
    });

    // Get all unique latency names in a consistent order
    const allNames = Array.from(
        new Set(
            parsedResults.flatMap((result) =>
                result.latencies.map((latency) => latency.name),
            ),
        ),
    ).sort();

    // Generate CSV
    const csvRows: string[] = [];

    // Header
    const header = [
        "network",
        "providerKey",
        "runner",
        ...allNames.flatMap((name) => [`${name}(waiting)`, `${name}(completed)`]),
    ];
    csvRows.push(header.join(","));

    // Data rows
    for (const result of parsedResults) {
        const row = [
            result.network,
            result.providerKey,
            result.runner,
            ...allNames.flatMap((name) => {
                const latency = result.latencies.find((l) => l.name === name);
                return latency ? [String(latency.waiting), String(latency.completed)] : ["", ""];
            }),
        ];
        csvRows.push(row.join(","));
    }

    // Create outputs directory if it doesn't exist
    const outputsDir = path.join(process.cwd(), "outputs");
    const csvOutputsDir = path.join(outputsDir, "csvs");
    if (!fs.existsSync(csvOutputsDir)) {
        fs.mkdirSync(csvOutputsDir, { recursive: true });
    }

    // Generate timestamp for unique filename
    const nowStr = new Date().toISOString();
    const timestamp = nowStr.replace(/[:.]/g, "-");
    const outputPath = path.join(csvOutputsDir, `latency_results_${timestamp}.csv`);

    // Write to file
    fs.writeFileSync(outputPath, csvRows.join("\n"));
    console.log(`Results have been saved to ${outputPath}`);

    // merge the data into latency_results.json
    // Load existing latency results from JSON file
    const existingResultsPath = path.join(outputsDir, "latency_results.json");
    let existingResults = require(existingResultsPath);
    if (!existingResults) {
        existingResults = { last_updated: nowStr, results: [] };
    }

    // Convert parsedResults to the format expected in latency_results.json
    const formattedResults = parsedResults.map((result) => ({
        network: result.network ?? "testnet",
        providerKey: result.providerKey,
        runner: result.runner,
        metrics: result.latencies.reduce(
            (acc, latency) => {
                acc[latency.name] = {
                    waiting: latency.waiting,
                    completed: latency.completed,
                };
                return acc;
            },
            {} as Record<string, { waiting: number; completed: number }>,
        ),
    }));

    // Add the formatted results to the existing results
    if (formattedResults.length === 0) {
        console.log("No results to merge");
        return;
    }

    existingResults.results.push({
        timestamp: nowStr,
        tests: formattedResults,
    });

    // Update the last_updated timestamp
    existingResults.last_updated = nowStr;

    // Write the updated results back to the JSON file
    fs.writeFileSync(existingResultsPath, JSON.stringify(existingResults, null, 4));
    console.log(`Results have been merged into ${existingResultsPath}`);

    // Export flattened output json file
    const flattenedOutputPath = path.join(outputsDir, 'flattened_output.json');

    // Load and process the latency results
    const flattenedResults = generateFlattenJson(existingResults.results);

    // Write flattened results to file
    fs.writeFileSync(flattenedOutputPath, JSON.stringify(flattenedResults, null, 4));
    console.log(`Flattened results have been saved to ${flattenedOutputPath}`);
}

main().catch(console.error);
