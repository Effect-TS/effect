/**
 * What the `HttpApi` and Rpc integrations of `VersionedSchema` need: finding
 * the versioned types a contract uses, negotiating their versions from the
 * `effect-versions` header, and choosing the versions encoders write.
 *
 * Contracts without versioned schemas don't bundle the `VersionedSchema`
 * module: its error classes are reached through the histories found here.
 */
import type { NonEmptyReadonlyArray } from "../Array.ts"
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as Exit from "../Exit.ts"
import * as Predicate from "../Predicate.ts"
import * as Schema from "../Schema.ts"
import * as SchemaAST from "../SchemaAST.ts"
import type * as SchemaIssue from "../SchemaIssue.ts"

/** @internal */
export const header = "effect-versions"

/**
 * How encoders write versioned types. `versions` holds the version to write
 * each type at, keyed by id; types it leaves out are written at their latest
 * version. A transport sets `negotiated` to the types it negotiated versions
 * for, and writing any other versioned type is then a defect.
 * `outsideBodies` marks encoding outside JSON bodies, where no versioned type
 * can be written. `VersionedSchema.at` and the transports provide it around
 * encoding only, so it never reaches handler code.
 *
 * @internal
 */
export interface Selection {
  readonly versions: Readonly<Record<string, number>>
  readonly negotiated: ReadonlyMap<string, History> | undefined
  readonly outsideBodies?: boolean | undefined
}

/** @internal */
export const Selection = Context.Reference<Selection>(
  "effect/schema/VersionedSchema/Selection",
  { defaultValue: () => ({ versions: {}, negotiated: undefined }) }
)

/**
 * The versions a client call speaks. Read only by the clients.
 *
 * @internal
 */
export const ClientVersions = Context.Reference<Readonly<Record<string, number>>>(
  "effect/schema/VersionedSchema/ClientVersions",
  { defaultValue: () => ({}) }
)

const noVersions: Readonly<Record<string, number>> = Object.freeze({})

/**
 * The versions a server negotiated for the current request, which its
 * responses are written at. Servers provide it around middleware and the
 * handler, where `VersionedSchema.requestVersion` reads it; encoders don't, so
 * handler code writes latest versions.
 *
 * @internal
 */
export const RequestVersions = Context.Reference<Readonly<Record<string, number>>>(
  "effect/schema/VersionedSchema/RequestVersions",
  { defaultValue: () => noVersions }
)

/**
 * The versions a server answers types a request doesn't list at, for example
 * every type of a request without the `effect-versions` header. Types it
 * doesn't pin are answered at their latest version.
 *
 * @internal
 */
export const DefaultVersions = Context.Reference<Readonly<Record<string, number>>>(
  "effect/schema/VersionedSchema/DefaultVersions",
  { defaultValue: () => noVersions }
)

const noHistories: ReadonlyMap<string, History> = new Map()

/**
 * The selection under which a transport encodes an endpoint's or rpc's values
 * at `versions`. Encoding a versioned type that `contract` doesn't list is a
 * defect: it wasn't found, so no version was negotiated for it, and
 * writing its latest version would fail only once the two sides' versions
 * differ.
 *
 * @internal
 */
export const selection = (
  contract: Contract | undefined,
  versions: Readonly<Record<string, number>> | undefined
): Selection => ({
  versions: versions ?? {},
  negotiated: contract?.histories ?? noHistories
})

/**
 * Runs a transport's encoding of an endpoint's or rpc's values under
 * {@link selection}.
 *
 * @internal
 */
export const withVersions = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  contract: Contract | undefined,
  versions: Readonly<Record<string, number>> | undefined
): Effect.Effect<A, E, R> =>
  // Schema encoders run eagerly, and a versioned schema's encoder waits for
  // the selection, so an encode that has already finished wrote none.
  Exit.isExit(effect) ? effect : Effect.provideService(effect, Selection, selection(contract, versions))

const outsideBodiesSelection: Selection = { versions: {}, negotiated: noHistories, outsideBodies: true }

/**
 * Runs an encoding outside JSON bodies, such as of headers or a URL, where
 * records can't carry their version: encoding a versioned type in it is a
 * defect.
 *
 * @internal
 */
