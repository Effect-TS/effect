import type { LifecycleHooks } from "@effect/auth/Hooks"
import { PasswordUnavailable } from "@effect/auth/Password"
import { reportPersistenceFailure } from "@effect/auth/Persistence"
import { SecurityRevision } from "@effect/auth/Sessions"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Digest from "effect/crypto/Digest"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import { SqlClient } from "effect/sql/SqlClient"

import { PersistenceConfigurationError, type SubjectProvisioning } from "./configuration.ts"
import { randomId } from "./crypto.ts"
import type { AnyPasswordPersistenceMapping } from "./models/passwordModel.ts"
import type { NativeSqlTables } from "./nativeSqlTable.ts"
import { makeNativePasswordRegistrationStore, PasswordIdentifierTaken } from "./passwordRegistrationNative.ts"
import type { PasswordRegistrationAuthority } from "./registrationContract.ts"
import { CurrentSqlCommit, makeSqlCommitExecutor, SqlBatchCommit } from "./sqlCommit.ts"

const SubjectValues = Schema.Record(Schema.String, Schema.Unknown)

/**
 * Application provisioning and the unverified identifier/password binding share
 * one physical owner. Identifier uniqueness arbitrates registration; correlation
 * request IDs never become a retained credential-issuance receipt.
 *
 * @internal
 */
export const makeRegistrationAuthority = Effect.fnUntraced(function*<R>(
  tables: NativeSqlTables,
  mapping: AnyPasswordPersistenceMapping,
  provisioning: Context.Key<R, object>,
  strategy: string
): Effect.fn.Return<
  PasswordRegistrationAuthority<unknown>,
  PersistenceConfigurationError,
  LifecycleHooks | SqlClient | Digest.Digest | SecureRandom.SecureRandom | SqlBatchCommit | R
> {
  const sql = (yield* SqlClient).withoutTransforms()
  const cryptoServices = Context.make(SecureRandom.SecureRandom, yield* SecureRandom.SecureRandom).pipe(
    Context.add(Digest.Digest, yield* Digest.Digest)
  )
  const executor = yield* makeSqlCommitExecutor(() => PasswordUnavailable.make({}))
  const parent = yield* Effect.serviceOption(CurrentSqlCommit)
  const batch = yield* SqlBatchCommit
  const store = yield* makeNativePasswordRegistrationStore(tables, mapping, batch !== undefined)
  // The strategy has already decoded its registration Schema. Only its callback
  // signature is erased by the heterogeneous strategy service map.
  const creators = (yield* provisioning) as Readonly<Record<string, SubjectProvisioning<unknown>>>
  const createSubject = creators[strategy]

  if (createSubject === undefined) {
    return yield* PersistenceConfigurationError.make({
      reason: `Missing subject provisioning for ${strategy}`
    })
  }
  if (batch !== undefined && Predicate.isFunction(createSubject)) {
    return yield* PersistenceConfigurationError.make({
      reason:
        `D1 subject provisioning for ${strategy} requires { values }; return the new subject row instead of inserting it`
    })
  }
  const s = mapping.subject
  const subject = tables(s.table)
  const lock = sql.onDialectOrElse({ sqlite: () => sql``, orElse: () => sql`for update` })

  const run = <A, E, R2>(work: Effect.Effect<A, E, R2>, suppressed: Effect.Effect<A, E, R2>) =>
    batch !== undefined
      ? executor.batch(work).pipe(Effect.provideService(SqlBatchCommit, batch))
      : Option.isSome(parent)
      ? executor.run(work)
      : executor
        .operation(
          reportPersistenceFailure(
            work,
            (error) => error instanceof PasswordIdentifierTaken || Schema.is(PasswordUnavailable)(error),
            { markReported: true }
          ).pipe(
            Effect.catchCause((cause) =>
              Effect.failCause(
                Cause.map(cause, (error) =>
                  error instanceof PasswordIdentifierTaken
                    ? error
                    : PasswordUnavailable.make({}))
              )
            )
          )
        )
        .pipe(
          Effect.catchCause((cause) =>
            cause.reasons.length > 0 &&
              cause.reasons.every(
                (reason) => Cause.isFailReason(reason) && reason.error instanceof PasswordIdentifierTaken
              )
              ? executor.run(suppressed, "statement")
              : Effect.failCause(cause)
          ),
          Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => PasswordUnavailable.make({}))))
        )

  return {
    register: (input, project) =>
      executor.read(store.available(input.identifier)).pipe(
        Effect.flatMap((existing) =>
          existing.length !== 0
            ? executor.run(store.prepare({ _tag: "Suppressed" }, project), "statement")
            : run(
              Effect.gen(function*() {
                const provisioningInput = {
                  requestId: input.requestId,
                  identifier: input.identifier,
                  registration: input.registration
                }

                const row = yield* Effect.gen(function*() {
                  if (!Predicate.isFunction(createSubject)) {
                    return yield* createSubject
                      .values(provisioningInput)
                      .pipe(Effect.flatMap(Schema.decodeEffect(SubjectValues)))
                  }
                  const subjectId = yield* createSubject(provisioningInput)
                  const nativeId = yield* mapping.subjectId.toNative(subjectId)

                  const rows = yield* sql`select ${
                    subject.fields("registration_subject_")
                  } from ${subject.name} where ${subject.column(s.id)} = ${
                    subject.value(s.id, nativeId)
                  } limit 2 ${lock}`

                  if (rows.length !== 1) return yield* PasswordUnavailable.make({})

                  return subject.decode(rows[0]!, "registration_subject_")
                })

                if (!s.isActiveStatus(row[s.status])) return yield* PasswordUnavailable.make({})
                const subjectId = yield* mapping.subjectId.toSubject(row[s.id])

                const securityRevision = yield* Schema.decodeUnknownEffect(SecurityRevision)(
                  row[s.securityRevision]
                )

                if (!Predicate.isFunction(createSubject)) {
                  yield* store.stage(sql`${subject.insert(row)}`)
                }

                const identifierRevision = SecurityRevision.make(yield* randomId)
                const credentialId = yield* randomId
                const credentialRevision = SecurityRevision.make(yield* randomId)
                const verifierVersion = SecurityRevision.make(yield* randomId)

                yield* store.bind({
                  ...input,
                  subjectId,
                  securityRevision,
                  identifierRevision,
                  credentialId,
                  credentialRevision,
                  verifierVersion
                })

                return yield* store.prepare({ _tag: "Created", subjectId }, project)
              }).pipe(Effect.provideContext(cryptoServices)),
              store.prepare({ _tag: "Suppressed" }, project)
            )
        )
      )
  }
})
