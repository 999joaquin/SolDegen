# AI Rules for SolDegen Next

These rules ensure consistent, simple, and maintainable changes across the app.

## Tech Stack (overview)
- Next.js 14 (App Router, app/ directory) with React 18 and TypeScript.
- Tailwind CSS for styling, with tailwindcss-animate for transitions.
- shadcn/ui (Radix-based) components for UI primitives, imported from `@/components/ui/*`.
- Lucide icons via `lucide-react`.
- TanStack React Query for client-side data fetching and caching.
- Supabase (`@supabase/supabase-js`) for database, persistence, and queries.
- Sonner for toast notifications, with a simple wrapper in `utils/toast.ts`.
- Theme management using `next-themes`.
- Forms with `react-hook-form` + `zod` + `@hookform/resolvers`.
- Utilities: `date-fns` for date formatting; `clsx` and `tailwind-merge` for className composition.

## Library usage rules
- Routing & pages
  - Use Next.js App Router exclusively; pages live under `app/*` (e.g., `app/page.tsx`, `app/profile/page.tsx`).
  - Keep global layout in `app/layout.tsx`; do not introduce React Router or custom routing.
- UI & styling
  - Use Tailwind CSS for all styling; avoid inline styles except for small, dynamic cases.
  - Prefer shadcn/ui components for buttons, inputs, dialogs, dropdowns, tooltips, etc., imported from `@/components/ui/*`.
  - Do not modify shadcn/ui component source files; create new components or wrappers in `components/` if customization is needed.
  - Use `lucide-react` for icons; keep icons consistent with existing usage.
- Data fetching & state
  - Use TanStack React Query for client-side data fetching, caching, and invalidation.
  - Centralize Supabase operations in `lib/supabase-queries.ts`; components should call these query helpers instead of using the Supabase client directly.
  - After mutations, invalidate relevant queries via React Query to refresh data.
- Backend & persistence
  - Use Supabase for database and persistence; the client is initialized in `lib/supabase.ts`.
  - Require environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (store in `.env.local`).
  - Do not add alternate database/auth providers.
- Wallet & blockchain
  - Use the `hooks/use-wallet.tsx` context for wallet connection and user identity; do not access `window.solana` directly in components.
  - Use `@solana/web3.js` for RPC calls; balance queries should use `hooks/use-solana-balance.ts`.
  - Configure network via `NEXT_PUBLIC_SOLANA_NETWORK` and optionally `NEXT_PUBLIC_SOLANA_RPC_URL` (`devnet` by default).
- Forms & validation
  - Use `react-hook-form` for forms, with `zod` schemas and `zodResolver` for validation.
  - Display errors and status using Sonner toasts and shadcn form feedback components.
- Notifications
  - Use Sonner for toasts via `utils/toast.ts` helpers (`showSuccess`, `showError`, etc.).
  - Ensure the provider is present (already added in `components/Providers.tsx`).
- Theming
  - Use `next-themes` (`ThemeProvider` in `components/Providers.tsx`) for dark/light modes and theme management.
- Utilities & dates
  - Use `date-fns` for any date manipulation or formatting.
  - Use `clsx` + `tailwind-merge` to compose and de-duplicate class names.
- File structure & components
  - Place shared UI in `components/`, pages in `app/`, hooks in `hooks/`, helpers in `utils/`, and Supabase logic in `lib/`.
  - Create small, focused components; prefer new files over adding large blocks to existing ones.
  - Mark client-side components with `"use client"` only when needed (hooks, browser APIs, event handlers).

## General conventions
- Keep changes minimal and readable; avoid overengineering.
- Prefer existing libraries and patterns over adding new dependencies.
- Use TypeScript everywhere and keep types explicit for public APIs and context values.
- Use toasts for user-visible feedback; let unexpected errors bubble where appropriate so they can be fixed centrally.