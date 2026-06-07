# Testing Patterns

**Analysis Date:** 2026-06-07

## Test Framework

**Runner:**
- Jest with `ts-jest` preset
- Config: `jest.config.ts`

**Assertion Library:**
- Jest built-in (`expect`, `toBe`, `toEqual`, `toHaveLength`, etc.)

**Run Commands:**
```bash
npx jest                  # Run all tests
npx jest --watch          # Watch mode
npx jest --coverage       # Coverage report
```

## Test File Organization

**Location:**
- Separate `tests/` directory at repo root — NOT co-located with source files

**Naming:**
- `<subject>.test.ts` pattern (e.g., `tests/auth.test.ts`, `tests/split.test.ts`)
- All TypeScript (`.test.ts`), no `.test.tsx` (no component tests)

**Structure:**
```
tests/
├── auth.test.ts     # Tests for lib/auth.ts authenticate()
└── split.test.ts    # Tests for worker/stages/split.ts splitScript()
```

**testMatch config:** `**/tests/**/*.test.ts`

## Test Structure

**Suite Organization:**
- No `describe` blocks — flat `test()` calls at module level
- Each test file covers one exported function

```typescript
// No describe wrapper — flat test list
test('returns admin context for ADMIN_API_KEY', async () => {
  // arrange
  process.env.ADMIN_API_KEY = 'admin-secret'
  const req = new Request('http://localhost', {
    headers: { authorization: 'Bearer admin-secret' },
  })
  // act
  const ctx = await authenticate(req)
  // assert
  expect(ctx).toEqual({ type: 'admin' })
})
```

**Patterns:**
- Arrange/act/assert inline — no helper abstraction
- `beforeEach(() => jest.clearAllMocks())` for mock reset between tests
- `process.env` mutation for env-dependent tests (set directly, not restored)

## Mocking

**Framework:** Jest built-in (`jest.mock`, `jest.fn`)

**Module mock pattern:**
```typescript
jest.mock('@/lib/db', () => ({
  db: { client: { findUnique: jest.fn() } },
}))

const mockDb = db as unknown as { client: { findUnique: jest.Mock } }
```

**Return value mocking:**
```typescript
mockDb.client.findUnique.mockResolvedValue({ id: 'client-1' })   // success
mockDb.client.findUnique.mockResolvedValue(null)                  // not found
```

**What is mocked:**
- DB layer (`@/lib/db`) — prevents real DB connections in unit tests
- `process.env` variables — set inline per test

**What is NOT mocked:**
- The function under test itself
- `Request` — uses real Web `Request` API (available in Node 18+ / `testEnvironment: 'node'`)

## Fixtures and Factories

**Test Data:**
- Inline — no fixture files or factory functions
- `Request` objects constructed inline per test:

```typescript
const req = new Request('http://localhost', {
  headers: { authorization: 'Bearer admin-secret' },
})
```

- Array generation for bulk data tests:
```typescript
const text = Array(30).fill(sentence).join(' ')
```

**Location:** No separate fixtures directory.

## Coverage

**Requirements:** Not enforced — no `coverageThreshold` in `jest.config.ts`

**View Coverage:**
```bash
npx jest --coverage
```

## Test Types

**Unit Tests:**
- Only type present — pure function tests and mocked dependency tests
- `tests/split.test.ts`: pure function (`splitScript`) — no mocks needed
- `tests/auth.test.ts`: function with DB dependency — DB mocked via `jest.mock`

**Integration Tests:** Not present

**E2E Tests:** Not present

**Storybook (component visual tests):**
- Storybook 8 with `@storybook/nextjs` framework
- Config: `.storybook/main.ts`, `.storybook/preview.ts`
- Stories in `components/**/*.stories.@(ts|tsx)`
- `tags: ['autodocs']` enables automatic docs generation
- Addons: `@storybook/addon-essentials`, `@storybook/addon-interactions`
- Only one story file exists: `components/Button.stories.tsx`

```typescript
// Story pattern
const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof Button>;
export const Primary: Story = { args: { children: 'Primary action', variant: 'primary' } };
```

## Common Patterns

**Async Testing:**
```typescript
test('returns client context for valid client api key', async () => {
  mockDb.client.findUnique.mockResolvedValue({ id: 'client-1' })
  const ctx = await authenticate(req)
  expect(ctx).toEqual({ type: 'client', clientId: 'client-1' })
})
```

**Null/falsy result testing:**
```typescript
test('returns null for missing token', async () => {
  const req = new Request('http://localhost')  // no auth header
  const ctx = await authenticate(req)
  expect(ctx).toBeNull()
})
```

**Edge case testing (split):**
```typescript
test('strips BOM from input', () => {
  const text = '﻿Hello world.'
  const chunks = splitScript(text, 200)
  expect(chunks[0].startsWith('﻿')).toBe(false)
})
```

## Coverage Gaps

**Untested areas:**
- All `app/api/v1/**` route handlers — no route-level integration tests
- `lib/auth.ts` session functions (`createSession`, `getSession`, `destroySession`, `createMagicLinkToken`, `verifyMagicLinkToken`)
- `lib/queue.ts`, `lib/email.ts`, `lib/nonce.ts`
- All worker stages except `split`: `worker/stages/audio.ts`, `worker/stages/remotion-render.ts`, `worker/stages/upload.ts`, `worker/stages/video.ts`
- `worker/pipeline.ts`, `worker/index.ts`
- All React components (no component tests beyond Storybook stories)

---

*Testing analysis: 2026-06-07*
