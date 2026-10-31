# @thetoaster/next-feedback

A drop-in feedback widget & admin dashboard module for Next.js applications with automatic topic grouping and AI agent automated implementation (Claude Code / Antigravity CLI).

## Features

- 🎯 **Hovering Floating Widget**: Collects ideas, user feedback, and error/bug reports with 1 click.
- 🏷️ **Automatic Topic Grouping**: Smart keyword inference groups feedback into topics (or use custom domain topics).
- 👤 **Author Caching**: Remembers user name & email across submissions in `localStorage`.
- 📊 **Full Admin Dashboard (`/admin`)**: KPI cards, type/status filters, instant search, and topic-grouped cards.
- ⚡ **"Implement Improvement" Workflow**: Direct 1-click execution via **Claude Code CLI** or **Antigravity CLI (`agy`)** with real-time log streaming.
- 📁 **Zero-Dependency File Store**: Saves feedback locally in JSON (`data/feedback.json`), no external database required.
- 🔄 **Base-Path Aware**: Automatically works with Next.js subpath configs (`basePath`).

---

## Installation

Add the module to your project:

```bash
npm install github:thetoaster/next-feedback
```

*(Ensure peer dependencies `lucide-react`, `framer-motion`, `react`, and `next` are installed).*

---

## Quick Setup (Next.js App Router)

### 1. Create the Feedback API Route
In `src/app/api/feedback/route.ts`:

```ts
import { createFeedbackRoute } from "@thetoaster/next-feedback/server";

export const dynamic = "force-dynamic";

export const { GET, POST, PATCH, DELETE } = createFeedbackRoute({
  appName: "My App",
  storagePath: "data/feedback.json",
  // Optional custom topics:
  topics: [
    "UI, Charts & Design",
    "Data Import & Export",
    "Performance",
    "General",
  ],
});
```

### 2. Create the Implement Route (AI Coding Agent)
In `src/app/api/feedback/implement/route.ts`:

```ts
import { createImplementRoute } from "@thetoaster/next-feedback/server";

export const dynamic = "force-dynamic";

export const { POST } = createImplementRoute({
  appName: "My App",
  storagePath: "data/feedback.json",
});
```

### 3. Add the Widget to Your Layout
In `src/app/layout.tsx`:

```tsx
import { FeedbackWidget } from "@thetoaster/next-feedback";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {children}
        <FeedbackWidget />
      </body>
    </html>
  );
}
```

### 4. Create the Admin Dashboard Page
In `src/app/admin/page.tsx`:

```tsx
"use client";

import { FeedbackAdmin } from "@thetoaster/next-feedback";

export default function AdminPage() {
  return <FeedbackAdmin backHref="/" />;
}
```

---

## Configuration Options

### `FeedbackWidget` Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `apiPath` | `string` | `"/api/feedback"` | API endpoint for feedback CRUD (auto-detects Next.js basePath) |
| `adminHref` | `string` | `"/admin"` | Target link to the admin dashboard |
| `topics` | `string[] \| { label, value }[]` | Defaults | Custom topics for the topic dropdown |
| `triggerLabel` | `string` | `"Feedback & Ideen"` | Label on the floating pill button |
| `position` | `"bottom-right" \| "bottom-left"` | `"bottom-right"` | Corner alignment |

### `FeedbackAdmin` Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `apiPath` | `string` | `"/api/feedback"` | API endpoint for feedback CRUD |
| `implementApiPath` | `string` | `"/api/feedback/implement"` | API endpoint for AI implementation |
| `backHref` | `string` | `"/"` | Return link |
| `title` | `string` | `"Feedback & Produkt-Verbesserungen"` | Header title |

---

## License

MIT © [thetoaster](https://github.com/thetoaster)
