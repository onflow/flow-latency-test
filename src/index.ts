import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const providerKeys = [undefined, "ALCHEMY_URL"];
const runners = ["transfer-erc20-test", "transfer-test"];

interface LatencyData {
	providerKey: string;
	runner: string;
	outputs: string[];
}

interface ParsedLatency {
	order: number;
	name: string;
	waiting: number;
	completed: number;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runScript(
	scriptPath: string,
	provider?: string,
): Promise<string[]> {
	console.log(
		`\n\n---\nRunning script: ${scriptPath} @${provider || "default"}`,
	);

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

	for (const providerKey of providerKeys) {
		// Set environment variables based on provider key
		if (providerKey) {
			process.env.EVM_MAINNET_RPC_ENDPOINT_URL =
				process.env[`MAINNET_${providerKey}`];
			process.env.EVM_TESTNET_RPC_ENDPOINT_URL =
				process.env[`TESTNET_${providerKey}`];
		}

		for (const runner of runners) {
			const scriptPath = path.join(__dirname, `${runner}.ts`);
			try {
				const outputs = await runScript(scriptPath, providerKey);
				await delay(2000); // 2 second delay between executions

				// Find the latency section
				const latencyIndex = outputs.findIndex((line) =>
					line.includes("---- Latencies ----"),
				);
				if (latencyIndex !== -1) {
					const latencyOutputs = outputs.slice(latencyIndex + 1);
					results.push({
						providerKey: providerKey || "default",
						runner,
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
		console.log("Parsed Outputs:", parsedOutputs);
		return {
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
		"providerKey",
		"runner",
		...allNames.flatMap((name) => [`${name}(waiting)`, `${name}(completed)`]),
	];
	csvRows.push(header.join(","));

	// Data rows
	for (const result of parsedResults) {
		const row = [
			result.providerKey,
			result.runner,
			...allNames.flatMap((name) => {
				const latency = result.latencies.find((l) => l.name === name);
				return latency
					? [String(latency.waiting), String(latency.completed)]
					: ["", ""];
			}),
		];
		csvRows.push(row.join(","));
	}

	// Create outputs directory if it doesn't exist
	const outputsDir = path.join(process.cwd(), "outputs");
	if (!fs.existsSync(outputsDir)) {
		fs.mkdirSync(outputsDir, { recursive: true });
	}

	// Generate timestamp for unique filename
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	const outputPath = path.join(outputsDir, `latency_results_${timestamp}.csv`);

	// Write to file
	fs.writeFileSync(outputPath, csvRows.join("\n"));
	console.log(`Results have been saved to ${outputPath}`);
}

main().catch(console.error);
