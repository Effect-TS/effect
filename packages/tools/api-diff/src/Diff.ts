import { fingerprint, stableJson } from "./Json.ts"
import type {
  ApiChange,
  ApiDiff,
  ApiEntity,
  ApiMapping,
  ApiSnapshot,
  ChangeClassification,
  DeclarationModel,
  MappingDiagnostic,
  MigrationMap,
  ModuleMapping
} from "./Model.ts"

interface Match {
  readonly base: ApiEntity
  readonly head: ApiEntity
  readonly confidence: number
  readonly authoritative: boolean
  readonly mapping?: ApiMapping | ModuleMapping
  readonly note?: string
}

const targetEntities = (
  snapshot: ApiSnapshot,
  target: {
    readonly module: string
    readonly path: ReadonlyArray<string>
    readonly bucket?: string | undefined
  }
): ReadonlyArray<ApiEntity> =>
  snapshot.entities.filter((entity) =>
    entity.module === target.module &&
    entity.path.join(".") === target.path.join(".") &&
    (target.bucket === undefined || entity.bucket === target.bucket)
  )

const pathName = (entity: ApiEntity): string => entity.path.at(-1) ?? ""

const levenshtein = (left: string, right: string): number => {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
    let previous = row[0]!
    row[0] = leftIndex
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
      const above = row[rightIndex]!
      const diagonal = previous
      previous = above
      row[rightIndex] = left[leftIndex - 1] === right[rightIndex - 1]
        ? diagonal
        : Math.min(diagonal, above, row[rightIndex - 1]!) + 1
    }
  }
  return row[right.length]!
}

const nameSimilarity = (left: string, right: string): number => {
  const length = Math.max(left.length, right.length)
  return length === 0 ? 1 : 1 - levenshtein(left.toLowerCase(), right.toLowerCase()) / length
}

const changeId = (
  classification: ChangeClassification,
  base?: ApiEntity,
  head?: ApiEntity,
  suffix = ""
): string => `change-${fingerprint([classification, base?.id ?? null, head?.id ?? null, suffix]).slice(0, 16)}`

const makeChange = (
  classification: ChangeClassification,
  match: Partial<Match>,
  delta?: unknown,
  suffix = ""
): ApiChange => ({
  id: changeId(classification, match.base, match.head, suffix),
  classification,
  confidence: match.confidence ?? 1,
  baseApiId: match.base?.id,
  headApiId: match.head?.id,
  before: match.base?.displaySignature,
  after: match.head?.displaySignature,
  delta,
  baseSource: match.base?.source,
  headSource: match.head?.source,
  mapping: match.mapping,
  guide: match.mapping?.guide,
  reviewNotes: match.note,
  authoritative: match.authoritative ?? true
})

const declarationHash = (value: unknown): string => fingerprint(value)

const memberMap = (declarations: ReadonlyArray<DeclarationModel>): Map<string, DeclarationModel> =>
  new Map(
    declarations.flatMap((declaration) => declaration.members ?? [])
      .map((member) => [`${member.kind}:${member.name}`, member])
  )

