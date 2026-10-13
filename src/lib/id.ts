// crypto.randomUUID only exists on https/localhost; fall back when opened over plain http on a phone.
export function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}
