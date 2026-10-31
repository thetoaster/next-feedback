export type FeedbackType = "idea" | "feedback" | "bug";
export type FeedbackStatus = "open" | "in_progress" | "implemented" | "archived";
export interface FeedbackItem {
    id: string;
    createdAt: string;
    type: FeedbackType;
    topic: string;
    message: string;
    authorName?: string;
    authorEmail?: string;
    status: FeedbackStatus;
    pageContext?: string;
    additionalContext?: string;
    implementationLog?: string;
    implementedAt?: string;
    agentUsed?: string;
}
export interface TopicDefinition {
    name: string;
    keywords?: string[];
}
export type TopicInput = string | TopicDefinition;
export interface FeedbackStoreOptions {
    /** File path where JSON feedback is saved. Defaults to process.cwd()/data/feedback.json */
    storagePath?: string;
    /** Optional initial seed items */
    initialSeed?: FeedbackItem[];
    /** Allowed/suggested topics with optional keyword auto-detection */
    topics?: TopicInput[];
    /** Name of the application */
    appName?: string;
}
export interface FeedbackRouteOptions extends FeedbackStoreOptions {
    /** Optional custom store instance */
    store?: FeedbackStoreInterface;
}
export interface ImplementRouteOptions {
    /** Name of the application (used in the prompt) */
    appName?: string;
    /** File path where JSON feedback is saved. */
    storagePath?: string;
    /** Optional custom store instance */
    store?: FeedbackStoreInterface;
    /** Path to Claude Code CLI binary (defaults to ~/.local/bin/claude or claude) */
    claudeBin?: string;
    /** Path to Antigravity CLI binary (defaults to ~/.local/bin/agy or agy) */
    agyBin?: string;
    /** Custom prompt builder for CLI agents */
    buildPrompt?: (item: FeedbackItem, additionalContext?: string, appName?: string) => string;
}
export interface FeedbackStoreInterface {
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
    inferTopic(message: string, explicitTopic?: string): string;
}
export interface FeedbackWidgetProps {
    /** Endpoint for feedback CRUD (defaults to auto-detecting /api/feedback or <basePath>/api/feedback) */
    apiPath?: string;
    /** Link target for admin dashboard (defaults to /admin) */
    adminHref?: string;
    /** Optional topic choices displayed in dropdown */
    topics?: Array<string | {
        label: string;
        value: string;
    }>;
    /** Custom heading in modal */
    title?: string;
    /** Custom subtitle in modal */
    subtitle?: string;
    /** Custom trigger button label */
    triggerLabel?: string;
    /** Position on screen (defaults to bottom-right) */
    position?: "bottom-right" | "bottom-left";
    /** Optional class name */
    className?: string;
}
export interface FeedbackAdminProps {
    /** Endpoint for feedback CRUD (defaults to /api/feedback) */
    apiPath?: string;
    /** Endpoint for implement agent execution (defaults to /api/feedback/implement) */
    implementApiPath?: string;
    /** Link back to main app (defaults to /) */
    backHref?: string;
    /** Back button label */
    backLabel?: string;
    /** Admin page title */
    title?: string;
    /** Admin page subtitle */
    subtitle?: string;
}
//# sourceMappingURL=types.d.ts.map