const classifyStructure = (match: Match): ReadonlyArray<ApiChange> => {
  const base = match.base
  const head = match.head
  const changes: Array<ApiChange> = []
  if (base.bucket !== head.bucket) {
    changes.push(makeChange("bucket-changed", match, { before: base.bucket, after: head.bucket }))
  }
  if (base.declarationKind !== head.declarationKind) {
    changes.push(makeChange("declaration-kind-changed", match, {
      before: base.declarationKind,
      after: head.declarationKind
    }))
  }

  const baseDeclarations = base.declarations
  const headDeclarations = head.declarations
  const baseSignatures = baseDeclarations.filter((declaration) =>
    declaration.kind === "function" || declaration.kind === "method"
  )
  const headSignatures = headDeclarations.filter((declaration) =>
    declaration.kind === "function" || declaration.kind === "method"
  )
  if (headSignatures.length > baseSignatures.length) {
    changes.push(makeChange("overload-added", match, {
      before: baseSignatures.length,
      after: headSignatures.length
    }))
  } else if (headSignatures.length < baseSignatures.length) {
    changes.push(makeChange("overload-removed", match, {
      before: baseSignatures.length,
      after: headSignatures.length
    }))
  } else if (
    baseSignatures.length > 1 &&
    stableJson(baseSignatures.map(declarationHash).sort()) === stableJson(headSignatures.map(declarationHash).sort()) &&
    stableJson(baseSignatures.map(declarationHash)) !== stableJson(headSignatures.map(declarationHash))
  ) {
    changes.push(makeChange("overload-reordered", match))
  }

  const comparedSignatures = Math.min(baseSignatures.length, headSignatures.length)
  for (let index = 0; index < comparedSignatures; index++) {
    const before = baseSignatures[index]!
    const after = headSignatures[index]!
    const beforeParameters = before.parameters ?? []
    const afterParameters = after.parameters ?? []
    if (afterParameters.length > beforeParameters.length) {
      changes.push(makeChange("parameter-added", match, {
        overload: index,
        before: beforeParameters,
        after: afterParameters
      }, String(index)))
    } else if (afterParameters.length < beforeParameters.length) {
      changes.push(makeChange("parameter-removed", match, {
        overload: index,
        before: beforeParameters,
        after: afterParameters
      }, String(index)))
    } else if (
      stableJson(beforeParameters.map((parameter) => parameter.name).sort()) ===
        stableJson(afterParameters.map((parameter) => parameter.name).sort()) &&
      stableJson(beforeParameters.map((parameter) => parameter.name)) !==
        stableJson(afterParameters.map((parameter) => parameter.name))
    ) {
      changes.push(makeChange("parameter-reordered", match, {
        overload: index,
        before: beforeParameters,
        after: afterParameters
      }, String(index)))
    } else if (stableJson(beforeParameters) !== stableJson(afterParameters)) {
      changes.push(makeChange("parameter-changed", match, {
        overload: index,
        before: beforeParameters,
        after: afterParameters
      }, String(index)))
    }
    if (stableJson(before.returnType) !== stableJson(after.returnType)) {
      changes.push(makeChange("return-type-changed", match, {
        overload: index,
        before: before.returnType,
        after: after.returnType
      }, String(index)))
    }
    if (stableJson(before.typeParameters) !== stableJson(after.typeParameters)) {
      changes.push(makeChange("generic-parameter-changed", match, {
        overload: index,
        before: before.typeParameters,
        after: after.typeParameters
      }, String(index)))
    }
  }

  const baseMembers = memberMap(baseDeclarations)
  const headMembers = memberMap(headDeclarations)
  for (const [key, member] of baseMembers) {
    const next = headMembers.get(key)
    if (next === undefined) {
      changes.push(makeChange("member-removed", match, { member }, key))
    } else if (stableJson(member) !== stableJson(next)) {
      changes.push(makeChange("member-changed", match, { before: member, after: next }, key))
    }
  }
  for (const [key, member] of headMembers) {
    if (!baseMembers.has(key)) {
      changes.push(makeChange("member-added", match, { member }, key))
    }
  }

  const baseHeritage = baseDeclarations.flatMap((declaration) => declaration.heritage ?? [])
  const headHeritage = headDeclarations.flatMap((declaration) => declaration.heritage ?? [])
  if (stableJson(baseHeritage) !== stableJson(headHeritage)) {
    changes.push(makeChange("heritage-changed", match, { before: baseHeritage, after: headHeritage }))
  }

  const baseTypes = baseDeclarations.map((declaration) => declaration.type)
  const headTypes = headDeclarations.map((declaration) => declaration.type)
  const baseKinds = new Set(baseTypes.flatMap((type) => type?.kind === undefined ? [] : [type.kind]))
  const headKinds = new Set(headTypes.flatMap((type) => type?.kind === undefined ? [] : [type.kind]))
  if ((baseKinds.has("union") || headKinds.has("union")) && stableJson(baseTypes) !== stableJson(headTypes)) {
    changes.push(makeChange("union-member-changed", match, { before: baseTypes, after: headTypes }))
  }
  if (
    (baseKinds.has("intersection") || headKinds.has("intersection")) &&
    stableJson(baseTypes) !== stableJson(headTypes)
  ) {
    changes.push(makeChange("intersection-member-changed", match, { before: baseTypes, after: headTypes }))
  }
  if (stableJson(base.documentation) !== stableJson(head.documentation)) {
    changes.push(makeChange("documentation-changed", match, {
      before: base.documentation,
      after: head.documentation
    }))
  }
  if (base.fingerprint !== head.fingerprint && changes.length === 0) {
    changes.push(makeChange("structural-change", match, {
      before: base.declarations,
      after: head.declarations
    }))
  }
  return changes
}