export const outsideBodies = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
  Exit.isExit(effect) ? effect : Effect.provideService(effect, Selection, outsideBodiesSelection)

/**
 * `schema`, for synchronous encoders outside JSON bodies, which can't be run
 * with {@link outsideBodies}.
 *
 * @internal
 */
export const outsideBodiesSchema = <S>(schema: S): S =>
  (schema as unknown as Schema.Top).pipe(Schema.middlewareEncoding(outsideBodies)) as unknown as S

/** @internal */
export const usedOutsideBodies = (id: string): Error =>
  new Error(
    `VersionedSchema: ${
      JSON.stringify(id)
    } is encoded outside a JSON body, where records can't carry their version. Versioned schemas can only be used in JSON bodies.`
  )

/** @internal */
export const notNegotiated = (id: string): Error =>
  new Error(
    `VersionedSchema: ${
      JSON.stringify(id)
    } wasn't found in the schemas of the endpoint or rpc encoding it, so no version was negotiated for it. The gotchas of the VersionedSchema module explain which schemas aren't found and how to avoid that.`
  )

/** @internal */
export interface UnsupportedProps {
  readonly id: string
  readonly requested: number
  readonly oldest: number
  readonly supported: Readonly<Record<string, number>>
}

/** @internal */
export interface UnrepresentableProps {
  readonly id: string
  readonly version: number
  readonly reason: string
}

/** @internal */
export interface Errors {
  readonly VersionUnsupported: Schema.Top & (new(props: UnsupportedProps) => unknown)
  readonly Unrepresentable: Schema.Top & (new(props: UnrepresentableProps) => unknown)
}

/**
 * The runtime view of one versioned type.
 *
 * @internal
 */
export interface History {
  readonly id: string
  /** the defined versions, oldest first */
  readonly versions: ReadonlyArray<number>
  readonly unversioned: boolean
  /** the declarations behind `versions`, compared to tell histories apart */
  readonly declarations: ReadonlyArray<{ readonly payload: Schema.Top }>
  /** the transformation between the records and the latest version */
  readonly transformation: { readonly decode: unknown; readonly encode: unknown }
  readonly errors: Errors
}

/** @internal */
export const oldest = (history: History): number => history.versions[0]

/** @internal */
export const latest = (history: History): number => history.versions[history.versions.length - 1]

/**
 * The newest defined version at or below `version`, or `undefined` when
 * `version` is older than every defined version.
 *
 * @internal
 */
export const atOrBelow = (history: History, version: number): number | undefined => {
  for (let i = history.versions.length - 1; i >= 0; i--) {
    if (history.versions[i] <= version) return history.versions[i]
  }
  return undefined
}

const HistoryKey = "~effect/schema/VersionedSchema/History"

/** @internal */
export const RecordsKey = "~effect/schema/VersionedSchema/Records"

/** @internal */
export const annotateHistory = <S extends Schema.Top>(schema: S, history: History): S =>
  schema.annotate({ [HistoryKey]: history }) as S

const findInChecks = (checks: ReadonlyArray<SchemaAST.Check<any>>): unknown => {
  for (let i = checks.length - 1; i >= 0; i--) {
    const check = checks[i]
    const found = check.annotations?.[HistoryKey] ??
      (check._tag === "FilterGroup" ? findInChecks(check.checks) : undefined)
    if (found !== undefined) return found
  }
  return undefined
}

/**
 * The versioned type behind a node, if any. `Schema.toType` keeps annotations
 * but removes the encoding, so a versioned schema's type side isn't versioned.
 *
 * @internal
 */
// Flipping a schema twice, as `Schema.annotateEncoded` does, rebuilds its
// transformations with the same two functions.
const sameTransformation = (
  a: { readonly decode: unknown; readonly encode: unknown },
  b: { readonly decode: unknown; readonly encode: unknown }
): boolean => a === b || (a.decode === b.decode && a.encode === b.encode)

