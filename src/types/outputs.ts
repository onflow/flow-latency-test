
export interface LatencyData {
    network: string;
    providerKey: string;
    runner: string;
    outputs: string[];
}

export interface ParsedLatency {
    order: number;
    name: string;
    waiting: number;
    completed: number;
}

export interface LatencyResult {
    timestamp: string;
    tests: Array<{
        network: string;
        runner: string;
        providerKey: string;
        metrics: Record<string, { waiting: number; completed: number }>;
    }>;
}

export interface ResultJson {
    timestamp: string;
    results: Array<LatencyResult>;
}