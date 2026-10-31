import { NextRequest } from "next/server";
import { FeedbackItem, FeedbackRouteOptions, ImplementRouteOptions } from "./types";
export * from "./types";
export * from "./store";
export declare function defaultBuildPrompt(item: FeedbackItem, additionalContext?: string, appName?: string): string;
export declare function createFeedbackRoute(options?: FeedbackRouteOptions): {
    GET: () => Promise<any>;
    POST: (req: NextRequest) => Promise<any>;
    PATCH: (req: NextRequest) => Promise<any>;
    DELETE: (req: NextRequest) => Promise<any>;
};
export declare function createImplementRoute(options?: ImplementRouteOptions): {
    POST: (req: NextRequest) => Promise<any>;
};
//# sourceMappingURL=server.d.ts.map