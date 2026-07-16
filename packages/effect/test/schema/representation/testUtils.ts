import { Schema, type SchemaRepresentation } from "effect"

function isReviver(value: unknown): value is SchemaRepresentation.AnyReviver {
  if (typeof value !== "object" || value === null) return false
  const candidate = value as Record<string, unknown>
  return (candidate._tag === "Declaration" || candidate._tag === "Filter" || candidate._tag === "FilterGroup") &&
    typeof candidate.id === "string" && typeof candidate.revive === "function"
}

export const builtInRevivers: ReadonlyArray<SchemaRepresentation.AnyReviver> = [
  ...new Map(
    (Object.values(Schema) as ReadonlyArray<unknown>)
      .filter(isReviver)
      .map((reviver) => [reviver.id, reviver] as const)
  ).values()
]

const annotationKeysToOmit = new Set([
  "arbitrary",
  "generation",
  "representation",
  "toCode",
  "toArbitrary",
  "toCodec",
  "toCodecIso",
  "toCodecJson",
  "toEquivalence",
  "toFormatter",
  "toJsonSchema",
  "typeConstructor"
])

function annotations(input: unknown): Record<string, unknown> | undefined {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return undefined
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    if (annotationKeysToOmit.has(key) || key.startsWith("~") || typeof value === "function") continue
    out[key] = canonicalize(value)
  }
  return Object.keys(out).length === 0 ? undefined : out
}

function check(input: Record<string, unknown>): unknown {
  const inputAnnotations = typeof input.annotations === "object" && input.annotations !== null
    ? input.annotations as Record<string, unknown>
    : undefined
  if (input._tag === "Filter") {
    const representation = input.representation ?? inputAnnotations?.representation
    if (representation === undefined) return undefined
    const ordinary = annotations(input.annotations)
    return {
      _tag: "Filter",
      representation: canonicalize(representation),
      ...(input.aborted === true ? { aborted: true } : undefined),
      ...(ordinary === undefined ? undefined : { annotations: ordinary })
    }
  }
  const checks = Array.isArray(input.checks)
    ? input.checks.map(canonicalize).filter((value) => value !== undefined)
    : []
  if (checks.length === 0) return undefined
  const ordinary = annotations(input.annotations)
  return {
    _tag: "FilterGroup",
    checks,
    ...(ordinary === undefined ? undefined : { annotations: ordinary })
  }
}

export function canonicalize(input: unknown): unknown {
  if (Array.isArray(input)) return input.map(canonicalize).filter((value) => value !== undefined)
  if (typeof input !== "object" || input === null || input instanceof RegExp) return input

  const record = input as Record<string, unknown>
  if (record._tag === "Filter" || record._tag === "FilterGroup") return check(record)

  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(record)) {
    if (key === "encodedSchema" || key === "checks") continue
    if (key === "annotations") {
      const ordinary = annotations(value)
      if (ordinary !== undefined) out.annotations = ordinary
    } else {
      out[key] = canonicalize(value)
    }
  }
  if (Array.isArray(record.checks)) {
    const checks = record.checks.map(canonicalize).filter((value) => value !== undefined)
    if (checks.length > 0) out.checks = checks
  }
  return out
}