export const getHistory = (ast: SchemaAST.AST): History | undefined => {
  const encoding = ast.encoding
  if (encoding === undefined) return undefined
  const history = (ast.annotations?.[HistoryKey] ??
    (ast.checks === undefined ? undefined : findInChecks(ast.checks))) as History | undefined
  // `Schema.toType` keeps the annotation, so a schema that decodes into the
  // type side of a versioned one carries it without encoding through it
  return history !== undefined &&
      encoding.some((link) => sameTransformation(link.transformation, history.transformation))
    ? history
    : undefined
}

// Two declarations share an id when one extends the other with `next`.
const combine = (a: History | undefined, b: History): History => {
  if (a === undefined || a === b) return b
  const [shorter, longer] = a.declarations.length <= b.declarations.length ? [a, b] : [b, a]
  if (
    shorter.unversioned !== longer.unversioned ||
    shorter.declarations.some((declaration, i) => declaration !== longer.declarations[i])
  ) {
    throw new Error(`VersionedSchema: two different definitions use the id ${JSON.stringify(b.id)}`)
  }
  return longer
}

// Set once any versioned schema exists. Until then no schema can contain one,
// so programs that don't use versioning never walk their schemas.
let historyCreated = false

/** @internal */
export const markHistoryCreated = (): void => {
  historyCreated = true
}

// Backstops for walking through suspended schemas: how deep, and how many
// that lead to new schemas to follow. Each schema a suspended one builds stays
// in memory with it.
const maxSuspendDepth = 64
const maxSuspended = 2048

// Annotations that tell two schemas apart: their primitive values, such as an
// identifier or a description. Declarations build their codec functions and
// objects on every call, so those don't count.
const sameAnnotations = (a: object | undefined, b: object | undefined): boolean => {
  if (a === b) return true
  const keys = a === undefined ? [] : Reflect.ownKeys(a)
  if (keys.length !== (b === undefined ? 0 : Reflect.ownKeys(b).length)) return false
  for (const key of keys) {
    const x = (a as Record<PropertyKey, unknown>)[key]
    const y = (b as Record<PropertyKey, unknown> | undefined)?.[key]
    if (x === y) continue
    if ((typeof x === "object" && x !== null) || typeof x === "function") {
      if (typeof y !== typeof x || y === null) return false
      continue
    }
    return false
  }
  return true
}

// How deep two schemas are compared before they count as different
const maxCompareDepth = 16

// How many levels in a row, each equal to one on its path, a walk follows
// before taking them for a recursive schema built by a function. Plain levels
// with the same fields, such as a hierarchy built by one helper, are equal
// too, so one is followed. Each more doubles the work for a function-built
// schema with two suspended fields per level.
const maxRepeats = 1

