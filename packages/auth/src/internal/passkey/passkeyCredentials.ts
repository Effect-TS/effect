import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"

import type { SubjectId } from "../../Schema.ts"
import type { PasskeyUnavailable } from "./errors.ts"
import type { PasskeyCredential, PasskeyEnrollmentSnapshot, PasskeyProtocolCredentialId } from "./models.ts"

/** Minimum read capability. The tuple is RP-global across module/profile aliases;
 * protocol ID and opaque handle never become application subject identifiers.
 * Returns an advisory snapshot; mutation persistence rechecks live authority. */
export class PasskeyCredentials extends Context.Service<
  PasskeyCredentials,
  {
    /** Active subject, all factor revisions and same-RP exclusions in one read.
     * A first enrollment proposes a random handle; only its credential owns it. */
    readonly listForSubject: (input: {
      readonly moduleId: string
      readonly rpId: string
      readonly subjectId: SubjectId
    }) => Effect.Effect<PasskeyEnrollmentSnapshot | undefined, PasskeyUnavailable>
    readonly lookup: (input: {
      readonly rpId: string
      readonly protocolCredentialId: PasskeyProtocolCredentialId
    }) => Effect.Effect<PasskeyCredential | undefined, PasskeyUnavailable>
  }
>()("@effect/auth/PasskeyCredentials") {}