const movementChange = (match: Match): ApiChange | undefined => {
  const beforeName = pathName(match.base)
  const afterName = pathName(match.head)
  if (beforeName !== afterName) {
    return makeChange("api-renamed", match)
  }
  if (match.base.module !== match.head.module || match.base.path.join(".") !== match.head.path.join(".")) {
    return makeChange("api-moved", match)
  }
  return undefined
}

const moduleChanges = (
  base: ApiSnapshot,
  head: ApiSnapshot,
  mapping: MigrationMap
): ReadonlyArray<ApiChange> => {
  const changes: Array<ApiChange> = []
  const basePackages = new Set(base.packages)
  const headPackages = new Set(head.packages)
  for (const packageName of basePackages) {
    if (!headPackages.has(packageName)) {
      changes.push({
        id: `change-${fingerprint(["package-removed", packageName]).slice(0, 16)}`,
        classification: "package-removed",
        confidence: 1,
        delta: { packageName },
        authoritative: true
      })
    }
  }
  for (const packageName of headPackages) {
    if (!basePackages.has(packageName)) {
      changes.push({
        id: `change-${fingerprint(["package-added", packageName]).slice(0, 16)}`,
        classification: "package-added",
        confidence: 1,
        delta: { packageName },
        authoritative: true
      })
    }
  }
  for (const entry of mapping.modules) {
    const classification = entry.status === "added"
      ? "module-added"
      : entry.status === "removed"
      ? "module-removed"
      : entry.status === "split"
      ? "module-split"
      : entry.status === "consolidated"
      ? "module-consolidated"
      : entry.status === "moved"
      ? "module-moved"
      : undefined
    if (classification !== undefined) {
      changes.push({
        id: `change-${fingerprint([classification, entry.from, entry.to]).slice(0, 16)}`,
        classification,
        confidence: 1,
        delta: { from: entry.from, to: entry.to },
        mapping: entry,
        guide: entry.guide,
        authoritative: true
      })
    }
  }
  return changes
}

