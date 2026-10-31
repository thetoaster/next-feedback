import { NextRequest, NextResponse } from "next/server";
import { FeedbackItem, FeedbackRouteOptions, ImplementRouteOptions } from "./types";
export * from "./types";
export * from "./store";
export declare function defaultBuildPrompt(item: FeedbackItem, additionalContext?: string, appName?: string): string;
export declare function createFeedbackRoute(options?: FeedbackRouteOptions): {
    GET: () => Promise<NextResponse<{
        items: FeedbackItem[];
    }> | NextResponse<{
        error: string;
        details: string;
    }>>;
    POST: (req: NextRequest) => Promise<NextResponse<{
        error: string;
    }> | NextResponse<{
        item: FeedbackItem;
    }>>;
    PATCH: (req: NextRequest) => Promise<NextResponse<{
        error: string;
    }> | NextResponse<{
        item: FeedbackItem;
    }>>;
    DELETE: (req: NextRequest) => Promise<NextResponse<{
        error: string;
    }> | NextResponse<{
        ok: boolean;
    }>>;
};
export declare function createImplementRoute(options?: ImplementRouteOptions): {
    POST: (req: NextRequest) => Promise<NextResponse<{
        error: string;
    }> | NextResponse<{
        item: FeedbackItem | null;
        prompt: string;
    }>>;
};
//# sourceMappingURL=server.d.ts.map