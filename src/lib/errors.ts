// User-facing messages from pure code, as translation keys so the UI can show them in the chosen language.

export type MessageParams = Record<string, string | number>

/** A message to show the user: a key in the translation files plus the values it interpolates. */
export interface Message {
  key: string
  params?: MessageParams
}

/** An error the UI can translate via `key`; `message` stays English for logs and tests. */
export class AppError extends Error {
  key: string
  params?: MessageParams

  constructor(message: string, key: string, params?: MessageParams) {
    super(message)
    this.key = key
    this.params = params
  }
}