export const diffSnapshots = (
  base: ApiSnapshot,
  head: ApiSnapshot,
  mapping: MigrationMap,
  mappingDiagnostics: ReadonlyArray<MappingDiagnostic>
): ApiDiff => {
  const unmatchedBase = new Map(base.entities.map((entity) => [entity.id, entity]))
  const unmatchedHead = new Map(head.entities.map((entity) => [entity.id, entity]))
  const matches: Array<Match> = []

  const addMatch = (
    baseEntity: ApiEntity | undefined,
    headEntity: ApiEntity | undefined,
    details: Omit<Match, "base" | "head">
  ): boolean => {
    if (
      baseEntity === undefined || headEntity === undefined ||
      !unmatchedBase.has(baseEntity.id) || !unmatchedHead.has(headEntity.id)
    ) {
      return false
    }
    unmatchedBase.delete(baseEntity.id)
    unmatchedHead.delete(headEntity.id)
    matches.push({ base: baseEntity, head: headEntity, ...details })
    return true
  }

  for (const moduleMapping of mapping.modules) {
    if (moduleMapping.from === undefined) {
      continue
    }
    const bases = base.entities.filter((entity) => entity.module === moduleMapping.from)
    for (const baseEntity of bases) {
      for (const targetModule of moduleMapping.to) {
        const headEntity = head.entities.find((entity) =>
          entity.module === targetModule &&
          entity.path.join(".") === baseEntity.path.join(".") &&
          entity.bucket === baseEntity.bucket
        )
        if (
          addMatch(baseEntity, headEntity, {
            confidence: 1,
            authoritative: true,
            mapping: moduleMapping
          })
        ) {
          break
        }
      }
    }
  }

  for (const apiMapping of mapping.apis) {
    if (apiMapping.to === null) {
      continue
    }
    const bases = targetEntities(base, apiMapping.from)
    const heads = targetEntities(head, apiMapping.to)
    for (const baseEntity of bases) {
      const headEntity = heads.find((candidate) =>
        apiMapping.from.bucket !== undefined || candidate.bucket === baseEntity.bucket
      )
      addMatch(baseEntity, headEntity, {
        confidence: 1,
        authoritative: true,
        mapping: apiMapping
      })
    }
  }

  for (const moduleMapping of mapping.modules) {
    if (moduleMapping.from === undefined) {
      continue
    }
    const bases = [...unmatchedBase.values()].filter((entity) => entity.module === moduleMapping.from)
    const heads = [...unmatchedHead.values()].filter((entity) => moduleMapping.to.includes(entity.module))
    for (const baseEntity of bases) {
      const candidates = heads.filter((entity) =>
        entity.bucket === baseEntity.bucket && entity.fingerprint === baseEntity.fingerprint &&
        unmatchedHead.has(entity.id)
      )
      if (candidates.length === 1) {
        addMatch(baseEntity, candidates[0], {
          confidence: 0.98,
          authoritative: true,
          mapping: moduleMapping
        })
      }
    }
  }

  for (const moduleMapping of mapping.modules) {
    if (moduleMapping.from === undefined) {
      continue
    }
    const bases = [...unmatchedBase.values()].filter((entity) => entity.module === moduleMapping.from)
    const heads = [...unmatchedHead.values()].filter((entity) => moduleMapping.to.includes(entity.module))
    for (const baseEntity of bases) {
      const ranked = heads
        .filter((entity) => entity.bucket === baseEntity.bucket && unmatchedHead.has(entity.id))
        .map((entity) => {
          const sameKind = entity.declarationKind === baseEntity.declarationKind ? 0.15 : 0
          const sameFingerprint = entity.fingerprint === baseEntity.fingerprint ? 0.5 : 0
          const score = Math.min(
            0.99,
            0.35 * nameSimilarity(pathName(baseEntity), pathName(entity)) + sameKind +
              sameFingerprint
          )
          return { entity, score }
        })
        .sort((left, right) => right.score - left.score || left.entity.id.localeCompare(right.entity.id))
      const best = ranked[0]
      const next = ranked[1]
      if (best !== undefined && best.score >= 0.45 && (next === undefined || best.score - next.score >= 0.08)) {
        addMatch(baseEntity, best.entity, {
          confidence: Number(best.score.toFixed(3)),
          authoritative: false,
          mapping: moduleMapping,
          note: "Suggested match; requires review"
        })
      }
    }
  }

  const changes = [...moduleChanges(base, head, mapping)]
  for (const match of matches) {
    const movement = movementChange(match)
    if (movement !== undefined) {
      changes.push(movement)
    }
    changes.push(...classifyStructure(match))
  }
  for (const entity of unmatchedBase.values()) {
    changes.push(makeChange("api-removed", {
      base: entity,
      confidence: 1,
      authoritative: true
    }))
  }
  for (const entity of unmatchedHead.values()) {
    changes.push(makeChange("api-added", {
      head: entity,
      confidence: 1,
      authoritative: true
    }))
  }

  return {
    version: 1,
    base: { ref: base.ref, sha: base.sha },
    head: { ref: head.ref, sha: head.sha },
    mappingVersion: mapping.version,
    mappingDiagnostics,
    changes: changes.sort((left, right) =>
      left.classification.localeCompare(right.classification) ||
      (left.baseApiId ?? "").localeCompare(right.baseApiId ?? "") ||
      (left.headApiId ?? "").localeCompare(right.headApiId ?? "") ||
      left.id.localeCompare(right.id)
    )
  }
}
