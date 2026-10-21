import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import type * as Types from "effect/Types"

import type { SubjectId } from "../../../Schema.ts"
import { makeAuthStrategy } from "../../auth/authStrategy.ts"
import { HookDenied } from "../../hooks/models.ts"
import type { AuthInvocation } from "../../operations/context.ts"
import { makeOperation, operationGroup } from "../../operations/operation.ts"
import { AuthenticationFlowId } from "../../sessions/models.ts"
import type { makeSessionModule } from "../../sessions/module.ts"
import { PasswordSignInInput } from "./contracts.ts"
import {
  PasswordMethodConfigurationError,
  PasswordMethodUnsupported,
  PasswordRejected,
  PasswordUnavailable
} from "./errors.ts"
import type { PasswordCredentialSnapshot } from "./models.ts"
import { defaultPasswordAttemptLimiterLayer } from "./passwordAttemptLimiter.ts"
import {
  defaultPasswordMethodPolicy,
  type PasswordMethodPolicy,
  snapshotPasswordMethodPolicy,
  validatePasswordMethodPolicy
} from "./policy.ts"
import { snapshotPasswordCredential } from "./snapshot.ts"
import { makePasswordVerification, passwordCompletionFailure, readPasswordCommit } from "./verification.ts"

export interface PasswordSignInOptions<
  SessionId extends string,
  Claims extends Schema.Codec<unknown, unknown, unknown, unknown>
> {
  readonly sessions: ReturnType<typeof makeSessionModule<SessionId, Claims>>
  readonly policy?: PasswordMethodPolicy
  readonly features?: { readonly signIn: true }
}

/** A sign-in-only installation never acquires account creation or password mutation services. */
export const makePasswordSignIn = <
  const Id extends string,
  const SessionId extends string,
  Claims extends Schema.Codec<unknown, unknown, unknown, unknown>
>(
  moduleId: Id,
  options: PasswordSignInOptions<SessionId, Claims>
) => {
  const { sessions } = options
  const source = options.policy ?? defaultPasswordMethodPolicy
  const policy = validatePasswordMethodPolicy(snapshotPasswordMethodPolicy(source))

  /** Supply application session claims for the verified password's subject. */
  const SessionClaims = Context.Service<
    {
      readonly moduleId: Id
      readonly kind: "claims"
      readonly claims: Types.Invariant<Claims["Type"]>
    },
    {
      readonly resolve: (input: {
        readonly subjectId: SubjectId
        readonly credential: PasswordCredentialSnapshot
      }) => Effect.Effect<Claims["Type"], PasswordUnavailable>
    }
  >(`@effect/auth/password/${moduleId}/Claims`)

  const Input = Schema.Struct({
    flowId: AuthenticationFlowId.check(Schema.isMaxLength(256)),
    ...PasswordSignInInput.fields
  })

  const SignIn = makeOperation(`${moduleId}/sign-in`, {
    payload: Input,
    success: sessions.CompletionResult,
    error: Schema.Union([
      PasswordRejected,
      PasswordUnavailable,
      PasswordMethodUnsupported,
      HookDenied
    ]),
    access: "any",
    exposure: "public",
    replay: "non-idempotent",
    credentials: true
  })

  const handlersLayer = Layer.unwrap(
    Effect.gen(function*() {
      yield* Schema.decodeEffect(Schema.NonEmptyString.check(Schema.isMaxLength(128)))(
        moduleId
      ).pipe(Effect.mapError(() => PasswordMethodConfigurationError.make({})))
      const configured = yield* policy

      return SignIn.credentialHandlerLayer(
        Effect.fn("Passwords.signIn")(function*(request) {
          const { verifyPassword } = makePasswordVerification({ moduleId, policy: configured })
          const verified = yield* verifyPassword(request, "sign-in")

          const credential = yield* snapshotPasswordCredential(verified.credential)

          const claims = yield* (yield* SessionClaims).resolve({
            subjectId: credential.revision.subjectId,
            credential
          })

          return yield* (yield* sessions.AuthenticationCompletion)
            .prepare({
              evidence: verified.evidence,
              requirement: verified.requirement,
              claims
            })
            .pipe(
              Effect.flatMap(readPasswordCommit),
              Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, passwordCompletionFailure)))
            )
        })
      )
    })
  ).pipe(Layer.provide(defaultPasswordAttemptLimiterLayer))

  return Object.freeze({
    persistence: { kind: "password" as const, moduleId, management: false as const },
    SessionClaims,
    layer: handlersLayer,
    handlersLayer,
    operations: { SignIn },
    group: operationGroup(SignIn),
    strategy: makeAuthStrategy(
      {
        signIn: Effect.fn("Passwords.signInRequest")(function*(
          invocation: AuthInvocation,
          request: Omit<typeof Input.Encoded, "flowId">
        ) {
          const flowId = yield* (yield* SecureRandom.SecureRandom)
            .uuidV4()
            .pipe(
              Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => PasswordUnavailable.make({}))))
            )

          return yield* SignIn.invoke(invocation, { ...request, flowId })
        })
      },
      handlersLayer.pipe(Layer.merge(Layer.effect(SecureRandom.SecureRandom, SecureRandom.SecureRandom))),
      { completion: true }
    )
  })
}
