import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import { createFeedbackStore } from "./store";
export * from "./types";
export * from "./store";
export function defaultBuildPrompt(item, additionalContext, appName) {
    const typeLabel = item.type === "idea"
        ? "Feature / Improvement Idea"
        : item.type === "bug"
            ? "Bug / Error Report"
            : "User Feedback";
    const targetApp = appName ? `the "${appName}"` : "this";
    return [
        `Implement the following improvement in ${targetApp} project.`,
        ``,
        `### Feedback Details`,
        `- **Type**: ${typeLabel}`,
        `- **Topic**: ${item.topic}`,
        `- **Submitted by**: ${item.authorName || "Anonymous"}${item.authorEmail ? ` (${item.authorEmail})` : ""}`,
        `- **Feedback / Request**:`,
        `  ${item.message}`,
        item.pageContext ? `- **Page Context**: ${item.pageContext}` : null,
        additionalContext?.trim()
            ? `\n### Additional Context & Implementation Instructions\n${additionalContext.trim()}`
            : null,
        ``,
        `### Guidelines`,
        `- Keep the changes clean, minimal, readable, and directly focused on fulfilling the feedback and additional context.`,
        `- Preserve existing project functionality and styling conventions.`,
        `- Provide a concise summary of what files were changed and how the improvement was implemented.`,
    ]
        .filter(Boolean)
        .join("\n");
}
function resolveBinary(preferredPath, defaultLocalPath, fallbackName) {
    if (preferredPath && fs.existsSync(preferredPath)) {
        return preferredPath;
    }
    if (fs.existsSync(defaultLocalPath)) {
        return defaultLocalPath;
    }
    return fallbackName;
}
export function createFeedbackRoute(options) {
    const store = options?.store || createFeedbackStore(options);
    async function GET() {
        try {
            const items = await store.readAll();
            return NextResponse.json({ items });
        }
        catch (err) {
            return NextResponse.json({ error: "Failed to load feedback.", details: String(err) }, { status: 500 });
        }
    }
    async function POST(req) {
        try {
            const body = await req.json();
            const message = typeof body.message === "string" ? body.message.trim() : "";
            if (!message) {
                return NextResponse.json({ error: "Feedback message cannot be empty." }, { status: 400 });
            }
            const type = body.type === "idea" || body.type === "bug" ? body.type : "feedback";
            const item = await store.add({
                type,
                topic: body.topic,
                message,
                authorName: body.authorName,
                authorEmail: body.authorEmail,
                pageContext: body.pageContext,
            });
            return NextResponse.json({ item }, { status: 201 });
        }
        catch (err) {
            return NextResponse.json({ error: "Failed to save feedback.", details: String(err) }, { status: 500 });
        }
    }
    async function PATCH(req) {
        try {
            const body = await req.json();
            const id = typeof body.id === "string" ? body.id : "";
            if (!id) {
                return NextResponse.json({ error: "Missing feedback ID." }, { status: 400 });
            }
            const patch = {};
            if (body.status)
                patch.status = body.status;
            if (typeof body.topic === "string")
                patch.topic = body.topic;
            if (typeof body.additionalContext === "string")
                patch.additionalContext = body.additionalContext;
            if (typeof body.implementationLog === "string")
                patch.implementationLog = body.implementationLog;
            if (typeof body.implementedAt === "string")
                patch.implementedAt = body.implementedAt;
            const updated = await store.update(id, patch);
            if (!updated) {
                return NextResponse.json({ error: "Feedback item not found." }, { status: 404 });
            }
            return NextResponse.json({ item: updated });
        }
        catch (err) {
            return NextResponse.json({ error: "Failed to update feedback.", details: String(err) }, { status: 500 });
        }
    }
    async function DELETE(req) {
        try {
            const { searchParams } = new URL(req.url);
            const id = searchParams.get("id");
            if (!id) {
                return NextResponse.json({ error: "Missing feedback ID." }, { status: 400 });
            }
            const deleted = await store.delete(id);
            if (!deleted) {
                return NextResponse.json({ error: "Feedback item not found." }, { status: 404 });
            }
            return NextResponse.json({ ok: true });
        }
        catch (err) {
            return NextResponse.json({ error: "Failed to delete feedback.", details: String(err) }, { status: 500 });
        }
    }
    return { GET, POST, PATCH, DELETE };
}
export function createImplementRoute(options) {
    const store = options?.store ||
        createFeedbackStore({
            storagePath: options?.storagePath,
            appName: options?.appName,
        });
    const promptBuilder = options?.buildPrompt || defaultBuildPrompt;
    async function POST(req) {
        try {
            const body = await req.json();
            const id = typeof body.id === "string" ? body.id : "";
            const additionalContext = typeof body.additionalContext === "string" ? body.additionalContext.trim() : "";
            const preferredAgent = body.agent === "agy" ? "agy" : "claude";
            if (!id) {
                return NextResponse.json({ error: "Missing feedback ID." }, { status: 400 });
            }
            const all = await store.readAll();
            const target = all.find((item) => item.id === id);
            if (!target) {
                return NextResponse.json({ error: "Feedback item not found." }, { status: 404 });
            }
            const prompt = promptBuilder(target, additionalContext, options?.appName);
            const agentDisplayName = preferredAgent === "claude" ? "Claude Code CLI" : "Antigravity CLI (agy)";
            const startLog = `[${new Date().toLocaleTimeString()}] Starting automatic implementation with ${agentDisplayName}...\n`;
            const updated = await store.update(id, {
                status: "in_progress",
                additionalContext: additionalContext || target.additionalContext,
                agentUsed: preferredAgent,
                implementationLog: startLog,
            });
            const workspaceDir = process.cwd();
            const bin = preferredAgent === "claude"
                ? resolveBinary(options?.claudeBin, `${process.env.HOME || ""}/.local/bin/claude`, "claude")
                : resolveBinary(options?.agyBin, `${process.env.HOME || ""}/.local/bin/agy`, "agy");
            const args = ["-p", prompt, "--dangerously-skip-permissions"];
            try {
                const child = spawn(bin, args, {
                    cwd: workspaceDir,
                    env: {
                        ...process.env,
                        PATH: `${process.env.HOME || ""}/.local/bin:/usr/local/bin:/opt/homebrew/bin:${process.env.PATH || "/usr/bin:/bin"}`,
                    },
                    stdio: ["ignore", "pipe", "pipe"],
                });
                let accumulatedLog = startLog;
                let lastFlush = 0;
                const appendChunk = async (chunk) => {
                    accumulatedLog += chunk.toString("utf-8");
                    const now = Date.now();
                    if (now - lastFlush > 1200) {
                        lastFlush = now;
                        await store.update(id, {
                            implementationLog: accumulatedLog.slice(-15000),
                        });
                    }
                };
                child.stdout?.on("data", (chunk) => {
                    void appendChunk(chunk);
                });
                child.stderr?.on("data", (chunk) => {
                    void appendChunk(chunk);
                });
                child.on("error", async (err) => {
                    accumulatedLog += `\n[Agent error]: ${err.message}\n`;
                    await store.update(id, {
                        status: "open",
                        implementationLog: accumulatedLog,
                    });
                });
                child.on("close", async (code) => {
                    const timestamp = new Date().toISOString();
                    if (code === 0) {
                        accumulatedLog += `\n[${new Date().toLocaleTimeString()}] Implementation completed successfully (exit code 0).`;
                        await store.update(id, {
                            status: "implemented",
                            implementedAt: timestamp,
                            implementationLog: accumulatedLog.slice(-15000),
                        });
                    }
                    else {
                        accumulatedLog += `\n[${new Date().toLocaleTimeString()}] Process finished with exit code ${code}.`;
                        await store.update(id, {
                            status: "open",
                            implementationLog: accumulatedLog.slice(-15000),
                        });
                    }
                });
            }
            catch (spawnErr) {
                await store.update(id, {
                    status: "open",
                    implementationLog: `${startLog}\nFailed to spawn process: ${String(spawnErr)}`,
                });
            }
            return NextResponse.json({
                item: updated,
                prompt,
            });
        }
        catch (err) {
            return NextResponse.json({ error: "Could not trigger implementation.", details: String(err) }, { status: 500 });
        }
    }
    return { POST };
}
//# sourceMappingURL=server.js.map