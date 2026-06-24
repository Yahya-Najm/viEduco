export function fakeSession(
  overrides: Partial<{ id: string; email: string; name: string }> = {},
) {
  return {
    user: {
      id: overrides.id ?? "user-1",
      email: overrides.email ?? "user@example.com",
      name: overrides.name ?? "Test User",
    },
  }
}

export function makeFormData(fields: Record<string, string>) {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) fd.set(key, value)
  return fd
}
