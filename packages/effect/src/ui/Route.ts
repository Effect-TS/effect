/**
 * Route definitions: a flat union of routes, each a path template with
 * `params` and `query` Schemas, plus a parser and a printer that agree.
 *
 * A route union is a `Schema.TaggedUnion`, so a route value such as
 * `{ _tag: "Person", params: { id: 1 }, query: {} }` can be a root's props and
 * a page's props. Parsing decodes path and query strings through each route's
 * Schemas with `Schema.toCodecStringTree`, so `params: { id: Schema.Number }`
 * works directly, and printing encodes through the same Schemas.
 *
 * **Matching**
 *
 * - A template has literal segments, `:name` params and an optional trailing
 *   `*`, which captures the rest of the path as the `"*"` param.
 * - A literal segment beats a param and a param beats a rest, whatever the
 *   declaration order. Between equal templates, the first declared wins.
 * - If a path param fails to decode, matching falls through to the next
 *   route, so `/people/:id` with a Number and `/people/:slug` with a String
 *   can coexist. If the query fails to decode, the URL is a 404: the result is
 *   the catch-all `"/*"` route, with no fall-through.
 * - A trailing slash is stripped, a printed path never has one, and matching
 *   is case-sensitive.
 * - Redirects take part in the ranking like routes, and `parse` resolves
 *   them, so the server and the client agree.
 *
 * **Base path**
 *
 * Templates are relative to the union's base path, which a Router Layer sets
 * at startup. `parse` only accepts URLs under the base and `print` adds it
 * back, so printed links are always absolute. The base `"#"` puts the URL in
 * the fragment, as `"#/people/1"`, for static hosting.
 *
 * **Example** (A route table)
 *
 * ```ts import.meta.vitest
 * import { Option, Schema } from "effect"
 * import { Route } from "effect/ui"
 *
 * const AppRoute = Route.union(
 *   {
 *     Home: Route.make("/"),
 *     Person: Route.make("/people/:id", {
 *       params: { id: Schema.Number },
 *       query: { tab: Schema.optional(Schema.String) }
 *     }),
 *     NotFound: Route.make("/*")
 *   },
 *   Route.redirect("/old/:id", (params) => ({ _tag: "Person", params: { id: Number(params.id) }, query: {} }))
 * )
 *
 * Option.getOrThrow(AppRoute.parse("/people/1?tab=posts")).query // => { tab: "posts" }
 * AppRoute.print(AppRoute.make({ _tag: "Person", params: { id: 2 } })) // => "/people/2"
 * Option.getOrThrow(AppRoute.parse("/old/3")).params // => { id: 3 }
 * Option.getOrThrow(AppRoute.parse("/nope"))._tag // => "NotFound"
 * ```
 *
 * @stability experimental
 * @since 4.1.5
 */
import * as Effect from "../Effect.ts"
import * as Option from "../Option.ts"
import * as Schema from "../Schema.ts"

/**
 * Marks a route definition.
 *
 * @stability experimental
 * @category type IDs
 * @since 4.1.5
 */
export const TypeId = "~effect/ui/Route" as const

