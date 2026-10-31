import { FeedbackItem, FeedbackStoreInterface, FeedbackStoreOptions, FeedbackType } from "./types";
export declare class FeedbackStore implements FeedbackStoreInterface {
    private storagePath;
    private initialSeed;
    private topicDefs;
    constructor(options?: FeedbackStoreOptions);
    inferTopic(message: string, explicitTopic?: string): string;
    private ensureStoreFile;
    readAll(): Promise<FeedbackItem[]>;
    writeAll(items: FeedbackItem[]): Promise<void>;
    add(input: {
        type: FeedbackType;
        topic?: string;
        message: string;
        authorName?: string;
        authorEmail?: string;
        pageContext?: string;
    }): Promise<FeedbackItem>;
    update(id: string, patch: Partial<Omit<FeedbackItem, "id" | "createdAt">>): Promise<FeedbackItem | null>;
    delete(id: string): Promise<boolean>;
}
export declare function createFeedbackStore(options?: FeedbackStoreOptions): FeedbackStoreInterface;
//# sourceMappingURL=store.d.ts.map