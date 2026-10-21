/**
 * Test-only password and session persistence with explicit cryptography services.
 * Production entrypoints do not import this module.
 *
 * @stability unstable
 * @since 4.1.0
 */
import {
  type CommitJournal,
  coordinateCommit,
  hasCommitScope,
  HookConfigurationError,
  LifecycleHooks,
  type PreparedCommit
} from "@effect/auth/Hooks"
import {
  EncodedPasswordHash,
  PasswordCredentialSnapshot,
  PasswordHashing,
  PasswordPersistence,
  PasswordUnavailable,
  snapshotPasswordCredential,
  snapshotPasswordRequirement,
  snapshotPasswordRevision
} from "@effect/auth/Password"
import { hooksLayer, reportPersistenceFailure } from "@effect/auth/Persistence"
import { Email, SubjectId, TokenDigest } from "@effect/auth/Schema"
import {
  assessAuthentication,
  AuthenticationAuthority,
  type AuthenticationRequirement,
  type AuthenticationRevision,
  PendingAuthenticationInvalid,
  SecurityRevision,
  SessionAuthenticationProvenance,
  SessionConflict,
  SessionCredentialVersion,
  SessionId,
  SessionInvalid,
  SessionMetadata,
  SessionUnavailable,
  snapshotAuthenticationEvidence,
  snapshotSessionAuthenticationProvenance,
  StaleAuthentication,
  type StatefulSessionPersistence
} from "@effect/auth/Sessions"
import * as Cause from "effect/Cause"
import * as Clock from "effect/Clock"
import * as Context from "effect/Context"
import * as Digest from "effect/crypto/Digest"
import * as Kdf from "effect/crypto/Kdf"
import * as KdfAdmission from "effect/crypto/KdfAdmission"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Random from "effect/Random"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as Semaphore from "effect/Semaphore"

import { type ClaimsCodec, type Definition, PersistenceConfigurationError } from "./internal/configuration.ts"

/**
 * Schema for an existing subject and a byte-preserving password used to seed test storage.
 *
 * **Details**
 *
 * The supplied PasswordHashing service hashes passwords during layer acquisition. Seeding neither
 * verifies an email address nor exercises registration or screening.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const PasswordSubject = Schema.Struct({
  subjectId: SubjectId,
  email: Email,
  password: Schema.Redacted(Schema.String),
  active: Schema.optionalKey(Schema.Boolean)
})

/**
 * Seed subjects and the application authentication requirement for in-memory password and session
 * storage.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface Options {
  readonly subjects: ReadonlyArray<typeof PasswordSubject.Encoded>
  /** Application policy; no permissive test default. */
  readonly requirement: AuthenticationRequirement
}

const configurationError = (reason: string) => PersistenceConfigurationError.make({ reason })
const unavailable = () => SessionUnavailable.make({})

const isHookConfigurationError = (error: unknown): error is HookConfigurationError =>
  Schema.is(HookConfigurationError)(error)

/**
 * Optional deterministic entropy seed for the test cryptography layer.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface ServicesOptions {
  /** Reproducible test entropy. Omit to use the host's secure randomness. */
  readonly seed?: string | number
}

