// Copyright (c) 2025 vacui.dev, all rights reserved

import { mockNetwork } from "./MockNetwork";

// --- TYPES ---

export type TokenType = 
    | 'ILI' | 'N' | 'N_GT' | 'N_LT' | 'VRB' | 'VRP' | 'VRF' | 'VRI' | 'VRG' | 'VRC'
    | 'HPO_HPR' | 'HPR_HPO' | 'MER_HOL' | 'HOL_MER' | 'BI'
    | 'DAT' | 'UTF-8' | 'URL'
    | 'DT0' | 'DT1' | 'DT2' | 'DT3'
    | 'LIT' | 'IMP' | 'ASS' | 'ALU' | 'IRO' | 'PUN'
    | 'TEXT'; // Fallback for plain text

export interface WordlessToken {
    raw: string;
    type: string; // Raw type string from regex
    definitionId?: string;
    entityId?: string;
    subjectRef?: string;
    objectRef?: string;
    data?: string;
    comment?: string;
}

export interface ConceptEntry {
    id: string;
    label: string;
    pos?: string; // Part of speech
    definition: string;
    wordlessString?: string; // The concept represented in wordless tokens
    examples?: { text: string, wordless: string }[];
}

export interface DictionaryBucket {
    id: number;
    concepts: Record<string, ConceptEntry>;
}

// --- PARSER LOGIC ---

const TOKEN_REGEX = /⟨┤(.*?)├⟩/g;
const INNER_REGEX = /^([^:§╪†‡⹋]+)(?:§([^╪†‡⹋:]+))?(?:╪([^†‡⹋:]+))?(?:†([^‡⹋:]+))?(?:‡([^⹋:]+))?(?:⹋([^:]+))?(?::(.+))?$/;

class WordlessDictionaryService {
    
    private cache: Map<string, ConceptEntry> = new Map();
    private loadedBuckets: Set<number> = new Set();
    private pendingRequests: Map<number, Promise<void>> = new Map();
    
    private tokenDefinitions: Map<string, string> = new Map();

    // Sharding Configuration
    private readonly BUCKET_SIZE = 1000;

    constructor() {
        this.bootstrapDefinitions();
        // Pre-seed some common concepts into cache
        this.bootstrapStaticData();
    }

    // --- CORE METHODS ---

    public parse(input: string): (WordlessToken | string)[] {
        const result: (WordlessToken | string)[] = [];
        let lastIndex = 0;
        let match;

        while ((match = TOKEN_REGEX.exec(input)) !== null) {
            if (match.index > lastIndex) {
                result.push(input.substring(lastIndex, match.index));
            }

            const inner = match[1];
            const parsed = this.parseTokenInner(inner);
            if (parsed) {
                parsed.raw = match[0];
                result.push(parsed);
            } else {
                result.push(match[0]); 
            }

            lastIndex = TOKEN_REGEX.lastIndex;
        }

        if (lastIndex < input.length) {
            result.push(input.substring(lastIndex));
        }

        return result;
    }

    private parseTokenInner(inner: string): WordlessToken | null {
        const match = inner.match(INNER_REGEX);
        if (!match) return null;

        return {
            raw: `⟨┤${inner}├⟩`,
            type: match[1],
            definitionId: match[2],
            entityId: match[3],
            subjectRef: match[4],
            objectRef: match[5],
            comment: match[7]
        };
    }

    /**
     * Lookup via Fuzzy Search
     * Note: Only searches currently loaded/cached concepts.
     * For a full dictionary search, we would need a separate Search Index file.
     */
    public lookup(query: string): ConceptEntry[] {
        const q = query.toLowerCase().trim();
        if (!q) return Array.from(this.cache.values()).slice(0, 10);

        return Array.from(this.cache.values()).filter(c => 
            c.label.toLowerCase().includes(q) || 
            c.id.toLowerCase().includes(q) ||
            c.definition.toLowerCase().includes(q)
        );
    }

    /**
     * Async Retrieval of a Concept.
     * 1. Checks Cache.
     * 2. If missing, identifies Bucket ID.
     * 3. Fetches Bucket (c_{id}.json).
     * 4. Populates Cache.
     * 5. Returns Concept or Auto-Generated Stub.
     */
    public async getConcept(id: string): Promise<ConceptEntry | undefined> {
        // Normalize ID
        const cleanId = id.replace('ILI§', '');
        const fullId = `ILI§${cleanId}`;

        // 1. Check Cache
        if (this.cache.has(cleanId)) return this.cache.get(cleanId);
        if (this.cache.has(fullId)) return this.cache.get(fullId);

        // 2. Calculate Bucket
        const iliNumber = parseInt(cleanId, 10);
        if (isNaN(iliNumber)) {
            // Non-numeric ID, return stub immediately
            return this.generateStub(fullId, cleanId);
        }

        const bucketId = Math.floor(iliNumber / this.BUCKET_SIZE);

        // 3. Load Bucket (Deduplicated)
        await this.loadBucket(bucketId);

        // 4. Return if found
        let entry = this.cache.get(fullId);
        
        // 5. Stub Fallback
        // If the bucket loaded but the concept wasn't there (because this is a mock system),
        // we generate a stub so the user doesn't hit a dead end.
        if (!entry) {
            entry = this.generateStub(fullId, cleanId);
            this.cache.set(fullId, entry);
        }

        return entry;
    }

