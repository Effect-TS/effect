import * as Predicate from "effect/Predicate"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"

import { PersistenceMappingError } from "./mappingError.ts"

// These are mapping contracts, not a parser for arbitrary constraint declarations.
// Role aliases are explicit because their documentation names differ from mapping fields.
const uniquePlans: Readonly<Record<string, readonly [string, ReadonlyArray<string>]>> = {
  "unique(authority.subjectId,authority.credentialId)": [
    "authority",
    ["subjectId", "credentialId"]
  ],
  "unique(authorityCredential.subjectId,authorityCredential.credentialId)": [
    "authorityCredential",
    ["subjectId", "credentialId"]
  ],
  "unique(connectedGrant.moduleId,connectedGrant.grantId)": ["grant", ["moduleId", "grantId"]],
  "unique(connectedGrant.moduleId,connectedGrant.subjectId,connectedGrant.profileKey,connectedGrant.identityKey)": [
    "grant",
    ["moduleId", "subjectId", "profileKey", "identityKey"]
  ],
  "unique(connectedRevocation.jobId)": ["job", ["jobId"]],
  "unique(credential.credentialId)": ["credential", ["credentialId"]],
  "unique(credential.identityKey)": ["credential", ["identityKey"]],
  "unique(credential.moduleId,credential.credentialId)": [
    "credential",
    ["moduleId", "credentialId"]
  ],
  "unique(credential.moduleId,credential.subjectId)": ["credential", ["moduleId", "subjectId"]],
  "unique(emailCredential.moduleId,emailCredential.credentialId)": [
    "credential",
    ["moduleId", "credentialId"]
  ],
  "unique(emailCredential.moduleId,emailCredential.identifierNamespace,emailCredential.identifierValue)": [
    "credential",
    ["moduleId", "identifierNamespace", "identifierValue"]
  ],
  "unique(flow.moduleId,flow.flowId)": ["flow", ["moduleId", "flowId"]],
  "unique(flow.stateDigest)": ["flow", ["stateDigest"]],
  "unique(identifier.namespace,identifier.value)": ["identifier", ["namespace", "value"]],
  "unique(intent.moduleId,intent.flowId)": ["intent", ["moduleId", "flowId"]],
  "unique(intent.moduleId,intent.reference)": ["intent", ["moduleId", "reference"]],
  "unique(ownership.identityKey)": ["ownership", ["identityKey"]],
  "unique(proof.moduleId,proof.purpose,proof.seriesKey)": [
    "proof",
    ["moduleId", "purpose", "seriesKey"]
  ],
  "unique(proof.moduleId,proof.proofId)": ["proof", ["moduleId", "proofId"]],
  "unique(pending.digest)": ["pending", ["digest"]],
  "unique(session.digest)": ["session", ["digest"]],
  "unique(tombstone.moduleId,tombstone.subjectId,tombstone.sessionId)": [
    "tombstone",
    ["moduleId", "subjectId", "sessionId"]
  ]
}

const arrayRoles: Readonly<Record<string, string>> = {
  credentialId: "credential",
  credentialKey: "credential",
  factor: "authority",
  flow: "flow"
}

const nestedMappings = [
  "read",
  "signIn",
  "password",
  "proof",
  "proofs",
  "revocation",
  "pending",
  "session",
  "source"
]

const constraintGroups = ["constraints"]

const MappingRecord = Schema.Record(Schema.String, Schema.Unknown)
const record = Schema.decodeUnknownResult(MappingRecord)

const failure = (cause: string) => Result.fail(PersistenceMappingError.make({ operation: "mapping", cause }))

/** Capture mapping getters and adapter column metadata together, without scheduler suspension. */
export const storageKeyPlans = (
  input: unknown,
  columnsFor: (
    table: object
  ) => Result.Result<Readonly<Record<string, unknown>>, PersistenceMappingError>
): Result.Result<
  Array<{ readonly table: object; readonly keys: ReadonlyArray<string> }>,
  PersistenceMappingError | Schema.SchemaError
> =>
  Result.gen(function*() {
    const mapping = yield* record(input)
    const result: Array<{ readonly table: object; readonly keys: ReadonlyArray<string> }> = []

    for (const group of constraintGroups) {
      if (mapping[group] === undefined) continue
      for (const [name, declaration] of Object.entries(yield* record(mapping[group]))) {
        if (declaration === "notNull(provisioningRequest.subjectId)") continue
        let role: string
        let keys: ReadonlyArray<string>

        if (Predicate.isString(declaration)) {
          const plan = uniquePlans[declaration]

          if (plan !== undefined) [role, keys] = plan
          else if (declaration === "unique(id)") {
            role = "subject"
            keys = ["id"]
          } else if (declaration === "unique(scope)") {
            role = name
            keys = ["scope"]
          } else if (declaration === "unique(credentialId)") {
            role = "credential"
            keys = ["id"]
          } else if (declaration === "unique(namespace,value)") {
            role = "identifier"
            keys = ["namespace", "value"]
          } else if (declaration === "unique(provider,issuer,subject)") {
            role = "externalIdentity"
            keys = ["provider", "issuer", "subject"]
          } else if (declaration === "unique(requestId)") {
            role = "provisioningRequest"
            keys = ["requestId"]
          } else return yield* failure("Unknown storage constraint")
        } else if (Array.isArray(declaration) && declaration.every(Predicate.isString)) {
          const mappedRole = arrayRoles[name]

          if (mappedRole === undefined) return yield* failure("Unknown storage constraint")
          role = mappedRole
          keys = declaration
        } else return yield* failure("Invalid storage constraint")

        let target: unknown = mapping

        for (const segment of role.split(".")) target = (yield* record(target))[segment]
        // Session authority places its pending tables in one nested mapping.
        if (target === undefined && Schema.is(MappingRecord)(mapping.pending)) {
          target = mapping.pending[role]
        }
        let mapped = yield* record(target)

        if (role === "pending" && mapped.table === undefined) {
          mapped = yield* record(mapped.pending)
        }
        if (!Predicate.isObject(mapped.table)) return yield* failure("Missing storage table")
        const columns = yield* columnsFor(mapped.table)

        const table = mapped.table
        const physicalKeys: Array<string> = []

        for (const key of keys) {
          const value = mapped[key]

          if (!Predicate.isString(value) || columns[value] === undefined) {
            return yield* failure("Missing mapped key")
          }
          physicalKeys.push(value)
        }
        result.push({ table, keys: physicalKeys })
      }
    }
    for (const nested of nestedMappings) {
      const value = mapping[nested]

      if (Schema.is(MappingRecord)(value) && value.table === undefined) {
        result.push(...(yield* storageKeyPlans(value, columnsFor)))
      }
    }

    return result
  })