/**
 * The names of a template's `:name` params.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type PathParams<Path extends string> = Path extends `${string}:${infer Rest}`
  ? Rest extends `${infer Name}/${infer Tail}` ? Name | PathParams<`/${Tail}`> : Rest
  : never

/**
 * A route definition: a path template and the Schemas of its params and
 * query.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Route<
  out Path extends string,
  out Params extends Schema.Struct.Fields,
  out Query extends Schema.Struct.Fields
> {
  readonly [TypeId]: typeof TypeId
  readonly path: Path
  readonly params: Params
  readonly query: Query
}

/**
 * Any route definition.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type Any = Route<string, Schema.Struct.Fields, Schema.Struct.Fields>

/**
 * The `params` fields of a route value: the declared ones, plus `"*"` for a
 * template ending in `*`.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type ParamFields<R> = R extends Route<infer Path, infer Params, infer _Query>
  ? Path extends `${string}*` ? Params & { readonly "*": Schema.String } : Params
  : never

/**
 * The `query` fields of a route value.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type QueryFields<R> = R extends Route<infer _Path, infer _Params, infer Query> ? Query : never

/**
 * A params or query Struct, which `make` fills in with `{}` when every field
 * is optional.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type FieldsSchema<Fields extends Schema.Struct.Fields> = {} extends Schema.Struct<Fields>["Type"]
  ? Schema.withConstructorDefault<Schema.Struct<Fields>>
  : Schema.Struct<Fields>

/**
 * The Schema of one route's values in a union.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type Case<Tag extends string, R> = Schema.TaggedStruct<Tag, {
  readonly params: FieldsSchema<ParamFields<R>>
  readonly query: FieldsSchema<QueryFields<R>>
}>

/**
 * A redirect: a template whose raw params and query map to a route value.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Redirect {
  readonly _tag: "Redirect"
  readonly path: string
  readonly to: (
    params: Readonly<Record<string, string>>,
    query: Readonly<Record<string, string | ReadonlyArray<string>>>
  ) => { readonly _tag: string }
}

/**
 * What `resolve` returns: the route a URL resolves to, and whether a redirect
 * or a normalisation (such as a trailing slash) changed the URL. The server
 * answers a changed URL with a redirect to `print(route)`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Resolved<A> {
  readonly route: A
  readonly redirected: boolean
}

/**
 * A route union: a `Schema.TaggedUnion` of route values, with a parser and a
 * printer.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Union<Routes extends Record<string, Any>>
  extends Schema.TaggedUnion<{ readonly [K in keyof Routes & string]: Case<K, Routes[K]> }>
{
  /** The route definitions, by tag. */
  readonly routes: Routes
  /** Parses a URL path, with its query, into a route value, resolving redirects. */
  readonly parse: (url: string) => Option.Option<this["Type"]>
  /** Like `parse`, and also reports whether the URL was redirected or normalised. */
  readonly resolve: (url: string) => Option.Option<Resolved<this["Type"]>>
  /** Prints a route value as an absolute URL path under the base, with its query. */
  readonly print: (route: this["Type"]) => string
  /** A union of some of the routes, for a section's props. It shares the base path. */
  readonly subset: <const Tags extends keyof Routes & string>(
    tags: ReadonlyArray<Tags>
  ) => Union<{ readonly [K in Tags]: Routes[K] }>
  /** The base path, `""` or a path such as `"/en"`. */
  readonly base: () => string
  /** Sets the base path. Router Layers call it at startup. */
  readonly setBase: (base: string) => void
}

/**
 * Any route union.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface AnyUnion {
  readonly parse: (url: string) => Option.Option<{ readonly _tag: string }>
  readonly resolve: (url: string) => Option.Option<Resolved<{ readonly _tag: string }>>
  readonly print: (route: any) => string
  readonly base: () => string
  readonly setBase: (base: string) => void
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

type Segment =
  | { readonly _tag: "Static"; readonly value: string }
  | { readonly _tag: "Param"; readonly name: string }
  | {
    readonly _tag: "Rest"
  }

const parseTemplate = (path: string): ReadonlyArray<Segment> => {
  if (!path.startsWith("/")) throw new Error(`Route template "${path}" must start with "/"`)
  const parts = path === "/" ? [] : path.replace(/\/$/, "").slice(1).split("/")
  return parts.map((part, index): Segment => {
    if (part === "*") {
      if (index !== parts.length - 1) throw new Error(`Route template "${path}": "*" must be the last segment`)
      return { _tag: "Rest" }
    }
    if (part.startsWith(":")) {
      if (part.length === 1) throw new Error(`Route template "${path}": a param needs a name`)
      return { _tag: "Param", name: part.slice(1) }
    }
    return { _tag: "Static", value: part }
  })
}

/** Fields that weren't given infer as their constraint, which means none. */
type Declared<Fields extends Schema.Struct.Fields> = string extends keyof Fields ? {} : Fields

