import type * as Effect from "effect/Effect"
import type * as Redacted from "effect/Redacted"

import type { CredentialSlot } from "../operations/credentials.ts"
import type { OperationHttpError } from "./errors.ts"

/** @internal */
export const credentialSlots = [
  "session",
  "session-cache",
  "pending-proof",
  "registration",
  "request-binding",
  "session-step-up"
] as const

export type HttpCredentials = Readonly<Partial<Record<CredentialSlot, Redacted.Redacted<string>>>>

export interface OperationCookie {
  readonly name: string
  readonly path: string
  readonly secure: boolean
  readonly sameSite: "lax" | "strict" | "none"
  readonly domain?: string
}

export interface OperationHttpConfiguration {
  readonly cookies: Readonly<Record<CredentialSlot, OperationCookie>>
  readonly trustedOrigins: ReadonlyArray<string>
  readonly csrfHeader: string
  readonly csrfValue: string
  readonly maximumBodyBytes: number
  readonly maximumUrlBytes: number
  /** The host decides its public origin. Forwarded headers have no authority by default. */
  readonly publicOrigin: string | ((request: Request) => Effect.Effect<string, OperationHttpError>)
  readonly native?: {
    readonly modeHeader: string
    readonly requestHeaders: Readonly<Record<CredentialSlot, string>>
    readonly responseHeaders: Readonly<Record<CredentialSlot, string>>
    /** Explicit host admission; absence of Origin alone is not native authorization. */
    readonly authorize: (request: Request) => Effect.Effect<void, OperationHttpError>
  }
}
