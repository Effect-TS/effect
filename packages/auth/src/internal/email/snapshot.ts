import * as Array from "effect/Array"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

import { LoginIdentifier } from "../identity/models.ts"
import { AuthenticationRequirement, type AuthenticationRevision } from "../sessions/models.ts"
import { EmailUnavailable } from "./errors.ts"
import { EmailCredentialSnapshot } from "./models.ts"

export const snapshotEmailRevision = (value: AuthenticationRevision): AuthenticationRevision =>
  Object.freeze({
    subjectId: value.subjectId,
    securityRevision: value.securityRevision,
    credentials: Object.freeze(
      value.credentials.map((item) => Object.freeze({ credentialId: item.credentialId, revision: item.revision }))
    )
  })

const codec = Schema.toCodecIso(EmailCredentialSnapshot)

export const snapshotEmailCredential = Effect.fnUntraced(function*(
  input: EmailCredentialSnapshot
) {
  const value = yield* Schema.encodeEffect(codec)(input).pipe(
    Effect.flatMap(Schema.decodeEffect(codec)),
    Effect.mapError(() => EmailUnavailable.make({}))
  )

  return Object.freeze({
    ...value,
    identifier: Object.freeze(LoginIdentifier.make(value.identifier)),
    revision: snapshotEmailRevision(value.revision),
    requirement: yield* snapshotEmailRequirement(value.requirement)
  })
})

export const snapshotEmailRequirement = Effect.fnUntraced(function*(
  input: AuthenticationRequirement
) {
  const value = yield* Schema.decodeEffect(AuthenticationRequirement)(input).pipe(
    Effect.mapError(() => EmailUnavailable.make({}))
  )

  return Object.freeze({
    ...value,
    alternatives: Object.freeze(
      Array.map(value.alternatives, (item) => Object.freeze({ ...item, factors: Object.freeze([...item.factors]) }))
    )
  })
})