    private generateStub(fullId: string, cleanId: string): ConceptEntry {
        return {
            id: fullId,
            label: `Concept ${cleanId}`,
            pos: 'noun',
            definition: `[System Generated Stub] No detailed definition available for ID ${cleanId} in the local shard. This concept exists in the Interlingual Index but has not been fully hydrated in this demo.`,
            wordlessString: `⟨┤ILI§${cleanId}:concept_${cleanId}├⟩ ⟨┤HPO_HPR├⟩ ⟨┤ILI§35545:entity├⟩`
        };
    }

    // Sync version for UI rendering where async isn't possible immediately
    // Returns undefined if not loaded
    public getConceptSync(id: string): ConceptEntry | undefined {
        const cleanId = id.replace('ILI§', '');
        return this.cache.get(`ILI§${cleanId}`) || this.cache.get(cleanId);
    }

    private async loadBucket(bucketId: number): Promise<void> {
        if (this.loadedBuckets.has(bucketId)) return;
        if (this.pendingRequests.has(bucketId)) return this.pendingRequests.get(bucketId);

        const request = (async () => {
            try {
                const url = `/dictionary/c_${bucketId}.json`;
                console.log(`[Dictionary] Fetching Bucket ${bucketId} (${url})...`);
                
                const response = await mockNetwork.fetch(url);
                const data = await response.json() as DictionaryBucket;

                if (data && data.concepts) {
                    Object.values(data.concepts).forEach(c => {
                        this.cache.set(c.id, c);
                    });
                }
                
                this.loadedBuckets.add(bucketId);
            } catch (e) {
                console.warn(`[Dictionary] Failed to load bucket ${bucketId} (Mocking Fallback)`, e);
            } finally {
                this.pendingRequests.delete(bucketId);
            }
        })();

        this.pendingRequests.set(bucketId, request);
        return request;
    }

    public getTokenDefinition(type: string): string {
        return this.tokenDefinitions.get(type) || "Unknown Token";
    }

    // --- DATA BOOTSTRAP ---

    private bootstrapDefinitions() {
        this.tokenDefinitions.set('HPO_HPR', 'Hyponym → Hypernym (is a kind of)');
        this.tokenDefinitions.set('HPR_HPO', 'Hypernym → Hyponym (contains kind)');
        this.tokenDefinitions.set('MER_HOL', 'Meronym ⊂ Holonym (is part of)');
        this.tokenDefinitions.set('HOL_MER', 'Holonym ⊃ Meronym (contains part)');
        this.tokenDefinitions.set('BI', 'Bidirectional Relation (↔)');
        this.tokenDefinitions.set('VRB', 'Verb (Base Form)');
        this.tokenDefinitions.set('VRP', 'Verb (Past Tense)');
        this.tokenDefinitions.set('VRF', 'Verb (Future Tense)');
        this.tokenDefinitions.set('DT0', 'Reference (it/that)');
        this.tokenDefinitions.set('DT1', 'First Person (I/me)');
        this.tokenDefinitions.set('DT2', 'Second Person (you)');
        this.tokenDefinitions.set('DT3', 'Third Person (he/she/they)');
        this.tokenDefinitions.set('LIT', 'Literal Interpretation');
        this.tokenDefinitions.set('IMP', 'Implied Meaning');
        this.tokenDefinitions.set('PUN', 'Pun / Wordplay');
    }