/**
 * Defines a route from a path template and the Schemas of its params and
 * query.
 *
 * **Details**
 *
 * Every `:name` in the template must have a Schema in `params`, which is a
 * compile error otherwise. A trailing `*` captures the rest of the path, as
 * the `"*"` param. Params and query decode from URL strings through
 * `Schema.toCodecStringTree`, so a `Schema.Number` param parses `"42"`. A
 * query field that isn't optional makes the route a 404 when it's missing.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const make = <
  const Path extends string,
  const Params extends Schema.Struct.Fields = {},
  const Query extends Schema.Struct.Fields = {}
>(
  path: Path,
  ...[options]: [PathParams<Path>] extends [never] ?
    [options?: { readonly params?: Params | undefined; readonly query?: Query | undefined }]
    : [
      options: {
        readonly params: Params & { readonly [K in PathParams<Path>]: Schema.Constraint }
        readonly query?: Query | undefined
      }
    ]
): Route<Path, Declared<Params>, Declared<Query>> => {
  const params = (options?.params ?? {}) as Declared<Params>
  for (const segment of parseTemplate(path)) {
    if (segment._tag === "Param" && !(segment.name in params)) {
      throw new Error(`Route "${path}" has no Schema for its :${segment.name} param`)
    }
  }
  return { [TypeId]: TypeId, path, params, query: (options?.query ?? {}) as Declared<Query> }
}

/**
 * A redirect for a route union: a template whose raw string params and query
 * map to a route value.
 *
 * **Details**
 *
 * A redirect is ranked with the routes, and `parse` returns the route it
 * maps to. `resolve` reports it as `redirected`, which the server answers
 * with a 301.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const redirect = <const Path extends string>(
  path: Path,
  to: (
    params: { readonly [K in PathParams<Path>]: string },
    query: Readonly<Record<string, string | ReadonlyArray<string>>>
  ) => { readonly _tag: string }
): Redirect => {
  parseTemplate(path)
  return { _tag: "Redirect", path, to: to as Redirect["to"] }
}

// ---------------------------------------------------------------------------
// URLs
// ---------------------------------------------------------------------------

const decodeComponent = (text: string): string | undefined => {
  try {
    return decodeURIComponent(text)
  } catch {
    return undefined
  }
}

type RawQuery = Record<string, string | Array<string>>

const parseQuery = (search: string): RawQuery | undefined => {
  // No prototype, so keys such as `constructor` or `__proto__` are plain query keys.
  const query: RawQuery = Object.create(null)
  if (search === "") return query
  for (const pair of search.split("&")) {
    if (pair === "") continue
    const at = pair.indexOf("=")
    const key = decodeComponent((at < 0 ? pair : pair.slice(0, at)).replaceAll("+", " "))
    const value = decodeComponent((at < 0 ? "" : pair.slice(at + 1)).replaceAll("+", " "))
    if (key === undefined || value === undefined) return undefined
    const found = Object.hasOwn(query, key) ? query[key] : undefined
    query[key] = found === undefined ? value : typeof found === "string" ? [found, value] : [...found, value]
  }
  return query
}

const printQuery = (query: unknown): string => {
  if (typeof query !== "object" || query === null) return ""
  const parts: Array<string> = []
  for (const [key, value] of Object.entries(query)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (typeof item === "string") parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(item)}`)
    }
  }
  return parts.length === 0 ? "" : `?${parts.join("&")}`
}

const normaliseBase = (base: string): string => {
  if (base === "" || base === "/") return ""
  if (base.startsWith("#")) return "#"
  const withSlash = base.startsWith("/") ? base : `/${base}`
  return withSlash.endsWith("/") ? withSlash.slice(0, -1) : withSlash
}

// ---------------------------------------------------------------------------
// Unions
// ---------------------------------------------------------------------------

interface Entry {
  readonly segments: ReadonlyArray<Segment>
  readonly rank: ReadonlyArray<number>
  readonly order: number
  readonly route:
    | {
      readonly tag: string
      readonly decodeParams: (raw: unknown) => Option.Option<unknown>
      readonly decodeQuery: (raw: unknown) => Option.Option<unknown>
    }
    | undefined
  readonly redirect: Redirect | undefined
}

const rankOf = (segments: ReadonlyArray<Segment>): ReadonlyArray<number> =>
  segments.map((segment) => segment._tag === "Static" ? 0 : segment._tag === "Param" ? 1 : 2)

const compareRank = (a: Entry, b: Entry): number => {
  const length = Math.max(a.rank.length, b.rank.length)
  for (let index = 0; index < length; index++) {
    const x = a.rank[index] ?? -1
    const y = b.rank[index] ?? -1
    if (x !== y) return x - y
  }
  return a.order - b.order
}

const matchShape = (
  segments: ReadonlyArray<Segment>,
  input: ReadonlyArray<string>
): Record<string, string> | undefined => {
  const params: Record<string, string> = {}
  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index]!
    if (segment._tag === "Rest") {
      params["*"] = input.slice(index).join("/")
      return params
    }
    const part = input[index]
    if (part === undefined) return undefined
    if (segment._tag === "Static") {
      if (part !== segment.value) return undefined
    } else {
      if (part === "") return undefined
      params[segment.name] = part
    }
  }
  return input.length === segments.length ? params : undefined
}

const fieldsSchema = (fields: Schema.Struct.Fields): Schema.Top => {
  const struct = Schema.Struct(fields)
  return Option.isSome(Schema.decodeUnknownOption(struct as unknown as Schema.Codec<unknown, unknown>)({}))
    ? struct.pipe(Schema.withConstructorDefault(Effect.succeed({}) as any)) as any
    : struct as any
}

const paramFieldsOf = (route: Any): Schema.Struct.Fields =>
  route.path.endsWith("*") ? { ...route.params, "*": Schema.String } : route.params

const build = (
  routes: Record<string, Any>,
  redirects: ReadonlyArray<Redirect>,
  baseRef: { value: string }
): any => {
  const cases: Record<string, Schema.Struct.Fields> = {}
  const entries: Array<Entry> = []
  const printers: Record<string, (route: any) => string> = {}
  let notFound: string | undefined
  let order = 0
  for (const [tag, route] of Object.entries(routes)) {
    const paramFields = paramFieldsOf(route)
    cases[tag] = { params: fieldsSchema(paramFields), query: fieldsSchema(route.query) }
    const segments = parseTemplate(route.path)
    if (route.path === "/*" && notFound === undefined) notFound = tag
    const paramsCodec = Schema.toCodecStringTree(Schema.Struct(paramFields)) as unknown as Schema.Codec<
      unknown,
      unknown
    >
    const queryCodec = Schema.toCodecStringTree(Schema.Struct(route.query)) as unknown as Schema.Codec<
      unknown,
      unknown
    >
    entries.push({
      segments,
      rank: rankOf(segments),
      order: order++,
      route: {
        tag,
        decodeParams: Schema.decodeUnknownOption(paramsCodec),
        decodeQuery: Schema.decodeUnknownOption(queryCodec)
      },
      redirect: undefined
    })
    const encodeParams = Schema.encodeUnknownSync(paramsCodec)
    const encodeQuery = Schema.encodeUnknownSync(queryCodec)
    printers[tag] = (value) => {
      const params = encodeParams(value.params ?? {}) as Record<string, string>
      const path = segments.map((segment) =>
        segment._tag === "Static"
          ? segment.value
          : segment._tag === "Param"
          ? encodeURIComponent(params[segment.name]!)
          : (params["*"] ?? "").split("/").map(encodeURIComponent).join("/")
      ).filter((part, index, all) => !(part === "" && index === all.length - 1 && index > 0)).join("/")
      const printed = baseRef.value === "#" ? `#/${path}` : `${baseRef.value}/${path}`.replace(/(.)\/$/, "$1")
      return printed + printQuery(encodeQuery(value.query ?? {}))
    }
  }
  for (const redirect of redirects) {
    const segments = parseTemplate(redirect.path)
    entries.push({ segments, rank: rankOf(segments), order: order++, route: undefined, redirect })
  }
  entries.sort(compareRank)

  const union = Schema.TaggedUnion(cases)

  const resolve = (href: string): Option.Option<Resolved<any>> => {
    // With the `#` base, the URL lives in the fragment.
    const inFragment = baseRef.value === "#"
    if (inFragment && !href.startsWith("#")) return Option.none()
    const url = inFragment ? href.slice(1) : href
    const hashAt = url.indexOf("#")
    const withoutHash = hashAt < 0 ? url : url.slice(0, hashAt)
    const queryAt = withoutHash.indexOf("?")
    let path = queryAt < 0 ? withoutHash : withoutHash.slice(0, queryAt)
    const search = queryAt < 0 ? "" : withoutHash.slice(queryAt + 1)
    const base = inFragment ? "" : baseRef.value
    if (base !== "") {
      if (path !== base && !path.startsWith(`${base}/`)) return Option.none()
      path = path.slice(base.length)
    }
    if (!path.startsWith("/")) path = `/${path}`
    const trimmed = path.length > 1 && path.endsWith("/") ? path.replace(/\/+$/, "") || "/" : path
    const input: Array<string> = []
    if (trimmed !== "/") {
      for (const part of trimmed.slice(1).split("/")) {
        const decoded = decodeComponent(part)
        if (decoded === undefined) return Option.none()
        input.push(decoded)
      }
    }
    const query = parseQuery(search)
    const fallback = (): Option.Option<Resolved<any>> =>
      notFound === undefined ? Option.none() : Option.some({
        route: union.make({ _tag: notFound, params: { "*": input.join("/") }, query: {} } as any),
        redirected: false
      })
    if (query === undefined) return fallback()
    for (const entry of entries) {
      const raw = matchShape(entry.segments, input)
      if (raw === undefined) continue
      if (entry.redirect !== undefined) {
        return Option.some({ route: entry.redirect.to(raw, query), redirected: true })
      }
      const route = entry.route!
      const params = route.decodeParams(raw)
      if (Option.isNone(params)) continue
      const decodedQuery = route.decodeQuery(query)
      if (Option.isNone(decodedQuery)) return fallback()
      return Option.some({
        route: { _tag: route.tag, params: params.value, query: decodedQuery.value },
        redirected: trimmed !== path
      })
    }
    return Option.none()
  }

  return Object.assign(union, {
    routes,
    resolve,
    parse: (url: string) => Option.map(resolve(url), (resolved) => resolved.route),
    print: (route: { readonly _tag: string }) => {
      const printer = printers[route._tag]
      if (printer === undefined) throw new Error(`No route for ${route._tag}`)
      return printer(route)
    },
    subset: (tags: ReadonlyArray<string>) =>
      build(Object.fromEntries(tags.map((tag) => [tag, routes[tag]!])), [], baseRef),
    base: () => baseRef.value,
    setBase: (base: string) => {
      baseRef.value = normaliseBase(base)
    }
  })
}

/**
 * Builds a route union from routes by tag, and redirects.
 *
 * **Details**
 *
 * The result is a `Schema.TaggedUnion` whose values are
 * `{ _tag, params, query }`, with `make`, `match`, `guards` and `isAnyOf`,
 * plus `parse`, `resolve`, `print` and `subset`. `make` fills in an empty
 * `params` or `query` when every field is optional.
 *
 * Declare a catch-all `"/*"` route, conventionally `NotFound`: it ranks
 * last, and a query that fails to decode resolves to it, so `parse` returns
 * a route for every URL under the base and the Model never holds an
 * `Option`. Without one, `parse` returns `Option.none()` for such URLs.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const union = <const Routes extends Record<string, Any>>(
  routes: Routes,
  ...redirects: ReadonlyArray<Redirect>
): Union<Routes> => build(routes, redirects, { value: "" })
