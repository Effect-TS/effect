import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Redacted from "effect/Redacted"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"

import type { AuthInvocation } from "./context.ts"
import { OperationOutputError } from "./errors.ts"
import type { AuthRevealCommand, AuthRevealCommandCollector } from "./reveals.ts"

export type CredentialSlot =
  | "session"
  | "session-cache"
  | "pending-proof"
  | "registration"
  | "request-binding"
  | "session-step-up"

/** Private delivery instructions. Never include these in a Schema/RPC success or lifecycle event. */
export type AuthCredentialCommand =
  | {
    readonly _tag: "Issue"
    readonly slot: CredentialSlot
    readonly credential: Redacted.Redacted<string>
    readonly expiresAtMillis: number
    /** form_post callbacks. The HTTP layer requires a Secure cookie before setting it. */
    readonly sameSite?: "none"
  }
  | { readonly _tag: "Clear"; readonly slot: CredentialSlot }

/**
 * An explicit SameSite=Lax cookie is omitted on a cross-site POST. None is sent.
 *
 * @internal
 */
export const formPostBinding = (
  command: AuthCredentialCommand,
  responseMode: "query" | "form_post" | undefined
): AuthCredentialCommand =>
  command._tag === "Issue" && command.slot === "request-binding" && responseMode === "form_post"
    ? Object.freeze({ ...command, sameSite: "none" })
    : command

/** Acceptance into a caller-owned collector, not fallible cookie or secure-store persistence. */
export type AuthCredentialCommandSink = (
  commands: ReadonlyArray<AuthCredentialCommand>
) => Effect.Effect<void>

/** Request-local acceptance for private credential commands. */
export class AuthCredentialCommandCollector extends Context.Service<
  AuthCredentialCommandCollector,
  AuthCredentialCommandSink
>()("@effect/auth/AuthCredentialCommandCollector") {}

/** Request-local acceptance for private reveal commands. */
export class AuthRevealCommandCollectorService extends Context.Service<
  AuthRevealCommandCollectorService,
  AuthRevealCommandCollector
>()("@effect/auth/AuthRevealCommandCollector") {}

export interface AuthOperationResult<A> {
  readonly value: A
  readonly credentialCommands: ReadonlyArray<AuthCredentialCommand>
  readonly revealCommands?: ReadonlyArray<AuthRevealCommand>
}

export interface AuthResolvedCall {
  readonly invocation: AuthInvocation
  /** Private incoming credentials for this request or native workflow only. */
  readonly credentials: Readonly<Partial<Record<CredentialSlot, Redacted.Redacted<string>>>>
  readonly credentialCommandSink: AuthCredentialCommandSink
  readonly revealCommandCollector?: AuthRevealCommandCollector
}

const slot = Schema.Literals([
  "session",
  "session-cache",
  "pending-proof",
  "registration",
  "request-binding",
  "session-step-up"
])

const decodeCommand = Schema.decodeResult(
  Schema.Union([
    Schema.Struct({
      _tag: Schema.Literal("Issue"),
      slot,
      credential: Schema.Redacted(Schema.String),
      expiresAtMillis: Schema.Finite,
      sameSite: Schema.optionalKey(Schema.Literal("none"))
    }),
    Schema.Struct({ _tag: Schema.Literal("Clear"), slot })
  ])
)

/**
 * Capture the entire private array synchronously before projecting public success.
 *
 * @internal
 */
export const snapshotCredentialCommands = (commands: ReadonlyArray<AuthCredentialCommand>) =>
  Result.try({
    try: () =>
      Result.gen(function*() {
        if (!Array.isArray(commands)) return yield* Result.fail(OperationOutputError.make({}))
        const length = commands.length

        if (!Number.isInteger(length) || length < 0 || length > 9) {
          return yield* Result.fail(OperationOutputError.make({}))
        }
        const slots = new Set<CredentialSlot>()
        const captured: Array<AuthCredentialCommand> = []

        for (let index = 0; index < length; index++) {
          const input = commands[index]
          const tag = input._tag
          const slot = input.slot

          const value = tag === "Issue"
            ? {
              _tag: tag,
              slot,
              credential: Redacted.make(Redacted.value(input.credential)),
              expiresAtMillis: input.expiresAtMillis,
              ...(input.sameSite === undefined ? {} : { sameSite: input.sameSite })
            }
            : { _tag: tag, slot }

          const command = yield* decodeCommand(value)

          if (
            command._tag === "Issue" &&
            command.sameSite === "none" &&
            command.slot !== "request-binding"
          ) {
            return yield* Result.fail(OperationOutputError.make({}))
          }

          if (slots.has(command.slot)) {
            return yield* Result.fail(OperationOutputError.make({}))
          }
          slots.add(command.slot)
          captured.push(Object.freeze(command))
        }

        return Object.freeze(captured)
      }),
    catch: () => OperationOutputError.make({})
  }).pipe(
    Result.flatMap((result) => result),
    Result.mapError(() => OperationOutputError.make({}))
  )

export const validateCredentialCommands = (commands: ReadonlyArray<AuthCredentialCommand>) =>
  Effect.suspend(() => Effect.fromResult(snapshotCredentialCommands(commands))).pipe(Effect.orDie)
