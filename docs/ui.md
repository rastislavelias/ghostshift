# Console UI

The console uses **Tailwind CSS 4** and **shadcn/ui** (New York / Radix components).
The existing dark Ghostshift theme is defined centrally in `apps/console/app/globals.css`.
The document root applies the dark variant; there is no theme switch in this release.

## Structure

- `apps/console/components/ui`: Button, Input, Textarea, Label, Card, Badge, Sidebar, Sheet, Tooltip, Separator and Skeleton.
- `apps/console/lib/utils.ts`: `cn()` combines conditional classes and resolves Tailwind conflicts.
- `apps/console/components.json`: shadcn registry configuration and import aliases.
- `apps/console/postcss.config.mjs`: Tailwind's PostCSS integration.
- `apps/console/app/globals.css`: Tailwind imports, semantic theme tokens and base styles.

Layout and responsive behavior belong in Tailwind utilities. Prefer semantic colors such as
`bg-card`, `text-muted-foreground` and `text-primary` over new hardcoded color values.
Use the shared UI components for controls and panels instead of introducing global element
selectors. Keep labels, focus states, keyboard access, and status/error announcements intact.

The source components were obtained from the official `new-york-v4` shadcn registry on
2026-10-24 and 2026-10-27. Imports were adapted to the local `cn()` utility and individual Radix packages.
Their MIT license is preserved in [third-party notices](../THIRD_PARTY_NOTICES.md).

From the repository root, inspect the setup with:

```sh
npx shadcn@4.22.1 info --cwd apps/console
```

When adding a component, review the CLI's proposed changes and dependencies before applying
them. Avoid overwriting theme customizations. Components are owned source files in this
repository; they are not imported from a monolithic shadcn component package.

Tailwind runs during the existing Next.js build. The shared app shell provides Dashboard, Projects and Configuration navigation. See
[configuration](configuration.md) for encrypted provider credentials and their persistence. No frontend CDN or additional running service is required.
