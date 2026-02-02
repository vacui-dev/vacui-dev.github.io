// Copyright (c) 2025 vacui.dev, all rights reserved

export interface Breadcrumb {
    category: 'TEST' | 'ENGINE' | 'MATH' | 'WORKER' | 'SYSTEM';
    file: string;
    relevantFunctions: string[];
    description: string;
}

export interface BenchmarkTestResult {
    id: string;
    name: string;
    status: 'IDLE' | 'RUNNING' | 'PASS' | 'FAIL' | 'WARNING';
    logs: string;
    breadcrumbs: Breadcrumb[];
    duration?: number;
}

export interface TestSuite {
    id: string;
    name: string;
    tests: {
        id: string;
        name: string;
        run: () => Promise<BenchmarkTestResult>;
    }[];
}