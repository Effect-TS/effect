import * as Cause from "effect/Cause"
import * as Console from "effect/Console"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Predicate from "effect/Predicate"
import * as References from "effect/References"
import * as Schema from "effect/Schema"
import * as SqlError from "effect/sql/SqlError"
import * as Tracer from "effect/Tracer"

export const AuthDiagnostic = Schema.Struct({
  stage: Schema.Literals([
    "session-verification",
    "session-timeline",
    "session-authority",
    "persistence-initialization",
    "persistence-validation",
    "oauth-exchange",
    "oauth-completion",
    "oauth-registration"
  ]),
  reason: Schema.Literals([
    "invalid-evidence",
    "chronology",
    "future-issued",
    "expired",
    "lifetime",
    "configuration",
    "mapping",
    "authority-rejected",
    "rejected",
    "unavailable",
    "timeout"
  ])
})

export type AuthDiagnostic = typeof AuthDiagnostic.Type

/** Only fixed fields enter diagnostics; logging defects cannot change authentication. */
export const reportAuthDiagnostic = Effect.fnUntraced(
  function*(stage: AuthDiagnostic["stage"], reason: AuthDiagnostic["reason"]) {
    const diagnostic = yield* Schema.decodeEffect(AuthDiagnostic)({ stage, reason })

    yield* Effect.logDebug("Auth diagnostic", diagnostic)
  },
  Effect.catch(() => Effect.void),
  Effect.catchDefect(() => Effect.void)
)

/**
 * Captured dependencies win; logging and tracing belong to the invoking fiber.
 *
 * @internal
 */
export const withoutObservability = <R>(context: Context.Context<R>): Context.Context<R> =>
  Context.omit(
    Tracer.ParentSpan,
    Tracer.Tracer,
    Tracer.CurrentTraceLevel,
    Tracer.MinimumTraceLevel,
    Console.Console,
    References.CurrentLoggers,
    References.CurrentLogLevel,
    References.MinimumLogLevel,
    References.LogToStderr,
    References.CurrentLogAnnotations,
    References.CurrentLogSpans,
    References.CurrentStackFrame,
    References.TracerEnabled,
    References.TracerTimingEnabled,
    References.TracerSpanAnnotations,
    References.TracerSpanLinks
  )(context) as Context.Context<R>

type FailureStage =
  | "local"
  | "rpc"
  | "http"
  | "http-client"
  | "client-workflow"
  | "browser-login"
  | "desktop"
  | "success-projection"
  | "error-projection"
  | "private-output"
  | "after-hook"
  | "proof-delivery"
  | "oauth-sign-in"
  | "oauth-accounts"
  | "oauth-exchange"
  | "oauth-protocol"
  | "oauth-identity"
  | "oauth-connected"
  | "oauth-registration"
  | "session-crypto"
  | "session-cache"
  | "session-sign-out"
  | "password-screening"
  | "password-hashing"
  | "password-limiting"
  | "auth-persistence"
  | "passkey-core"
  | "passkey-browser"
  | "passkey-react-native"
  | "passkey-protocol"

const SqlReason = Schema.Union(SqlError.SqlErrorReason.members.map(({ fields }) => fields._tag))

const SqlCode = Schema.Literals([
  "ENOTFOUND",
  "EAI_AGAIN",
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNABORTED",
  "EPIPE",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "08001",
  "08003",
  "08006",
  "08P01",
  "28P01",
  "23505",
  "42501",
  "42P01",
  "42703",
  "40001",
  "40P01",
  "55P03",
  "53300",
  "57014"
])

const isSqlReason = Schema.is(SqlReason)
const isSqlCode = Schema.is(SqlCode)

const AuthFailureReported = Context.Service<true>("@effect/auth/internal/AuthFailureReported")

/** Mark reasons after reporting their private Cause. This suppresses duplicate
 * diagnostics; it does not redact values. Newly composed cleanup reasons stay
 * unmarked and must still be reported before any public projection. */
export const markAuthFailureReported = <E>(cause: Cause.Cause<E>): Cause.Cause<E> =>
  Cause.fromReasons(
    cause.reasons.map((reason) => reason.annotate(Context.make(AuthFailureReported, true)))
  )

/**
 * Public boundary marker: the private Cause has already been reported safely.
 *
 * @internal
 */
export class ReportedOperationDefect extends Schema.TaggedError<ReportedOperationDefect>()(
  "ReportedOperationDefect",
  {}
) {
  override get message() {
    return "Auth operation failed"
  }
}