// Whether two schemas are the same, as the levels of a recursive schema built by
// a function are: each level is a new schema, equal to the one before. Their
// suspended schemas are compared one level deep, and the suspended schemas in
// that level count as equal, since a recursive schema's levels lead to each
// other.
const sameSchema = (
  a: SchemaAST.AST,
  b: SchemaAST.AST,
  depth: number,
  inSuspend: boolean,
  force: (ast: SchemaAST.Suspend) => SchemaAST.AST | undefined
): boolean => {
  if (a === b) return true
  if (depth > maxCompareDepth) return inSuspend
  if (a._tag !== b._tag) return false
  if (!sameAnnotations(a.annotations, b.annotations)) return false
  if (a.context?.isOptional !== b.context?.isOptional) return false
  // annotations given after a check, such as an identifier, are kept on it
  const checks = a.checks ?? []
  const otherChecks = b.checks ?? []
  if (
    checks.length !== otherChecks.length ||
    checks.some((check, i) => !sameAnnotations(check.annotations, otherChecks[i].annotations))
  ) return false
  const links = a.encoding ?? []
  const others = b.encoding ?? []
  if (links.length !== others.length) return false
  for (let i = 0; i < links.length; i++) {
    if (!sameSchema(links[i].to, others[i].to, depth + 1, inSuspend, force)) return false
  }
  const all = (xs: ReadonlyArray<SchemaAST.AST>, ys: ReadonlyArray<SchemaAST.AST>) =>
    xs.length === ys.length && xs.every((x, i) => sameSchema(x, ys[i], depth + 1, inSuspend, force))
  switch (a._tag) {
    case "Literal":
      return a.literal === (b as SchemaAST.Literal).literal
    case "UniqueSymbol":
      return a.symbol === (b as SchemaAST.UniqueSymbol).symbol
    case "Objects": {
      const other = b as SchemaAST.Objects
      return a.propertySignatures.length === other.propertySignatures.length &&
        a.propertySignatures.every((p, i) =>
          p.name === other.propertySignatures[i].name &&
          sameSchema(p.type, other.propertySignatures[i].type, depth + 1, inSuspend, force)
        ) &&
        all(a.indexSignatures.map((i) => i.type), other.indexSignatures.map((i) => i.type)) &&
        all(a.indexSignatures.map((i) => i.parameter), other.indexSignatures.map((i) => i.parameter))
    }
    case "Union":
      return all(a.types, (b as SchemaAST.Union).types)
    case "Arrays":
      return all(a.elements, (b as SchemaAST.Arrays).elements) && all(a.rest, (b as SchemaAST.Arrays).rest)
    case "Declaration":
      return all(a.typeParameters, (b as SchemaAST.Declaration).typeParameters)
    case "TemplateLiteral":
      return all(a.parts, (b as SchemaAST.TemplateLiteral).parts)
    case "Enum":
      return JSON.stringify(a.enums) === JSON.stringify((b as SchemaAST.Enum).enums)
    case "Suspend":
      if (inSuspend) return true
      {
        // past the walk's limit, the comparison stops here, and so does the walk
        const x = force(a)
        const y = x === undefined ? undefined : force(b as SchemaAST.Suspend)
        return y === undefined || sameSchema(x!, y, depth + 1, true, force)
      }
    default:
      // keywords
      return true
  }
}

// the schemas a suspended schema was reached through, and how many levels in a
// row at its end were equal to one before them
interface Path {
  readonly ast: SchemaAST.AST
  readonly parent: Path | undefined
  readonly repeats: number
}

const onPath = (
  path: Path | undefined,
  ast: SchemaAST.AST,
  force: (ast: SchemaAST.Suspend) => SchemaAST.AST | undefined
): boolean => {
  for (let p = path; p !== undefined; p = p.parent) if (sameSchema(p.ast, ast, 0, false, force)) return true
  return false
}

interface Walker {
  readonly out: Map<string, History>
  readonly walk: (schemas: ReadonlyArray<Schema.Top | undefined>) => void
}

