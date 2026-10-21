import * as SecureRandom from "effect/crypto/SecureRandom"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import type * as Redacted from "effect/Redacted"

import type { Email, SubjectId } from "../../../Schema.ts"
import { LifecycleHooks } from "../../hooks/lifecycleHooks.ts"
import { lifecycleEventEffect, LifecycleEventId, lifecycleSnapshotEffect } from "../../hooks/models.ts"
import type { LoginIdentifier } from "../../identity/models.ts"
import { NewPasswordCheck } from "../newPasswordCheck.ts"
import { PasswordHashing } from "../passwordHashing.ts"
import type { PasswordMethodPolicy } from "./policy.ts"
import {
  makePasswordVerification,
  passwordHashingDiagnostics,
  passwordUnexpected as unexpected
} from "./verification.ts"

/**
 * Preserve the current-password proof instant before new-password hashing.
 *
 * @internal
 */
export const makePasswordPreparation = ({
  moduleId,
  policy
}: {
  readonly moduleId: string
  readonly policy: PasswordMethodPolicy
}) => {
  const { digest, identifier, verifyPassword } = makePasswordVerification({ moduleId, policy })

  const newReplacement = Effect.fn("Passwords.newReplacement")(function*(
    password: Redacted.Redacted<string>,
    email?: Email
  ) {
    const checker = yield* NewPasswordCheck
    const hasher = yield* PasswordHashing

    const checked = yield* checker.check(password, {
      serviceName: moduleId,
      ...(email === undefined ? {} : { accountName: email })
    })

    return {
      normalization: checked.normalization,
      verifier: yield* unexpected(hasher.hash(checked.password).pipe(passwordHashingDiagnostics))
    }
  })

  const event = Effect.fn("Passwords.event")(function*(
    action: "registration" | "credential-change",
    id: LoginIdentifier,
    subjectId?: SubjectId
  ) {
    const hooks = yield* LifecycleHooks
    const random = yield* SecureRandom.SecureRandom

    const snapshot = yield* lifecycleSnapshotEffect({
      action,
      operation: `${moduleId}/${action}`,
      method: "password",
      identifiers: [id],
      ...(subjectId === undefined ? {} : { subjectId })
    }).pipe(Effect.orDie)

    yield* hooks.before(snapshot)
    const idBytes = yield* unexpected(random.randomBytes(32))

    return yield* lifecycleEventEffect({
      id: LifecycleEventId.make(Base64Url.encode(idBytes)),
      occurredAtMillis: DateTime.toEpochMillis(yield* DateTime.now),
      snapshot
    }).pipe(Effect.orDie)
  })

  return { digest, identifier, newReplacement, event, verifyPassword }
}