/** Fixed text and finite classifications only; never retains the reported value. */
class AuthReportedFailure extends Schema.TaggedError<AuthReportedFailure>()("AuthReportedFailure", {
  message: Schema.String,
  reason: Schema.optionalKey(SqlReason),
  code: Schema.optionalKey(SqlCode)
}) {}

const sqlFailureFields = (error: unknown) => {
  try {
    // These internal wrappers retain a single SQL failure. Do not inspect
    // arbitrary error causes or choose one category from a composite Cause.
    const seen = new Set<unknown>()

    for (let depth = 0; depth < 8 && !SqlError.isSqlError(error); depth++) {
      if (seen.has(error)) return {}
      seen.add(error)
      if (Cause.isCause(error)) {
        const [reason] = error.reasons

        if (error.reasons.length !== 1 || reason === undefined) return {}
        error = Cause.isFailReason(reason)
          ? reason.error
          : Cause.isDieReason(reason)
          ? reason.defect
          : undefined
      } else if (
        Predicate.hasProperty(error, "_tag") &&
        (error._tag === "PersistenceMappingError" || error._tag === "EffectDrizzleQueryError") &&
        Predicate.hasProperty(error, "cause")
      ) {
        error = error.cause
      } else return {}
    }
    if (!SqlError.isSqlError(error)) return {}
    const { _tag: reason, cause } = error.reason

    if (!isSqlReason(reason)) return {}
    const code = Predicate.hasProperty(cause, "code") ? cause.code : undefined

    return { reason, ...(isSqlCode(code) ? { code } : {}) }
  } catch {
    // Reporting must not invoke untrusted error accessors at authentication's expense.
    return {}
  }
}

/** Keep Effect's content-free frames, never failure values or arbitrary annotations. */
export const reportAuthFailure = Effect.fnUntraced(function*<E>(
  stage: FailureStage,
  cause: Cause.Cause<E>
): Effect.fn.Return<void> {
  const unreported = cause.reasons.filter((reason) => {
    if (Context.getOrUndefined(Cause.reasonAnnotations(reason), AuthFailureReported) === true) {
      return false
    }
    if (!Cause.isDieReason(reason)) return true
    try {
      return !(reason.defect instanceof ReportedOperationDefect)
    } catch {
      // Foreign defects can be proxies with throwing prototype traps.
      return true
    }
  })

  if (unreported.every(Cause.isInterruptReason)) return

  const diagnostic = Cause.fromReasons(
    unreported.map((reason) => {
      const error = AuthReportedFailure.make({
        message: `Auth ${stage} failed`,
        ...sqlFailureFields(
          Cause.isFailReason(reason)
            ? reason.error
            : Cause.isDieReason(reason)
            ? reason.defect
            : undefined
        )
      })

      const safe = Cause.isDieReason(reason)
        ? Cause.makeDieReason(error)
        : Cause.isFailReason(reason)
        ? Cause.makeFailReason(error)
        : Cause.makeInterruptReason(reason.fiberId)

      // Effect.fn / span names must themselves remain free of request content.
      const frame = Context.getOrUndefined(Cause.reasonAnnotations(reason), Cause.StackTrace)

      return frame === undefined ? safe : safe.annotate(Context.make(Cause.StackTrace, frame))
    })
  )

  yield* Effect.logError("Auth boundary failed", diagnostic).pipe(
    Effect.catchDefect(() =>
      Console.error("Auth failure reporter failed", diagnostic).pipe(
        Effect.catchDefect(() => Effect.void)
      )
    )
  )
})

/** Report unexpected persistence reasons, preserving original failure values.
 * By default the identical Cause is returned. Adapters that forward failures to
 * another Auth boundary can mark classified reasons: reported failures and
 * deliberately expected errors must not generate another capture downstream.
 * Later finalizer failures remain unmarked and are reported independently. */
export const reportPersistenceFailure = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  isExpected: (error: E) => boolean,
  options?: { readonly markReported: boolean }
): Effect.Effect<A, E, R> =>
  effect.pipe(
    Effect.catchCause((cause): Effect.Effect<never, E> => {
      const reasons = cause.reasons.filter(
        (reason) => Cause.isDieReason(reason) || (Cause.isFailReason(reason) && !isExpected(reason.error))
      )

      const reported = options?.markReported === true
        ? Cause.fromReasons(
          cause.reasons.map((reason) =>
            Cause.isInterruptReason(reason)
              ? reason
              : reason.annotate(Context.make(AuthFailureReported, true))
          )
        )
        : cause

      if (reasons.length === 0) return Effect.failCause(reported)

      return reportAuthFailure("auth-persistence", Cause.fromReasons(reasons)).pipe(
        Effect.andThen(Effect.failCause(reported))
      )
    })
  )