const makeWalker = (followSuspend: boolean): Walker => {
  const out = new Map<string, History>()
  const seen = new Set<SchemaAST.AST>()
  const walked = new Set<History>()
  const suspended: Array<{ readonly ast: SchemaAST.Suspend; readonly depth: number; readonly path: Path | undefined }> =
    []
  let next = 0
  let depth = 0
  let path: Path | undefined
  // The suspended schemas followed, by the walk or by comparing levels, that
  // lead to schemas not reached before. A suspended schema keeps what its
  // thunk returns, so one that returns a schema declared once leads to it
  // once, and one that wraps it, as `suspend(() => Schema.Array(X))` does at
  // each use, leads to nothing new after the first.
  const reached = new Set<SchemaAST.AST>()
  let followed = 0
  const reach = (ast: SchemaAST.AST): boolean => {
    const wrapped = SchemaAST.isArrays(ast)
      ? [...ast.elements, ...ast.rest]
      : SchemaAST.isUnion(ast)
      ? ast.types
      : SchemaAST.isDeclaration(ast) && ast.typeParameters.length > 0
      ? ast.typeParameters
      : undefined
    if (wrapped === undefined) {
      if (reached.has(ast)) return false
      reached.add(ast)
      return true
    }
    let found = false
    for (const inner of wrapped) found = reach(inner) || found
    for (const link of ast.encoding ?? []) found = reach(link.to) || found
    return found
  }
  const force = (ast: SchemaAST.Suspend): SchemaAST.AST | undefined => {
    if (followed >= maxSuspended) return undefined
    const target = ast.thunk()
    if (reach(target)) followed++
    return target
  }
  const visit = (ast: SchemaAST.AST): void => {
    if (seen.has(ast)) return
    seen.add(ast)
    const history = getHistory(ast)
    if (history !== undefined) {
      out.set(history.id, combine(out.get(history.id), history))
      // The versioned types its versions contain. One walk with one set of
      // seen nodes covers them, so histories that contain each other through
      // suspended schemas are complete whichever is found first.
      if (!walked.has(history)) {
        walked.add(history)
        for (const declaration of history.declarations) visit(declaration.payload.ast)
      }
      // the schemas it decodes from, if it was piped into another schema
      for (const link of ast.encoding!) {
        if (!sameTransformation(link.transformation, history.transformation)) visit(link.to)
      }
      return
    }
    if (SchemaAST.isSuspend(ast)) {
      // a suspended schema can decode from another schema
      for (const link of ast.encoding ?? []) visit(link.to)
      if (followSuspend && depth < maxSuspendDepth) suspended.push({ ast, depth: depth + 1, path })
      return
    }
    if ("recur" in ast) {
      ;(ast as any).recur((a: SchemaAST.AST) => {
        visit(a)
        return a
      })
    }
    for (const link of ast.encoding ?? []) visit(link.to)
  }
  const walk = (schemas: ReadonlyArray<Schema.Top | undefined>): void => {
    if (!historyCreated) return
    depth = 0
    for (const schema of schemas) {
      if (schema === undefined) continue
      // a root built by a function is equal to its own levels
      path = { ast: schema.ast, parent: undefined, repeats: 0 }
      visit(schema.ast)
    }
    // Suspended schemas are followed breadth first, after everything reached
    // without one. A recursive schema leads back to nodes already seen. One
    // built by a function, such as `suspend(() => Node())`, leads to a new
    // schema at every level, equal to one already on its path, so the walk
    // stops after a few such levels; a versioned schema is always followed.
    for (; next < suspended.length; next++) {
      const entry = suspended[next]
      const target = force(entry.ast)
      if (target === undefined) break
      if (seen.has(target)) continue
      if (getHistory(target) === undefined) {
        const repeats = onPath(entry.path, target, force) ? (entry.path?.repeats ?? 0) + 1 : 0
        if (repeats > maxRepeats) continue
        path = { ast: target, parent: entry.path, repeats }
      } else {
        path = entry.path
      }
      depth = entry.depth
      visit(target)
    }
  }
  return { out, walk }
}

/**
 * Every versioned type reachable from `schemas`, by id, including the types
 * nested in other versioned types.
 *
 * @internal
 */
export const collect = (
  schemas: ReadonlyArray<Schema.Top | undefined>,
  options?: { readonly followSuspend?: boolean | undefined }
): Map<string, History> => {
  const walker = makeWalker(options?.followSuspend !== false)
  walker.walk(schemas)
  return walker.out
}

/**
 * `"Person=3, Address=2"` → `{ Person: 3, Address: 2 }`. The value comes from
 * the other side, so malformed entries are ignored.
 *
 * @internal
 */
export const parseHeader = (value: unknown): Record<string, number> => {
  const out: Record<string, number> = Object.create(null)
  if (!Predicate.isString(value)) return out
  for (const part of value.split(",")) {
    const separator = part.indexOf("=")
    if (separator === -1) continue
    const id = part.slice(0, separator).trim()
    const version = Number(part.slice(separator + 1).trim())
    if (id !== "" && Number.isSafeInteger(version) && version > 0) out[id] = version
  }
  return out
}

/** @internal */
export const formatHeader = (versions: Readonly<Record<string, number>>): string =>
  Object.keys(versions).sort().map((id) => `${id}=${versions[id]}`).join(", ")

/**
 * The versioned types an endpoint or rpc uses.
 *
 * @internal
 */
export interface Contract {
  readonly histories: ReadonlyMap<string, History>
  /** the ids whose records a request carries, which a server must be able to read */
  readonly request: ReadonlySet<string>
  readonly errors: Errors
}

/** @internal */
export const contract = (
  request: ReadonlyArray<Schema.Top | undefined>,
  response: ReadonlyArray<Schema.Top | undefined>
): Contract | undefined => {
  // one walk for both sides: the request's types are those found before the
  // response is walked
  const walker = makeWalker(true)
  walker.walk(request)
  const requestIds = new Set(walker.out.keys())
  walker.walk(response)
  const histories = walker.out
  if (histories.size === 0) return undefined
  return { histories, request: requestIds, errors: histories.values().next().value!.errors }
}

