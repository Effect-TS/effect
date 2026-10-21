import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"

import type { SubjectId } from "../../Schema.ts"
import type { ExternalIdentity, IdentityConflict, IdentityUnavailable } from "./models.ts"

/**
 * Binds a provider subject to an application subject. The authoritative store
 * enforces uniqueness of the full provider, issuer and external-subject tuple.
 */
export class ExternalIdentityMutation extends Context.Service<
  ExternalIdentityMutation,
  {
    readonly bind: (
      subjectId: SubjectId,
      identity: ExternalIdentity
    ) => Effect.Effect<void, IdentityConflict | IdentityUnavailable>
  }
>()("@effect/auth/ExternalIdentityMutation") {}
