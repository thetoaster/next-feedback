import fs from "fs/promises";
import path from "path";
const DEFAULT_TOPIC_DEFS = [
    {
        name: "Ideen & Features",
        keywords: ["idee", "feature", "vorschlag", "wäre", "könnte", "wunsch", "hinzufügen"],
    },
    {
        name: "Fehler & Bugs",
        keywords: ["fehler", "bug", "crash", "problem", "falsch", "kaputt", "error", "fail"],
    },
    {
        name: "UI, Layout & Design",
        keywords: ["ui", "design", "layout", "button", "farbe", "schrift", "chart", "grafik", "mobile", "ansicht", "responsive"],
    },
    {
        name: "Performance & Ladezeit",
        keywords: ["performance", "langsam", "slow", "ladezeit", "hängt", "speed"],
    },
    {
        name: "Allgemeines & Sonstiges",
        keywords: [],
    },
];
export class FeedbackStore {
    constructor(options) {
        this.storagePath =
            options?.storagePath || path.join(process.cwd(), "data", "feedback.json");
        this.initialSeed = options?.initialSeed || [];
        if (options?.topics && options.topics.length > 0) {
            this.topicDefs = options.topics.map((t) => {
                if (typeof t === "string") {
                    return {
                        name: t,
                        keywords: t
                            .toLowerCase()
                            .split(/[\s,&/-]+/)
                            .filter((k) => k.length > 2),
                    };
                }
                return t;
            });
            if (!this.topicDefs.some((d) => d.name.toLowerCase().includes("allgemein"))) {
                this.topicDefs.push({ name: "Allgemeines & Sonstiges", keywords: [] });
            }
        }
        else {
            this.topicDefs = DEFAULT_TOPIC_DEFS;
        }
    }
    inferTopic(message, explicitTopic) {
        if (explicitTopic && explicitTopic !== "auto" && explicitTopic.trim().length > 0) {
            return explicitTopic.trim();
        }
        const lower = message.toLowerCase();
        for (const def of this.topicDefs) {
            if (def.keywords && def.keywords.some((k) => lower.includes(k.toLowerCase()))) {
                return def.name;
            }
        }
        const defaultTopic = this.topicDefs.find((d) => d.name.toLowerCase().includes("allgemein"))?.name ||
            this.topicDefs[this.topicDefs.length - 1]?.name ||
            "Allgemeines & Sonstiges";
        return defaultTopic;
    }
    async ensureStoreFile() {
        const dir = path.dirname(this.storagePath);
        await fs.mkdir(dir, { recursive: true });
        try {
            await fs.access(this.storagePath);
        }
        catch {
            await fs.writeFile(this.storagePath, JSON.stringify(this.initialSeed, null, 2), "utf-8");
        }
    }
    async readAll() {
        await this.ensureStoreFile();
        try {
            const raw = await fs.readFile(this.storagePath, "utf-8");
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            }
            return [];
        }
        catch {
            return [];
        }
    }
    async writeAll(items) {
        await this.ensureStoreFile();
        await fs.writeFile(this.storagePath, JSON.stringify(items, null, 2), "utf-8");
    }
    async add(input) {
        const items = await this.readAll();
        const newItem = {
            id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            createdAt: new Date().toISOString(),
            type: input.type || "feedback",
            topic: this.inferTopic(input.message, input.topic),
            message: input.message.trim(),
            authorName: input.authorName?.trim() || undefined,
            authorEmail: input.authorEmail?.trim() || undefined,
            status: "open",
            pageContext: input.pageContext?.trim() || undefined,
        };
        items.unshift(newItem);
        await this.writeAll(items);
        return newItem;
    }
    async update(id, patch) {
        const items = await this.readAll();
        const idx = items.findIndex((item) => item.id === id);
        if (idx === -1)
            return null;
        const updated = {
            ...items[idx],
            ...patch,
        };
        items[idx] = updated;
        await this.writeAll(items);
        return updated;
    }
    async delete(id) {
        const items = await this.readAll();
        const filtered = items.filter((item) => item.id !== id);
        if (filtered.length === items.length)
            return false;
        await this.writeAll(filtered);
        return true;
    }
}
export function createFeedbackStore(options) {
    return new FeedbackStore(options);
}
//# sourceMappingURL=store.js.map