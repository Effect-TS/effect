import type { SubjectId } from "../../Schema.ts"
import { LoginIdentifier } from "../identity/models.ts"
import type { ProofBinding, ProofPurpose } from "./models.ts"

/** Structured composite keys. Every dimension is independent of flow, context, request, and proof IDs. */
export interface ProofAbuseScope {
  readonly moduleId: string
  readonly purpose: ProofPurpose
  readonly identifier: LoginIdentifier
  readonly subjectId?: SubjectId
}

export const proofAbuseScope = (
  moduleId: string,
  purpose: ProofPurpose,
  binding: ProofBinding
): ProofAbuseScope =>
  Object.freeze({
    moduleId,
    purpose,
    identifier: Object.freeze(LoginIdentifier.make(binding.identifier)),
    ...(binding._tag === "Identifier" ? {} : { subjectId: binding.revision.subjectId })
  })
