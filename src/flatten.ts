import fs from "node:fs";
import path from "node:path";
import { generateFlattenJson } from "./utils";
import type { ResultJson } from "./utils/types";

async function main() {
    // Read latency_results.json
    const outputsDir = path.join(process.cwd(), "outputs");
    const latencyResultsPath = path.join(outputsDir, "latency_results.json");
    const flattenedOutputPath = path.join(outputsDir, "flattened_output.json");

    try {
        // Read and parse JSON file
        const rawData = fs.readFileSync(latencyResultsPath, 'utf-8');
        const data: ResultJson = JSON.parse(rawData);

        // Flatten the results
        const flattenedResults = generateFlattenJson(data.results);

        // Write flattened results to file
        fs.writeFileSync(flattenedOutputPath, JSON.stringify(flattenedResults, null, 4));
        console.log(`Flattened results have been saved to ${flattenedOutputPath}`);
    } catch (error) {
        console.error("Error processing files:", error);
        process.exit(1);
    }
}

main().catch(console.error);
