import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"

import { SubjectId } from "../../Schema.ts"
import { type AssuranceRequirement, requireAssurance, requireAuthenticated } from "../operations/context.ts"
import { makeOperation } from "../operations/operation.ts"
import { IdentityMutation } from "./identityMutation.ts"
import { IdentityRepository } from "./identityRepository.ts"
import {
  CredentialId,
  CredentialSummary,
  IdentifierBinding,
  IdentityConflict,
  IdentityUnavailable,
  LastSignInMethod,
  LoginIdentifier,
  SubjectInactive,
  SubjectSnapshot
} from "./models.ts"
import { InvalidationUnsupported, SubjectCleanupResult, SubjectLifecycle } from "./subjectLifecycle.ts"

const activeSubject = Effect.fnUntraced(function*(
  subjectId: SubjectId
) {
  const repository = yield* IdentityRepository
  const subject = yield* repository.findSubject(subjectId)

  if (Option.isNone(subject) || subject.value.status !== "active") {
    return yield* SubjectInactive.make()
  }

  return subject.value
})

export const InspectIdentity = makeOperation("identity.inspect", {
  payload: Schema.Void,
  success: SubjectSnapshot,
  error: Schema.Union([SubjectInactive, IdentityUnavailable]),
  access: "authenticated",
  exposure: "public",
  replay: "read-only"
})

export const ListIdentifiers = makeOperation("identity.listIdentifiers", {
  payload: Schema.Void,
  success: Schema.Array(IdentifierBinding),
  error: Schema.Union([SubjectInactive, IdentityUnavailable]),
  access: "authenticated",
  exposure: "public",
  replay: "read-only"
})

export const ListCredentials = makeOperation("identity.listCredentials", {
  payload: Schema.Void,
  success: Schema.Array(CredentialSummary),
  error: Schema.Union([SubjectInactive, IdentityUnavailable]),
  access: "authenticated",
  exposure: "public",
  replay: "read-only"
})

export const identityQueryLayer = Layer.mergeAll(
  InspectIdentity.handlerLayer(
    Effect.fn("IdentityOperations.inspect")(function*(_, context) {
      const caller = yield* requireAuthenticated(context)

      return yield* activeSubject(caller.subjectId)
    })
  ),
  ListIdentifiers.handlerLayer(
    Effect.fn("IdentityOperations.listIdentifiers")(function*(_, context) {
      const caller = yield* requireAuthenticated(context)
      const repository = yield* IdentityRepository

      yield* activeSubject(caller.subjectId)

      return yield* repository.listIdentifiers(caller.subjectId)
    })
  ),
  ListCredentials.handlerLayer(
    Effect.fn("IdentityOperations.listCredentials")(function*(_, context) {
      const caller = yield* requireAuthenticated(context)
      const repository = yield* IdentityRepository

      yield* activeSubject(caller.subjectId)

      return yield* repository.listCredentials(caller.subjectId)
    })
  )
)

/** Configure the method/factor policy at the consumer's Layer composition boundary. */
export const makeIdentityChanges = (assurance: AssuranceRequirement) => {
  const RemoveIdentifier = makeOperation("identity.removeIdentifier", {
    payload: Schema.Struct({ identifier: LoginIdentifier }),
    success: Schema.Void,
    error: Schema.Union([IdentityConflict, LastSignInMethod, SubjectInactive, IdentityUnavailable]),
    access: "authenticated",
    exposure: "public",
    replay: "non-idempotent",
    authorize: (_, context) => requireAssurance(context, assurance).pipe(Effect.asVoid)
  })

  const RemoveCredential = makeOperation("identity.removeCredential", {
    payload: Schema.Struct({ credentialId: CredentialId }),
    success: Schema.Void,
    error: Schema.Union([IdentityConflict, LastSignInMethod, SubjectInactive, IdentityUnavailable]),
    access: "authenticated",
    exposure: "public",
    replay: "non-idempotent",
    authorize: (_, context) => requireAssurance(context, assurance).pipe(Effect.asVoid)
  })

  const layer = Layer.mergeAll(
    RemoveIdentifier.handlerLayer(
      Effect.fn("IdentityOperations.removeIdentifier")(function*(payload, context) {
        const caller = yield* requireAuthenticated(context)
        const mutation = yield* IdentityMutation

        yield* mutation.removeIdentifier(caller.subjectId, payload.identifier)
      })
    ),
    RemoveCredential.handlerLayer(
      Effect.fn("IdentityOperations.removeCredential")(function*(payload, context) {
        const caller = yield* requireAuthenticated(context)
        const mutation = yield* IdentityMutation

        yield* mutation.removeCredential(caller.subjectId, payload.credentialId)
      })
    )
  )

  return { RemoveIdentifier, RemoveCredential, layer } as const
}

const terminationPayload = Schema.Struct({
  subjectId: SubjectId,
  requestId: Schema.NonEmptyString,
  invalidation: Schema.Literals(["immediate", "allow-expiry"])
})

/** System operations have contracts without being implicitly network-exposed. */
export const DisableSubject = makeOperation("identity.disableSubject", {
  payload: terminationPayload,
  success: SubjectCleanupResult,
  error: Schema.Union([InvalidationUnsupported, IdentityUnavailable]),
  access: "system",
  replay: "idempotent"
})

export const DeleteSubject = makeOperation("identity.deleteSubject", {
  payload: terminationPayload,
  success: SubjectCleanupResult,
  error: Schema.Union([InvalidationUnsupported, IdentityUnavailable]),
  access: "system",
  replay: "idempotent"
})

/** Install only when the application supports account termination. */
export const subjectLifecycleLayer = Layer.mergeAll(
  DisableSubject.handlerLayer(
    Effect.fn("IdentityOperations.disableSubject")(function*(payload) {
      const lifecycle = yield* SubjectLifecycle

      return yield* lifecycle.disable(payload)
    })
  ),
  DeleteSubject.handlerLayer(
    Effect.fn("IdentityOperations.deleteSubject")(function*(payload) {
      const lifecycle = yield* SubjectLifecycle

      return yield* lifecycle.delete(payload)
    })
  )
)