/**
 * The client's side: the versions a call speaks, from the versions the caller
 * chose. Each is the newest version this build has at or below the choice;
 * types the caller didn't choose use this build's latest.
 *
 * @internal
 */
export const clientVersions = (
  contract: Contract,
  chosen: Readonly<Record<string, number>>
): Record<string, number> => {
  const out: Record<string, number> = {}
  for (const [id, history] of contract.histories) {
    const choice = Object.hasOwn(chosen, id) ? chosen[id] : undefined
    out[id] = choice === undefined ? latest(history) : atOrBelow(history, choice) ?? choice
  }
  return out
}

/**
 * The server's side: the versions to answer at, from the request's header, or
 * the reason to reject the request before decoding it.
 *
 * - A type the header leaves out is answered at the version `defaults` pins,
 *   or else at its latest, as servers answer requests without versioning.
 * - A version above this server's latest is answered at the latest, unless the
 *   request carries records of that type, which this server can't read.
 * - A version below this server's oldest can't be answered at all.
 *
 * @internal
 */
export const negotiate = (
  contract: Contract,
  headerValue: unknown,
  defaults: Readonly<Record<string, number>> = noVersions
):
  | { readonly _tag: "Accepted"; readonly versions: Readonly<Record<string, number>> }
  | { readonly _tag: "Rejected"; readonly props: UnsupportedProps } =>
{
  const requested = parseHeader(headerValue)
  const versions: Record<string, number> = {}
  let rejected: { readonly id: string; readonly requested: number; readonly oldest: number } | undefined
  for (const id of [...contract.histories.keys()].sort()) {
    const history = contract.histories.get(id)!
    const version = requested[id]
    if (version === undefined) {
      const pinned = Object.hasOwn(defaults, id) ? defaults[id] : undefined
      versions[id] = pinned === undefined ? latest(history) : atOrBelow(history, pinned) ?? oldest(history)
    } else if (version > latest(history) && !contract.request.has(id)) {
      versions[id] = latest(history)
    } else {
      const selected = version > latest(history) ? undefined : atOrBelow(history, version)
      if (selected === undefined) {
        rejected ??= { id, requested: version, oldest: oldest(history) }
      } else {
        versions[id] = selected
      }
    }
  }
  // handlers see these, and responses are written at them
  if (rejected === undefined) return { _tag: "Accepted", versions: Object.freeze(versions) }
  const supported: Record<string, number> = {}
  for (const [id, history] of contract.histories) supported[id] = latest(history)
  return { _tag: "Rejected", props: { ...rejected, supported } }
}

const UnsupportedKey = "~effect/schema/VersionedSchema/Unsupported"
const UnrepresentableKey = "~effect/schema/VersionedSchema/Unrepresentable"

/** @internal */
export const unsupportedAnnotation = (props: { readonly id: string; readonly requested: number }) => ({
  [UnsupportedKey]: props
})

/** @internal */
export const unrepresentableAnnotation = (props: UnrepresentableProps) => ({ [UnrepresentableKey]: props })

const find = <A>(issue: SchemaIssue.Issue, key: string): A | undefined => {
  const seen = new Set<unknown>()
  const go = (node: unknown): A | undefined => {
    if (!Predicate.isObject(node) || seen.has(node)) return undefined
    seen.add(node)
    const found = (node as { readonly annotations?: Record<string, unknown> }).annotations?.[key]
    if (found !== undefined) return found as A
    const inner = go((node as { readonly issue?: unknown }).issue)
    if (inner !== undefined) return inner
    const issues = (node as { readonly issues?: ReadonlyArray<unknown> }).issues
    if (Array.isArray(issues)) {
      for (const child of issues) {
        const found = go(child)
        if (found !== undefined) return found
      }
    }
    return undefined
  }
  return go(issue)
}

/** @internal */
export const findUnsupported = (
  issue: SchemaIssue.Issue
): { readonly id: string; readonly requested: number } | undefined => find(issue, UnsupportedKey)

