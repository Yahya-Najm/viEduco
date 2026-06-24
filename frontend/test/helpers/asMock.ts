import type { Mock } from "vitest"

// vi.mocked() infers from the real module's static type, which for NextAuth's
// overloaded `auth()` (it also has a NextMiddleware call signature) and
// Prisma's strict row types fights every partial mock we pass in. The actual
// runtime value is always a plain vi.fn() per our vi.mock() factories, so cast
// straight to Mock instead of wrestling with those signatures.
export function asMock(fn: unknown): Mock {
  return fn as Mock
}
