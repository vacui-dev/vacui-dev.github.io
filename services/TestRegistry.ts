// Copyright (c) 2025 vacui.dev, all rights reserved

import { TestSuite } from "../types/testing";

class TestRegistryService {
    private suites: TestSuite[] = [];

    public registerSuite(suite: TestSuite) {
        // Prevent duplicate registration
        if (!this.suites.find(s => s.id === suite.id)) {
            this.suites.push(suite);
        }
    }

    public getSuites() {
        return this.suites;
    }
}

export const testRegistry = new TestRegistryService();