/**
 * Creates a test layer providing portable password hashing, message digests, and optionally
 * reproducible randomness.
 *
 * **Details**
 *
 * Uses the default password hashing cost and one shared KDF admission owner. Each acquisition restarts
 * a seeded random sequence without changing the caller's Random or Clock service.
 *
 * **Gotchas**
 *
 * Acquisition requires global WebCrypto. Seeded credentials are suitable only for tests. Provide this
 * layer after composing authentication, in-memory persistence, and application claims.
 *
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const services = (options: ServicesOptions = {}) => {
  const { seed } = options

  return Layer.unwrap(
    Effect.gen(function*() {
      const subtle = globalThis.crypto?.subtle

      if (subtle === undefined) {
        return yield* configurationError("Testing.services requires global WebCrypto")
      }

      const entropy = seed === undefined
        ? SecureRandom.layerWebCrypto
        : Layer.effect(
          SecureRandom.SecureRandom,
          Effect.gen(function*() {
            const random = yield* Random.Random.pipe(Random.withSeed(seed))

            return SecureRandom.make((size) => Uint8Array.from({ length: size }, () => random.nextIntUnsafe() & 255))
          })
        )

      const backend = Layer.merge(Kdf.layerPortable, KdfAdmission.layer())

      return PasswordHashing.layer().pipe(
        Layer.provide(backend),
        Layer.provideMerge(Layer.merge(entropy, Digest.layerWebCrypto))
      )
    })
  )
}

/**
 * Creates isolated in-memory persistence for one password sign-in strategy and stateful sessions.
 *
 * **Details**
 *
 * Supports session issuance, verification, renewal, listing, revocation, and sign-out. Acquisitions own
 * separate state, cleared when their scope closes; one layer build shares its state. The captured
 * Effect Clock supports TestClock. Application claims, password hashing, authentication policy, and
 * private credential delivery remain explicit dependencies.
 *
 * **Gotchas**
 *
 * Password management, other strategies, and other session modes fail during acquisition. Pending
 * authentication, handoff, and ambient commits are unsupported. This non-durable store cannot validate
 * a production adapter's concurrency, durability, or crash recovery.
 *
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const layer = <C extends ClaimsCodec, const Id extends string>(
  auth: Definition<C, Id>,
  options: Options
): Layer.Layer<
  | AuthenticationAuthority
  | PasswordPersistence
  | Context.Service.Identifier<Definition<C, Id>["sessions"]["StatefulSessionPersistence"]>
  | Context.Service.Identifier<Definition<C, Id>["sessions"]["SessionRepository"]>,
  PersistenceConfigurationError,
  PasswordHashing
> =>
  Layer.effectContext(
    Effect.gen(function*() {
      const strategies = Object.values(auth.strategies)
      const feature = strategies[0]?.persistence

      if (
        auth.sessionMode !== "stateful" ||
        strategies.length !== 1 ||
        feature?.kind !== "password" ||
        feature.management ||
        feature.lifecycle
      ) {
        return yield* configurationError(
          "Testing.layer supports one sign-in-only Password.make() strategy and stateful sessions"
        )
      }

      const seeds = yield* Schema.decodeEffect(Schema.Array(PasswordSubject))(
        options.subjects
      ).pipe(Effect.mapError(() => configurationError("Invalid in-memory password subjects")))

      const requirement = yield* snapshotPasswordRequirement(options.requirement).pipe(
        Effect.mapError(() => configurationError("Invalid in-memory authentication requirement"))
      )

      const hasher = yield* PasswordHashing
      const clock = yield* Clock.Clock
      const hooks = yield* LifecycleHooks
      const mutex = yield* Semaphore.make(1)
      const claims: Schema.Codec<C["Type"], C["Encoded"]> = auth.claims

      const Session = Schema.Struct({
        ...SessionMetadata.fields,
        claims,
        digest: TokenDigest,
        provenance: SessionAuthenticationProvenance,
        credentialVersion: SessionCredentialVersion
      })

      const Database = Schema.Struct({
        sequence: Schema.Natural,
        subjects: Schema.Array(
          Schema.Struct({ active: Schema.Boolean, credential: PasswordCredentialSnapshot })
        ),
        sessions: Schema.Array(Session)
      })

      type State = { -readonly [K in keyof typeof Database.Type]: (typeof Database.Type)[K] }
      const codec = Schema.fromJsonString(Database)
      const sessionCodec = Schema.fromJsonString(Session)
      const credentialCodec = Schema.fromJsonString(PasswordCredentialSnapshot)
      const initial: State = { sequence: 0, subjects: [], sessions: [] }
      const ids = new Set<string>()
      const emails = new Set<string>()

      for (const seed of seeds) {
        if (ids.has(seed.subjectId) || emails.has(seed.email)) {
          return yield* configurationError("Duplicate in-memory subject ID or email")
        }
        ids.add(seed.subjectId)
        emails.add(seed.email)

        const verifier = yield* reportPersistenceFailure(hasher.hash(seed.password), () => false, {
          markReported: true
        }).pipe(
          Effect.catchCause((cause) =>
            Effect.failCause(
              Cause.map(cause, () => configurationError("Cannot hash in-memory password seed"))
            )
          )
        )

        const credentialId = `password:${seed.subjectId}`

        const credential = yield* Schema.decodeEffect(PasswordCredentialSnapshot)({
          moduleId: feature.moduleId,
          revision: {
            subjectId: seed.subjectId,
            securityRevision: "1",
            credentials: [{ credentialId, revision: "1" }]
          },
          credentialId,
          credentialRevision: "1",
          verifierVersion: "1",
          verifier: Redacted.value(verifier),
          normalization: "none",
          identifier: { namespace: "email", value: seed.email },
          identifierBindingRevision: "1"
        }).pipe(Effect.mapError(() => configurationError("Invalid in-memory password seed")))

        initial.subjects = [...initial.subjects, { active: seed.active ?? true, credential }]
      }

      // Encoded snapshots detach private state from input, output and prepare callbacks.
      let stored: string | undefined = yield* Schema.encodeEffect(codec)(initial).pipe(
        Effect.mapError(() => configurationError("Cannot initialize in-memory storage"))
      )

      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          stored = undefined
        })
      )

      // State and session codecs include application claims. Observe their complete
      // failure before translating Schema errors into the finite persistence port.
      const snapshot = <A>(effect: Effect.Effect<A, Schema.SchemaError>) =>
        reportPersistenceFailure(effect, () => false, { markReported: true }).pipe(
          Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable)))
        )

      const load = Effect.suspend(() =>
        stored === undefined
          ? Effect.fail(unavailable())
          : Schema.decodeEffect(codec)(stored).pipe(snapshot)
      )

      const now = () => clock.currentTimeMillisUnsafe()
      const nextId = (state: State) => `memory-${++state.sequence}`

      const subject = (state: State, id: SubjectId) =>
        state.subjects.find((item) => item.active && item.credential.revision.subjectId === id)

      const current = (state: State, revision: AuthenticationRevision) => {
        const found = subject(state, revision.subjectId)?.credential

        return (
          found !== undefined &&
          found.revision.securityRevision === revision.securityRevision &&
          revision.credentials.length === 1 &&
          revision.credentials[0]?.credentialId === found.credentialId &&
          revision.credentials[0]?.revision === found.credentialRevision
        )
      }

      const live = (state: State, session: typeof Session.Type, time: number) =>
        subject(state, session.subjectId)?.credential.revision.securityRevision ===
          session.securityRevision &&
        time >= DateTime.toEpochMillis(session.issuedAt) &&
        time <
          Math.min(
            DateTime.toEpochMillis(session.expiresAt),
            DateTime.toEpochMillis(session.absoluteExpiresAt)
          )

      const standalone = Effect.gen(function*() {
        if (yield* hasCommitScope) return yield* unavailable()
      })

      const read = <A, E>(body: (state: State, time: number) => Effect.Effect<A, E>) =>
        standalone.pipe(
          Effect.andThen(mutex.withPermits(1)(Effect.flatMap(load, (state) => body(state, now()))))
        )

      // One local owner: failed/interrupted preparation never publishes its draft.
      // Hooks dispatch outside the mutex, after publishing; failed delivery never rolls back.
      const transaction = <A, E>(
        body: (
          state: State,
          journal: CommitJournal,
          time: number
        ) => Effect.Effect<{ readonly receipt: PreparedCommit<A>; readonly deadline?: number }, E>
      ) =>
        standalone.pipe(
          Effect.andThen(
            coordinateCommit((journal) =>
              mutex.withPermits(1)(
                Effect.uninterruptibleMask((restore) =>
                  Effect.gen(function*() {
                    const { receipt, deadline, time, encoded } = yield* restore(
                      Effect.gen(function*() {
                        const state = yield* load
                        const time = now()
                        const { receipt, deadline = Infinity } = yield* body(state, journal, time)

                        const encoded = yield* Schema.encodeEffect(codec)(state).pipe(snapshot)

                        const status = yield* Effect.exit(receipt.read)

                        if (status._tag === "Success") return yield* unavailable()
                        if (
                          status.cause.reasons.length === 0 ||
                          !status.cause.reasons.every(
                            (reason) => Cause.isFailReason(reason) && reason.error._tag === "CommitPending"
                          )
                        ) {
                          return yield* Effect.failCause(Cause.map(status.cause, unavailable))
                        }

                        return { receipt, deadline, time, encoded }
                      })
                    )

                    // Publication and the owner's return form one uninterruptible commit.
                    const finalTime = now()

                    if (stored === undefined || finalTime < time || finalTime >= deadline) {
                      return yield* unavailable()
                    }
                    stored = encoded

                    return receipt
                  })
                )
              )
            )
          ),
          Effect.map((result) => result.value),
          Effect.catchCause((cause) =>
            Effect.failCause(
              Cause.map(
                cause,
                (error: E | HookConfigurationError | SessionUnavailable): E | SessionUnavailable =>
                  isHookConfigurationError(error) ? unavailable() : error
              )
            )
          ),
          Effect.provideService(LifecycleHooks, hooks)
        )

      const authority = AuthenticationAuthority.of({
        capture: (id, anchors) =>
          read((state) =>
            Effect.gen(function*() {
              const found = subject(state, id)?.credential

              if (
                found === undefined ||
                new Set(anchors).size !== anchors.length ||
                anchors.some((anchor) => anchor !== found.credentialId)
              ) {
                return yield* StaleAuthentication.make({})
              }

              return { revision: snapshotPasswordRevision(found.revision), requirement }
            })
          ),
        requirements: (evidence) =>
          read((state) =>
            Effect.gen(function*() {
              const captured = yield* snapshotAuthenticationEvidence(evidence)

              if (!current(state, captured.revision)) return yield* StaleAuthentication.make({})

              return requirement
            })
          ),
        // Signed sessions are deliberately outside this helper's coverage.
        approve: () => Effect.fail(unavailable())
      })

      const sessions: StatefulSessionPersistence<C["Type"]> = {
        establish: (input, prepare) =>
          transaction((state, journal, time) =>
            Effect.gen(function*() {
              if (input.pending !== undefined) return yield* PendingAuthenticationInvalid.make({})
              if (input.handoffSourceSessionId !== undefined) return yield* unavailable()
              const evidence = yield* snapshotAuthenticationEvidence(input.evidence)

              if (
                !current(state, evidence.revision) ||
                evidence.proofs.length !== 1 ||
                input.session.subjectId !== evidence.revision.subjectId ||
                input.session.securityRevision !== evidence.revision.securityRevision
              ) {
                return yield* StaleAuthentication.make({})
              }

              const assessed = yield* assessAuthentication(
                evidence,
                requirement,
                DateTime.makeUnsafe(time)
              ).pipe(Effect.catchTag("SessionConfigurationError", unavailable))

              const expires = DateTime.toEpochMillis(input.session.expiresAt)
              const absolute = DateTime.toEpochMillis(input.session.absoluteExpiresAt)

              const deadline = Math.min(
                expires,
                DateTime.toEpochMillis(evidence.proofs[0].verifiedAt) +
                  requirement.maximumAgeMillis
              )

              if (!assessed.satisfied || time >= deadline || expires > absolute) {
                return yield* StaleAuthentication.make({})
              }
              if (state.sessions.some((row) => row.digest === input.session.digest)) {
                return yield* SessionConflict.make({})
              }

              const row = {
                ...input.session,
                sessionId: SessionId.make(nextId(state)),
                issuedAt: DateTime.makeUnsafe(time),
                assurance: assessed.assurance,
                provenance: yield* snapshotSessionAuthenticationProvenance({ evidence })
              }

              const encoded = yield* Schema.encodeEffect(sessionCodec)(row).pipe(snapshot)

              const saved = yield* Schema.decodeEffect(sessionCodec)(encoded).pipe(snapshot)

              state.sessions = [...state.sessions, saved]

              return { receipt: prepare(row, journal), deadline }
            })
          ),
        verify: ({ digest }) =>
          read((state, time) => {
            const row = state.sessions.find((session) => session.digest === digest)

            return row !== undefined && live(state, row, time)
              ? Effect.succeed(row)
              : Effect.fail(SessionInvalid.make({}))
          }),
        rotate: (input, prepare) =>
          transaction((state, journal, time) =>
            Effect.gen(function*() {
              const row = state.sessions.find((session) => session.digest === input.record.digest)
              const expires = DateTime.toEpochMillis(input.nextExpiresAt)

              if (
                row === undefined ||
                !live(state, row, time) ||
                input.nextCredentialVersion === row.credentialVersion ||
                expires <= time ||
                expires > DateTime.toEpochMillis(row.absoluteExpiresAt) ||
                state.sessions.some((session) => session.digest === input.nextDigest)
              ) {
                return yield* SessionConflict.make({})
              }

              const expected = yield* Schema.encodeEffect(sessionCodec)(input.record).pipe(
                snapshot
              )

              const actual = yield* Schema.encodeEffect(sessionCodec)(row).pipe(snapshot)

              if (expected !== actual) return yield* SessionConflict.make({})

              const next = {
                ...row,
                digest: input.nextDigest,
                credentialVersion: input.nextCredentialVersion,
                issuedAt: DateTime.makeUnsafe(time),
                expiresAt: input.nextExpiresAt
              }

              const encoded = yield* Schema.encodeEffect(sessionCodec)(next).pipe(snapshot)

              const saved = yield* Schema.decodeEffect(sessionCodec)(encoded).pipe(snapshot)

              state.sessions = state.sessions.map((session) => session.digest === row.digest ? saved : session)

              return {
                receipt: prepare(next, journal),
                deadline: Math.min(
                  expires,
                  DateTime.toEpochMillis(row.expiresAt),
                  DateTime.toEpochMillis(row.absoluteExpiresAt)
                )
              }
            })
          ),
        revokeDigest: (digest, prepare) =>
          transaction((state, journal) =>
            Effect.sync(() => {
              const found = state.sessions.some((row) => row.digest === digest)

              state.sessions = state.sessions.filter((row) => row.digest !== digest)

              return { receipt: prepare(found, journal) }
            })
          ),
        revoke: (input, prepare) =>
          transaction((state, journal) =>
            Effect.sync(() => {
              state.sessions = state.sessions.filter(
                (row) => row.subjectId !== input.subjectId || row.sessionId !== input.sessionId
              )

              return { receipt: prepare(undefined, journal) }
            })
          ),
        revokeAll: (input, prepare) =>
          transaction((state, journal) =>
            Effect.gen(function*() {
              const found = subject(state, input.subjectId)

              if (found?.credential.revision.securityRevision !== input.expectedSecurityRevision) {
                return yield* StaleAuthentication.make({})
              }

              const credential = yield* snapshotPasswordCredential({
                ...found.credential,
                revision: {
                  ...found.credential.revision,
                  securityRevision: SecurityRevision.make(nextId(state))
                }
              }).pipe(Effect.mapError(unavailable))

              state.subjects = state.subjects.map((item) => item === found ? { ...item, credential } : item)

              return { receipt: prepare(undefined, journal) }
            })
          )
      }

      const unsupported = () => Effect.fail(PasswordUnavailable.make({}))

      const passwords = PasswordPersistence.of({
        findCredential: (input) =>
          read((state) =>
            Effect.gen(function*() {
              if (input.moduleId !== feature.moduleId) return yield* PasswordUnavailable.make({})

              const found = state.subjects.find(
                ({ active, credential }) =>
                  active &&
                  credential.identifier.namespace === input.identifier.namespace &&
                  credential.identifier.value === input.identifier.value &&
                  (input.subjectId === undefined ||
                    credential.revision.subjectId === input.subjectId)
              )

              return found === undefined
                ? Option.none()
                : Option.some(yield* snapshotPasswordCredential(found.credential))
            })
          ).pipe(
            Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => PasswordUnavailable.make({}))))
          ),
        rehashIfCurrent: (input) =>
          transaction((state, journal) =>
            Effect.gen(function*() {
              const captured = yield* snapshotPasswordCredential(input.credential)

              const nextVerifier = yield* Schema.decodeEffect(EncodedPasswordHash)(
                Redacted.value(input.nextVerifier)
              )

              const found = subject(state, captured.revision.subjectId)

              if (
                found !== undefined &&
                captured.moduleId === feature.moduleId &&
                (yield* Schema.encodeEffect(credentialCodec)(found.credential)) ===
                  (yield* Schema.encodeEffect(credentialCodec)(captured))
              ) {
                const credential = yield* snapshotPasswordCredential({
                  ...found.credential,
                  verifier: Redacted.make(nextVerifier),
                  verifierVersion: SecurityRevision.make(nextId(state))
                })

                state.subjects = state.subjects.map((item) => item === found ? { ...item, credential } : item)
              }

              return { receipt: journal.prepare(undefined) }
            })
          ).pipe(
            Effect.flatMap((receipt) => receipt.read),
            Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => PasswordUnavailable.make({}))))
          ),
        readForSubject: unsupported,
        recoveryTarget: unsupported,
        addIfAbsent: unsupported,
        replaceIfCurrent: unsupported,
        resetWithProof: unsupported
      })

      return Context.make(AuthenticationAuthority, authority).pipe(
        Context.add(PasswordPersistence, passwords),
        Context.add(auth.sessions.StatefulSessionPersistence, sessions),
        Context.add(auth.sessions.SessionRepository, {
          list: (input) =>
            read((state, time) =>
              Effect.gen(function*() {
                const limit = yield* Schema.decodeEffect(
                  Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 1000 }))
                )(input.limit).pipe(Effect.mapError(unavailable))

                const cursor = input.cursor === undefined
                  ? undefined
                  : yield* Schema.decodeEffect(SessionId)(input.cursor).pipe(
                    Effect.mapError(unavailable)
                  )

                const rows = state.sessions
                  .filter(
                    (row) =>
                      row.subjectId === input.subjectId &&
                      live(state, row, time) &&
                      (cursor === undefined || row.sessionId > cursor)
                  )
                  .sort((left, right) =>
                    left.sessionId < right.sessionId
                      ? -1
                      : left.sessionId > right.sessionId
                      ? 1
                      : 0
                  )

                const page = rows.slice(0, limit)

                const metadata = yield* Effect.forEach(page, (row) =>
                  Schema.decodeEffect(Schema.toType(SessionMetadata))(row)).pipe(Effect.mapError(unavailable))

                const nextCursor = rows.length > limit ? page.at(-1)?.sessionId : undefined

                return { sessions: metadata, ...(nextCursor === undefined ? {} : { nextCursor }) }
              })
            )
        })
      )
    })
  ).pipe(Layer.provide(hooksLayer))