/**
 * Decodes stored values once, capturing unknown markers from the actual value
 * at the failing record schema, including values produced by transformations.
 * Parser-reported inputs are removed before exposing the error, as with the
 * default Schema decoder. Only the schema id and version are retained.
 *
 * @internal
 */
export const decodeWithVersionErrors = <S extends Schema.Constraint>(schema: S) => {
  const decode = Schema.decodeEffect(schema, { reportInput: true })
  return (input: S["Encoded"]): Effect.Effect<S["Type"], Schema.SchemaError, S["DecodingServices"]> =>
    Effect.mapError(decode(input), (error) => {
      const seen = new Map<SchemaIssue.Issue, SchemaIssue.Issue>()
      const clean = (issue: SchemaIssue.Issue): SchemaIssue.Issue => {
        const cached = seen.get(issue)
        if (cached !== undefined) return cached
        const copy = Object.assign(Object.create(Object.getPrototypeOf(issue)), issue)
        seen.set(issue, copy)
        delete copy.input
        if ("ast" in issue) {
          const history = getHistory(issue.ast) ?? issue.ast.annotations?.[RecordsKey] as History | undefined
          const input = issue.input
          if (
            history !== undefined && Predicate.hasProperty(input, "_version") && !Array.isArray(input) &&
            Object.hasOwn(input, "_version")
          ) {
            const requested = input._version
            if (
              typeof requested === "number" && Number.isSafeInteger(requested) && requested > 0 &&
              !history.versions.includes(requested)
            ) {
              copy.annotations = { ...copy.annotations, ...unsupportedAnnotation({ id: history.id, requested }) }
            }
          }
        }
        if ("issue" in issue) copy.issue = clean(issue.issue)
        if ("issues" in issue) copy.issues = issue.issues.map(clean)
        return copy
      }
      return new Schema.SchemaError(clean(error.issue))
    })
}

/**
 * The value behind an encoding failure that has no equivalent at an older
 * version, if that's what failed.
 *
 * @internal
 */
export const findUnrepresentable = (issue: SchemaIssue.Issue): UnrepresentableProps | undefined =>
  find(issue, UnrepresentableKey)

/** @internal */
export const unsupportedProps = (
  contract: Contract,
  unsupported: { readonly id: string; readonly requested: number }
): UnsupportedProps => {
  const supported: Record<string, number> = {}
  for (const [id, history] of contract.histories) supported[id] = latest(history)
  const history = contract.histories.get(unsupported.id)
  return {
    id: unsupported.id,
    requested: unsupported.requested,
    oldest: history === undefined ? unsupported.requested : oldest(history),
    supported
  }
}

/**
 * How many leading values of a stream chunk `encode` accepts one at a time, for
 * streams that deliver those values before failing at the next one. Callers
 * encode them together afterwards: a binary codec encodes a whole chunk as one
 * byte array, so encoded chunks can't be split.
 *
 * @internal
 */
export const encodableCount = <R>(
  values: ReadonlyArray<unknown>,
  encode: (values: NonEmptyReadonlyArray<unknown>) => Effect.Effect<unknown, unknown, R>
): Effect.Effect<number, never, R> =>
  Effect.suspend(() => {
    let count = 0
    let failed = false
    return Effect.map(
      Effect.whileLoop({
        while: () => !failed && count < values.length,
        body: () => Effect.exit(encode([values[count]])),
        step: (exit) => {
          if (Exit.isSuccess(exit)) count++
          else failed = true
        }
      }),
      () => count
    )
  })

/**
 * The typed error behind a schema error from reading or writing versioned
 * records, or `undefined` when the failure is unrelated to versions.
 *
 * @internal
 */
export const toTypedError = (
  contract: Contract,
  error: { readonly issue: SchemaIssue.Issue }
): unknown => {
  const unrepresentable = findUnrepresentable(error.issue)
  if (unrepresentable !== undefined) return new contract.errors.Unrepresentable(unrepresentable)
  const unsupported = findUnsupported(error.issue)
  if (unsupported !== undefined) return new contract.errors.VersionUnsupported(unsupportedProps(contract, unsupported))
  return undefined
}