    private bootstrapStaticData() {
        // Seed initial cache with common examples so the app isn't empty
        const add = (entry: ConceptEntry) => this.cache.set(entry.id, entry);

        // --- GROUND TRUTH DATA: ORANGE JUICE CLUSTER ---

        add({
            id: 'ILI§78945', 
            label: 'orange juice', 
            pos: 'n',
            definition: 'The liquid that results from extracting the juice from oranges, whether the juice is captured at the point of production (freshly squeezed) or packaged for retail (bottled).',
            wordlessString: [
                'Core Identity:',
                '⟨┤ILI§78945:orange juice├⟩',
                ' ',
                'Taxonomy (Is A):',
                '⟨┤HPO_HPR├⟩ ⟨┤ILI§78938:fruit juice├⟩', // Hypernym
                ' ',
                'Variations (Contains Kind):',
                '⟨┤HPR_HPO├⟩ ⟨┤ILI§78946:frozen orange juice├⟩', // Hyponym
                ' ',
                'Composition:',
                '⟨┤ILI§78945:OJ├⟩ ⊂🧪 ⟨┤ILI§77762:orange(fruit)├⟩'
            ].join('\n')
        });

        add({
            id: 'ILI§78938',
            label: 'fruit juice',
            pos: 'n',
            definition: 'Drink produced by squeezing or crushing fruit.',
            wordlessString: '⟨┤ILI§78938:fruit juice├⟩ ⟨┤HPO_HPR├⟩ ⟨┤ILI§78937:beverage├⟩'
        });

        add({
            id: 'ILI§77762',
            label: 'orange (fruit)',
            pos: 'n',
            definition: 'Round yellow to orange fruit of any of several citrus trees.',
            wordlessString: '⟨┤ILI§77762:orange├⟩ ⟨┤HPO_HPR├⟩ ⟨┤ILI§77761:citrus├⟩'
        });

        add({
            id: 'ILI§78946',
            label: 'frozen orange juice',
            pos: 'n',
            definition: 'Orange juice that has been concentrated and frozen.',
            wordlessString: '⟨┤ILI§78946:frozen OJ├⟩ ⟨┤HPO_HPR├⟩ ⟨┤ILI§78945:orange juice├⟩'
        });

        add({
            id: 'ILI§78959',
            label: 'orangeade',
            pos: 'n',
            definition: 'A sweetened beverage of diluted orange juice.',
            wordlessString: '⟨┤ILI§78959:orangeade├⟩ ≠ ⟨┤ILI§78945:orange juice├⟩'
        });
        
        // Extra links for completeness of the graph
        add({
            id: 'ILI§78937',
            label: 'beverage',
            pos: 'n',
            definition: 'A liquid to consume, usually excluding water; a drink.',
            wordlessString: '⟨┤ILI§78937:beverage├⟩ ⟨┤HPO_HPR├⟩ ⟨┤ILI§78738:food/nutrient├⟩'
        });

        add({
            id: 'ILI§77761',
            label: 'citrus',
            pos: 'n',
            definition: 'Any of numerous tropical and subtropical shrubs and trees of the genus Citrus.',
            wordlessString: '⟨┤ILI§77761:citrus├⟩ ⟨┤HPO_HPR├⟩ ⟨┤ILI§77555:tree├⟩'
        });

        // --- STANDARD EXAMPLES ---

        add({
            id: 'ILI§115475', label: 'ice', pos: 'n',
            definition: 'Water frozen in the solid state.',
            wordlessString: '⟨┤ILI§115475:n:ice├⟩=⟨┤ILI§5915:a:frozen├⟩⊃⟨┤ILI§67611:attribute├⟩⟨┤ILI§115069:H2O├⟩'
        });

        add({
            id: 'ILI§48286', label: 'American bison', pos: 'n',
            definition: 'Large North American bovine.',
            wordlessString: '⟨┤ILI§48286:bison├⟩→⟨┤ILI§48227:n:bovid├⟩'
        });

        add({
            id: 'ILI§84548', label: 'Buffalo (City)', pos: 'n',
            definition: 'A city in western New York State.',
            wordlessString: '⟨┤ILI§84548:n:Buffalo(city)├⟩⊂⟨┤WITHIN├⟩⟨┤ILI§84251:n:New York State├⟩'
        });

        add({
            id: 'ILI§30633', label: 'overawe', pos: 'v',
            definition: 'Subdue, restrain, or overcome by affecting with a feeling of awe.',
            wordlessString: '⟨┤VRB├⟩⟨┤ILI§30633:v:overawe├⟩'
        });

        add({
            id: 'ILI§69544', label: 'word', pos: 'n',
            definition: 'A unit of language, consisting of one or more spoken sounds or their written representation.',
            wordlessString: '⟨┤ILI§69544:n:word├⟩⊂🍕⟨┤ILI§69537:n:sentence├⟩'
        });

        add({
            id: 'ILI§91182', label: 'man', pos: 'n',
            definition: 'An adult male human.',
            wordlessString: '⟨┤ILI§91182:n:man├⟩→⟨┤ILI§48657:n:human├⟩⨭⟨┤ILI§69737:n:masculine├⟩'
        });
    }
}

export const wordlessDictionary = new WordlessDictionaryService();