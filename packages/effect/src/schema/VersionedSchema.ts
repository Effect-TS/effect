/**
 * Declares the versions of an object schema and how to convert between
 * neighboring versions, so programs built at different versions can exchange
 * records.
 *
 * **Details**
 *
 * Every record carries its version in a `_version` field, except those of an
 * `unversioned` first version (see {@link make}). Decoding accepts any
 * declared version and upgrades it to the latest, so application code only
 * sees the latest version's payload. Encoding writes the latest version, or
 * older ones under {@link at}. Each step of a migration checks its result
 * against its version's payload, in both directions. Apart from `_version`, a
 * record is encoded like its version's payload, so JSON and binary
 * serializations write it like any other object.
 *
 * `HttpApi`, Rpc and cluster entities negotiate versions for the endpoints
 * and rpcs whose schemas contain versioned schemas, which each endpoint or rpc
 * looks for when it is built. Clients send the versions they speak in the
 * `effect-versions` header. Servers answer each listed type in the newest
 * version both sides know, or reject the request with
 * {@link VersionUnsupported} before running the handler. Every other type,
 * such as every type of a client that doesn't send the header, is answered at
 * its latest version, as servers answer without versioning, or at the version
 * {@link DefaultVersions} pins. A persisted entity message that a runner can't
 * read waits in storage for a runner that can instead, so rolling back a deploy
 * doesn't fail the messages newer runners wrote.
 *
 * **Gotchas**
 *
 * - A client on an older version can't send the fields its version lacks.
 *   Reading its record fills them from `addField` defaults, so a handler that
 *   saves it over a stored record should keep the stored values of those
 *   fields. Handlers can read the version a client speaks with
 *   {@link requestVersion}.
 * - Records carry their version, not their type. In a union of versioned
 *   types, an older record of one type can read as another, so tag their
 *   payloads, for example with `_tag`.
 * - Endpoints and rpcs only find the versioned schemas they can reach when
 *   they are built. Create versioned schemas before then, not inside a
 *   `Schema.suspend` thunk, and don't use them only inside a transformation's
 *   or declaration's functions. Recursive schemas are followed up to 64 levels
 *   deep and 2048 schemas, and a hierarchy whose levels look alike, such as
 *   one built by a helper, is followed only a few levels, so give each level
 *   its own identifier, one that varies with the type argument for a generic
 *   helper. Encoding a versioned schema that wasn't found is a defect that
 *   names it.
 * - Records carry their version only in JSON bodies, so `HttpApi` endpoints
 *   reject versioned schemas in params, query, headers and non-JSON payloads:
 *   when they are built, or for schemas behind `Schema.suspend`, when they are
 *   first used. Rpc defect schemas aren't looked through, so versioned schemas
 *   don't belong in them.
 * - `RpcSerialization.layerSchemaBinary` tells versions apart by `_version`,
 *   except with `fingerprintPayloads: true`, where both sides need identical
 *   schemas. An `unversioned` history changes its binary layout when it gets a
 *   second version, so binary peers adopting versioning must be upgraded
 *   together.
 * - Workflow activity results and durable deferred values aren't entity
 *   messages, so they don't wait: a build that can't read them fails the
 *   workflow's replay with a defect.
 *
 * @stability unstable
 * @since 4.1.0
 */
import type * as Brand from "../Brand.ts"
import type * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as ErrorReporter from "../ErrorReporter.ts"
import * as InternalVersionedSchema from "../internal/versionedSchema.ts"
import * as Predicate from "../Predicate.ts"
import * as Schema from "../Schema.ts"
import * as SchemaAST from "../SchemaAST.ts"
import * as SchemaIssue from "../SchemaIssue.ts"
import * as SchemaTransformation from "../SchemaTransformation.ts"

const VersionKey = "_version"

const VersionsBrand = "effect/schema/VersionedSchema/Versions"

// -----------------------------------------------------------------------------
// errors
// -----------------------------------------------------------------------------

/**
 * Error returned when a server can't use the version a client speaks: the
 * client is newer than the server, or older than every version the server
 * still supports.
 *
 * **Details**
 *
 * `HttpApi` responds with it as a `400` and Rpc fails the call with it, before
 * running the handler. `supported` holds the server's latest version of every
 * versioned type the endpoint or rpc uses. Provide it as {@link ClientVersions} to
 * retry the call at versions both sides know; a client older than `oldest`
 * can't retry.
 *
 * Cluster entities fail volatile messages with it. A persisted message a
 * runner can't read waits for a runner that can instead, and fails with it
 * only once `ShardingConfig.unknownVersionTimeout` has passed since it was
 * sent, which is no limit by default.
 *
 * **Example** (Retrying at the versions the server supports)
 *
 * ```ts
 * import { Effect } from "effect"
 * import { VersionedSchema } from "effect/schema"
 *
 * declare const update: Effect.Effect<void, VersionedSchema.VersionUnsupported>
 *
 * export const program = update.pipe(
 *   Effect.catchTag("VersionUnsupported", (error) =>
 *     update.pipe(Effect.provideService(VersionedSchema.ClientVersions, error.supported)))
 * )
 * ```
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export class VersionUnsupported extends Schema.TaggedError<VersionUnsupported>(
  "effect/schema/VersionedSchema/VersionUnsupported"
)("VersionUnsupported", {
  id: Schema.String,
  requested: Schema.Int,
  oldest: Schema.Int,
  supported: Schema.Record(Schema.String, Schema.Int).pipe(Schema.brand(VersionsBrand))
}, {
  description: "The server can't use the version of a versioned type the client speaks",
  httpApiStatus: 400
}) {
  override readonly [ErrorReporter.ignore] = true

  override get message(): string {
    const latest = this.supported[this.id]
    return latest !== undefined && this.requested > latest
      ? `${this.id} v${this.requested} is newer than this server supports (latest is v${latest})`
      : `${this.id} v${this.requested} is no longer supported (oldest is v${this.oldest})`
  }
}

/**
 * Error returned when a server can't write a value at the version a client
 * reads, for example a literal that was added in a newer version.
 *
 * **Details**
 *
 * `HttpApi` responds with it as a `406` and Rpc fails the call with it. It
 * happens while encoding the response, after the handler has run, so it is not
 * evidence that an operation had no side effects. A client that can't write
 * its own request at the versions it chose fails with it before sending.
 * Older payload refinements and encoding constraints can also reject a value
 * with this error, even when its TypeScript type matches the older payload.
 *
 * One such value fails the whole response, even inside a collection; a
 * handler can leave those values out using {@link requestVersion}. A stream fails at
 * the first one instead. Rpc streams and Server-Sent Events deliver the values
 * before it, then fail with this error. Cluster entity streams fail in place
 * of the chunk that holds it, so the values before it in that chunk are lost.
 * NDJSON bodies can't carry an error, so an NDJSON response, or a client's
 * streamed request, is aborted there and its reader fails to read it.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export class Unrepresentable extends Schema.TaggedError<Unrepresentable>(
  "effect/schema/VersionedSchema/Unrepresentable"
)("Unrepresentable", {
  id: Schema.String,
  version: Schema.Int,
  reason: Schema.String
}, {
  description: "A value has no equivalent at the version the other side reads",
  httpApiStatus: 406
}) {
  override readonly [ErrorReporter.ignore] = true

  override get message(): string {
    return this.reason
  }
}

// transports build these from negotiation, where versions are plain records
const errors: InternalVersionedSchema.Errors = {
  VersionUnsupported: VersionUnsupported as unknown as InternalVersionedSchema.Errors["VersionUnsupported"],
  Unrepresentable
}

const NoEquivalentTypeId = "~effect/schema/VersionedSchema/NoEquivalent"

/**
 * What a migration returns when a newer value has no equivalent in the older
 * version. Create it with {@link unrepresentable}.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface NoEquivalent {
  readonly [NoEquivalentTypeId]: typeof NoEquivalentTypeId
  readonly message: string | undefined
}

/**
 * Marks a newer value as having no equivalent in the older version, so writing
 * it at that version fails instead of guessing.
 *
 * **When to use**
 *
 * Use as the result of the `down` conversion of `mapField`, `addMember` or
 * `custom` when readers of the older version have no way to hold the value.
 *
 * **Example** (Rejecting a status older readers don't know)
 *
 * ```ts import.meta.vitest
 * import { Result, Schema } from "effect"
 * import { VersionedSchema } from "effect/schema"
 *
 * const Ticket = VersionedSchema.make("Ticket", {
 *   version: 1,
 *   payload: Schema.Struct({ status: Schema.Literals(["open", "closed"]) })
 * }).next({
 *   version: 2,
 *   payload: Schema.Struct({ status: Schema.Literals(["open", "closed", "archived"]) }),
 *   migration: (s) =>
 *     s.mapField("status", {
 *       up: (status) => status,
 *       down: (status) =>
 *         status === "archived" ? VersionedSchema.unrepresentable("archived tickets need version 2") : status
 *     })
 * })
 * const V1 = VersionedSchema.at(Ticket, Ticket.version(1))
 *
 * Schema.encodeSync(V1)({ status: "open" }) // => { _version: 1, status: "open" }
 * Result.isFailure(Schema.encodeResult(V1)({ status: "archived" })) // => true
 * ```
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const unrepresentable = (message?: string): NoEquivalent => ({
  [NoEquivalentTypeId]: NoEquivalentTypeId,
  message
})

const isNoEquivalent = (u: unknown): u is NoEquivalent => Predicate.hasProperty(u, NoEquivalentTypeId)

// -----------------------------------------------------------------------------
// negotiation
// -----------------------------------------------------------------------------

/**
 * Versions of versioned types: the versions a client call speaks, a server
 * answers requests without the `effect-versions` header at, or {@link at}
 * writes. Build them from the schemas, with each one's `version` method and
 * {@link versions}, so only declared types and versions type-check.
 * {@link VersionUnsupported} carries the versions a server supports as one.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type Versions = Readonly<Record<string, number>> & Brand.Brand<typeof VersionsBrand>

/**
 * Combines the versions of several types into one, for example to write two
 * nested types at older versions. A type given twice gets its last version.
 *
 * **Example** (Writing a person and its address at older versions)
 *
 * ```ts import.meta.vitest
 * import { Schema } from "effect"
 * import { VersionedSchema } from "effect/schema"
 *
 * const Address = VersionedSchema.make("Address", {
 *   version: 1,
 *   payload: Schema.Struct({ street: Schema.String })
 * }).next({
 *   version: 2,
 *   payload: Schema.Struct({ street: Schema.String, city: Schema.optionalKey(Schema.String) }),
 *   migration: (s) => s.addField("city")
 * })
 * const Person = VersionedSchema.make("Person", {
 *   version: 1,
 *   payload: Schema.Struct({ name: Schema.String, address: Address })
 * }).next({
 *   version: 2,
 *   payload: Schema.Struct({ fullName: Schema.String, address: Address }),
 *   migration: (s) => s.renameField("name", "fullName")
 * })
 * const writeOld = Schema.encodeSync(
 *   VersionedSchema.at(Person, VersionedSchema.versions(Person.version(1), Address.version(1)))
 * )
 *
 * writeOld({ fullName: "Ada", address: { street: "Main St" } }) // => { _version: 1, name: "Ada", address: { _version: 1, street: "Main St" } }
 * ```
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const versions = (...versions: ReadonlyArray<Versions>): Versions =>
  Object.freeze(Object.assign({}, ...versions))

/**
 * The versions a client call speaks. Only `HttpApiClient`, `RpcClient` and
 * cluster entity clients read it.
 *
 * **Details**
 *
 * By default a call speaks the latest version of every type it uses. Provide
 * this reference around a call to speak older versions, for example to retry
 * after a `VersionUnsupported` error, or around the program that makes the
 * calls to keep writing older versions until every server can read the new
 * ones. Calls read it when they're made, so providing it to the layer that
 * builds a client has no effect. A type it leaves out uses the latest version,
 * and so does a version above this build's latest, which only versions a
 * server sent can name. Servers never set it, so a handler that calls another
 * service doesn't pass its caller's versions along.
 *
 * **Example** (Writing Person v1 until every server reads v2)
 *
 * ```ts
 * import { Effect, Schema } from "effect"
 * import { VersionedSchema } from "effect/schema"
 *
 * const Person = VersionedSchema.make("Person", {
 *   version: 1,
 *   payload: Schema.Struct({ name: Schema.String })
 * }).next({
 *   version: 2,
 *   payload: Schema.Struct({ fullName: Schema.String }),
 *   migration: (s) => s.renameField("name", "fullName")
 * })
 *
 * declare const program: Effect.Effect<void>
 *
 * export const main = program.pipe(Effect.provideService(VersionedSchema.ClientVersions, Person.version(1)))
 * ```
 *
 * @stability unstable
 * @category references
 * @since 4.1.0
 */
export const ClientVersions: Context.Reference<Versions> = InternalVersionedSchema.ClientVersions as any

/**
 * Name of the header in which clients send the versions they speak, for
 * example `effect-versions: Address=2, Person=3`.
 *
 * **Details**
 *
 * A server answers each type the header lists at the newest version both
 * sides know. A type it leaves out, such as every type of a client that
 * doesn't send the header, is answered at its latest version, or at the
 * version {@link DefaultVersions} pins. `HttpApiClient`, `RpcClient` and
 * cluster entity clients list every type a call uses.
 *
 * **Gotchas**
 *
 * The header makes cross-origin browser requests to versioned endpoints send
 * a CORS preflight first. Behind CORS with an explicit list of allowed
 * headers, add this one, or browsers reject the preflight request.
 *
 * @stability unstable
 * @category constants
 * @since 4.1.0
 */
export const header: "effect-versions" = InternalVersionedSchema.header

/**
 * The version of `schema` the current request was negotiated at, which its
 * responses write `schema` at. Servers negotiate it for the middleware and
 * handler of every endpoint, rpc and cluster entity whose schemas use
 * `schema`. Anywhere else, it's the latest version.
 *
 * **When to use**
 *
 * Use when a handler saves a client's record over a stored one. A client on
 * an older version can't send the fields its version lacks, so keep the
 * stored values of those fields instead of overwriting them.
 *
 * **Example** (Keeping a field an older client can't send)
 *
 * ```ts
 * import { Effect, Schema } from "effect"
 * import { VersionedSchema } from "effect/schema"
 *
 * const Person = VersionedSchema.make("Person", {
 *   version: 1,
 *   payload: Schema.Struct({ fullName: Schema.String })
 * }).next({
 *   version: 2,
 *   payload: Schema.Struct({ fullName: Schema.String, email: Schema.optionalKey(Schema.String) }),
 *   migration: (step) => step.addField("email")
 * })
 *
 * type Person = typeof Person.Type
 *
 * // Person v1 has no `email`, so keep the stored one
 * export const merge = (stored: Person, received: Person) =>
 *   Effect.map(VersionedSchema.requestVersion(Person), (version): Person =>
 *     version === 1 && stored.email !== undefined ? { ...received, email: stored.email } : received)
 * ```
 *
 * @stability unstable
 * @category getters
 * @since 4.1.0
 */
export const requestVersion = <Id extends string, Vs extends VersionSchemas>(
  schema: VersionedSchema<Id, Vs>
): Effect.Effect<Vs[number]["version"]> => {
  const latest = InternalVersionedSchema.latest(InternalVersionedSchema.getHistory(schema.ast)!)
  return Effect.map(
    InternalVersionedSchema.RequestVersions,
    (versions) => Object.hasOwn(versions, schema.id) ? versions[schema.id] : latest
  )
}

/**
 * The versions a server answers the types a request doesn't list at. Clients
 * that negotiate list every type they use, so in practice this is what clients
 * that don't send the `effect-versions` header get. A type it doesn't pin is
 * answered at its latest version.
 *
 * **When to use**
 *
 * Use when clients built before versioning are still in use as a type gets
 * its second version: pin the first version until they've upgraded, then
 * remove the pin. Provide it where the server is built.
 *
 * **Gotchas**
 *
 * Every request without the header gets the pinned versions, including tools
 * such as `curl`, which can send the header to get newer ones.
 *
 * **Example** (Answering clients without the header at Person v1)
 *
 * ```ts
 * import { Layer, Schema } from "effect"
 * import { VersionedSchema } from "effect/schema"
 *
 * const Person = VersionedSchema.make("Person", {
 *   version: 1,
 *   payload: Schema.Struct({ name: Schema.String }),
 *   unversioned: true
 * }).next({
 *   version: 2,
 *   payload: Schema.Struct({ fullName: Schema.String }),
 *   migration: (s) => s.renameField("name", "fullName")
 * })
 *
 * export const PinPersonV1 = Layer.succeed(VersionedSchema.DefaultVersions, Person.version(1))
 * ```
 *
 * @stability unstable
 * @category references
 * @since 4.1.0
 */
export const DefaultVersions: Context.Reference<Versions> = InternalVersionedSchema.DefaultVersions as any

// -----------------------------------------------------------------------------
// type-level helpers
// -----------------------------------------------------------------------------

type Simplify<A> = { [K in keyof A]: A[K] } & {}

type OptionalKeys<A> = { [K in keyof A]-?: {} extends Pick<A, K> ? K : never }[keyof A]

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false

type Identical<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false

// these distribute over unions, so field operations apply to every member
type Rename<A, From extends PropertyKey, To extends PropertyKey> = A extends unknown ?
  { [K in keyof A as K extends From ? To : K]: A[K] }
  : never

type Replace<A, K extends PropertyKey, V> = A extends unknown ? { [P in keyof A]: P extends K ? V : A[P] } : never

type Without<A, K extends PropertyKey> = A extends unknown ? Omit<A, K> : never

type IsUnion<A, B = A> = A extends unknown ? ([B] extends [A] ? false : true) : never

type Tag<A> = A extends { readonly _tag: infer T extends string } ? T : never

type Member<A, T> = Extract<A, { readonly _tag: T }>

type Others<A, T> = Exclude<A, { readonly _tag: T }>

type MissingKeys<C, N> = Exclude<keyof N, keyof C>
type ExtraKeys<C, N> = Exclude<keyof C, keyof N>
type Mismatched<C, N> = {
  [K in keyof C & keyof N]-?: Same<C[K], N[K]> extends true
    ? Same<K extends OptionalKeys<C> ? true : false, K extends OptionalKeys<N> ? true : false> extends true ? never : K
    : K
}[keyof C & keyof N]

type FieldsCheck<C, N> = [MissingKeys<C, N> | ExtraKeys<C, N> | Mismatched<C, N>] extends [never] ? unknown
  : {
    readonly "only in the new version (addField or renameField)": MissingKeys<C, N>
    readonly "only in the old version (removeField or renameField)": ExtraKeys<C, N>
    readonly "changed (mapField)": {
      readonly [K in Mismatched<C, N>]: { readonly old: C[K]; readonly new: N[K] }
    }
  }

type ChangedMembers<C, N> = {
  [T in Tag<C> & Tag<N>]: unknown extends FieldsCheck<Member<C, T>, Member<N, T>> ? never : T
}[Tag<C> & Tag<N>]

type Untagged<A> = Exclude<A, { readonly _tag: string }>

type MembersCheck<C, N> = [Tag<C> | Tag<N>] extends [never] ? Same<C, N> extends true ? unknown
  : { readonly "different members": { readonly old: C; readonly new: N } }
  : Same<Untagged<C>, Untagged<N>> extends false ?
    { readonly "different untagged members": { readonly old: Untagged<C>; readonly new: Untagged<N> } }
  : [Exclude<Tag<N>, Tag<C>> | Exclude<Tag<C>, Tag<N>> | ChangedMembers<C, N>] extends [never] ? unknown
  : {
    readonly "members only in the new version (addMember)": Exclude<Tag<N>, Tag<C>>
    readonly "members only in the old version (removeMember)": Exclude<Tag<C>, Tag<N>>
    readonly "members that changed (custom)": {
      readonly [T in ChangedMembers<C, N>]: FieldsCheck<Member<C, T>, Member<N, T>>
    }
  }

// `unknown` when a step turns the previous version into exactly the next one,
// and otherwise an object describing the difference, shown in the compiler
// message for `next`
type StepCheck<C, N> = [IsUnion<C> | IsUnion<N>] extends [false]
  ? unknown extends FieldsCheck<C, N> ? unknown : { readonly "~stepError": FieldsCheck<C, N> }
  : unknown extends MembersCheck<C, N> ? unknown
  : { readonly "~stepError": MembersCheck<C, N> }

// `Marked` is false for the first version of an unversioned history, whose
// records have no `_version`
type Version<S extends Schema.Top = Schema.Top, N extends number = number, Marked extends boolean = boolean> =
  & S
  & { readonly version: N; readonly marked: Marked }

type VersionSchemas = readonly [Version, ...Array<Version>]

type Last<Vs extends VersionSchemas> = Vs extends readonly [...Array<Version>, infer L extends Version] ? L : never

type Tagged<E, N, Marked> = E extends unknown
  ? Simplify<(Marked extends true ? { readonly _version: N } : { readonly _version?: never }) & E>
  : never

// the encoded records of a version
type Records<V> = V extends Version ? Tagged<V["Encoded"], V["version"], V["marked"]> : never

// the decoded fields that migrations read and write
type VersionData<S> = S extends { readonly members: ReadonlyArray<infer M> } ? VersionData<M>
  : S extends { readonly fields: infer F extends Schema.Struct.Fields } ? Schema.Struct.Type<F>
  : S extends Schema.Top ? S["Type"]
  : never

type NewVersion<N extends number, Vs extends VersionSchemas> = N extends Vs[number]["version"] ? never : unknown

type KeysOf<A> = A extends unknown ? keyof A : never

// records are objects, and `_version` is reserved
type ObjectCheck<S extends Schema.Top> = [S["Encoded"]] extends [object]
  ? Extract<S["Encoded"], ReadonlyArray<unknown> | Function> extends never
    ? typeof VersionKey extends KeysOf<S["Encoded"]> ? never : unknown
  : never
  : never

type Property<S, K extends PropertyKey> = K extends keyof S ? S[K] : never
type Values<S> = S[keyof S]
type Items<S> = S extends ReadonlyArray<infer A> ? A : never

// the schemas a schema is built from, wherever combinators keep them
// A declaration's type parameters, such as the node and edge of
// `Schema.Graph`. Most schemas leave them `any`, which would absorb every other
// child in the union, so those contribute none.
type TypeParameters<S> = Property<S, "~type.parameters"> extends infer P ? 0 extends 1 & P ? never : Items<P>
  : never

type Children<S> =
  | Values<Property<S, "fields" | "cases">>
  | Items<Property<S, "members" | "elements" | "rest" | "records">>
  | TypeParameters<S>
  | Property<
    S,
    "schema" | "value" | "key" | "from" | "to" | "events" | "success" | "failure" | "error" | "defect"
  >
  | (S extends { readonly ast: SchemaAST.Suspend } ? S extends Schema.suspend<infer Inner> ? Inner : never : never)

// The walk ends without tracking what it has seen: a recursive schema reaches
// itself only through `Schema.suspend`, whose inner schema is typed as a plain
// codec. That keeps each result shared by every path that reaches it.
type Contains<S> = 0 extends 1 & S ? false
  : S extends { readonly "~versioned": string } ? true
  // `Schema.toType` of a versioned schema isn't versioned: its encoded type is
  // exactly the inner decoded type, which a versioned schema's records never
  // are, so wrappers such as `Schema.optional` aren't mistaken for it. Nor are
  // `Schema.toEncoded` and `Schema.flip`, whose decoded type is exactly the
  // inner encoded type.
  : S extends { readonly schema: infer Inner extends Schema.Top } & Schema.Top
    ? Identical<S["Encoded"], Inner["Type"]> extends true ? false
    : Identical<S["Type"], Inner["Encoded"]> extends true ? false
    : Contains<Children<S>>
  : Contains<Children<S>>

/**
 * The errors version negotiation adds to an endpoint or rpc whose schemas are
 * `S`: `VersionUnsupported | Unrepresentable` when they contain a versioned
 * schema, and `never` otherwise.
 *
 * **Gotchas**
 *
 * A versioned schema typed as a plain `Schema.Codec` isn't found. Its
 * endpoints and rpcs still negotiate, so their error types leave out errors
 * they can fail with. For a recursive schema, annotate the `Schema.suspend`
 * thunks rather than the schema, so it keeps its type.
 *
 * @stability unstable
 * @category utility types
 * @since 4.1.0
 */
export type NegotiationErrors<S> = true extends Contains<S> ? VersionUnsupported | Unrepresentable : never

// -----------------------------------------------------------------------------
// models
// -----------------------------------------------------------------------------

/**
 * Builds the migration from one version to the next, one operation at a time.
 *
 * **Details**
 *
 * `Prev` is the previous version's data, `Cur` is what the operations so far
 * turn it into, and `Next` is the next version's data. `next` only compiles
 * once `Cur` is exactly `Next`. Field operations apply to every member of a
 * union. Each operation also says how to undo it, for writing older versions.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface StepBuilder<Prev, Cur, Next> {
  readonly "~current": Cur

  /**
   * Renames a field and keeps its value.
   *
   * **Example** (Reading and writing a renamed field)
   *
   * ```ts import.meta.vitest
   * import { Schema } from "effect"
   * import { VersionedSchema } from "effect/schema"
   *
   * const Person = VersionedSchema.make("Person", {
   *   version: 1,
   *   payload: Schema.Struct({ name: Schema.String })
   * }).next({
   *   version: 2,
   *   payload: Schema.Struct({ fullName: Schema.String }),
   *   migration: (s) => s.renameField("name", "fullName")
   * })
   *
   * Schema.decodeUnknownSync(Person)({ _version: 1, name: "Ada" }) // => { fullName: "Ada" }
   * Schema.encodeSync(VersionedSchema.at(Person, Person.version(1)))({ fullName: "Ada" }) // => { _version: 1, name: "Ada" }
   * ```
   */
  renameField<const From extends keyof Cur & string, const To extends Exclude<keyof Next, keyof Cur> & string>(
    from: From,
    to: To
  ): StepBuilder<Prev, Simplify<Rename<Cur, From, To>>, Next>

  /**
   * Adds a field. Writing an older version drops it.
   *
   * **Details**
   *
   * A required field needs `up`, which computes its value from the previous
   * version's data. An optional field takes no `up`: it stays absent in
   * upgraded records, so a partial update from an older client doesn't
   * overwrite the field with a default.
   *
   * **Example** (Adding a required and an optional field)
   *
   * ```ts import.meta.vitest
   * import { Schema } from "effect"
   * import { VersionedSchema } from "effect/schema"
   *
   * const Person = VersionedSchema.make("Person", {
   *   version: 1,
   *   payload: Schema.Struct({ name: Schema.String })
   * }).next({
   *   version: 2,
   *   payload: Schema.Struct({
   *     name: Schema.String,
   *     active: Schema.Boolean,
   *     email: Schema.optionalKey(Schema.String)
   *   }),
   *   migration: (s) => s.addField("active", () => true).addField("email")
   * })
   *
   * Schema.decodeUnknownSync(Person)({ _version: 1, name: "Ada" }) // => { name: "Ada", active: true }
   * ```
   */
  addField<
    const K extends Exclude<keyof Next, keyof Cur> & string,
    U extends (K extends OptionalKeys<Next> ? [] : [up: (prev: Prev) => Next[K]])
  >(key: K, ...up: U): StepBuilder<Prev, Simplify<Cur & Pick<Next, K>>, Next>

  /**
   * Removes a field. Upgrading drops it; when the older version requires the
   * field, `down` computes it for older readers.
   *
   * **Example** (Supplying a value for a removed required field)
   *
   * ```ts import.meta.vitest
   * import { Schema } from "effect"
   * import { VersionedSchema } from "effect/schema"
   *
   * const Person = VersionedSchema.make("Person", {
   *   version: 1,
   *   payload: Schema.Struct({ name: Schema.String, nickname: Schema.String })
   * }).next({
   *   version: 2,
   *   payload: Schema.Struct({ name: Schema.String }),
   *   migration: (s) => s.removeField("nickname", (person) => person.name)
   * })
   *
   * Schema.decodeUnknownSync(Person)({ _version: 1, name: "Ada", nickname: "A" }) // => { name: "Ada" }
   * Schema.encodeSync(VersionedSchema.at(Person, Person.version(1)))({ name: "Ada" }) // => { _version: 1, name: "Ada", nickname: "Ada" }
   * ```
   */
  removeField<
    const K extends Exclude<keyof Cur, keyof Next> & string,
    D extends (K extends OptionalKeys<Cur> ? [down?: (next: Next) => Cur[K]] : [down: (next: Next) => Cur[K]])
  >(key: K, ...down: D): StepBuilder<Prev, Simplify<Without<Cur, K>>, Next>

  /**
   * Changes the type of one field, with a conversion in each direction.
   * `down` returns {@link unrepresentable} for values older readers can't
   * hold. Absent optional fields stay absent.
   *
   * **Example** (Adding a literal to a field)
   *
   * ```ts import.meta.vitest
   * import { Schema } from "effect"
   * import { VersionedSchema } from "effect/schema"
   *
   * const Ticket = VersionedSchema.make("Ticket", {
   *   version: 1,
   *   payload: Schema.Struct({ status: Schema.Literals(["open", "closed"]) })
   * }).next({
   *   version: 2,
   *   payload: Schema.Struct({ status: Schema.Literals(["open", "closed", "archived"]) }),
   *   migration: (s) =>
   *     s.mapField("status", {
   *       up: (status) => status,
   *       down: (status) => status === "archived" ? "closed" : status
   *     })
   * })
   *
   * Schema.encodeSync(VersionedSchema.at(Ticket, Ticket.version(1)))({ status: "archived" }) // => { _version: 1, status: "closed" }
   * ```
   */
  mapField<const K extends keyof Cur & keyof Next & string>(
    key: K,
    f: {
      readonly up: (value: Cur[K]) => Next[K]
      readonly down: (value: Next[K]) => Cur[K] | NoEquivalent
    }
  ): StepBuilder<Prev, Simplify<Replace<Cur, K, Next[K]>>, Next>

  /**
   * Adds a member to a tagged union. `down` says what the new member becomes
   * for older readers; without it, the member has no equivalent in older
   * versions.
   *
   * **Example** (Adding an event older readers can't represent)
   *
   * ```ts import.meta.vitest
   * import { Result, Schema } from "effect"
   * import { VersionedSchema } from "effect/schema"
   *
   * const Created = Schema.TaggedStruct("Created", { name: Schema.String })
   * const Renamed = Schema.TaggedStruct("Renamed", { name: Schema.String })
   * const Event = VersionedSchema.make("Event", {
   *   version: 1,
   *   payload: Schema.Union([Created])
   * }).next({
   *   version: 2,
   *   payload: Schema.Union([Created, Renamed]),
   *   migration: (s) => s.addMember("Renamed")
   * })
   * const V1 = VersionedSchema.at(Event, Event.version(1))
   *
   * Schema.encodeSync(V1)({ _tag: "Created", name: "Ada" }) // => { _version: 1, _tag: "Created", name: "Ada" }
   * Result.isFailure(Schema.encodeResult(V1)({ _tag: "Renamed", name: "Ada" })) // => true
   * ```
   */
  addMember<const T extends Exclude<Tag<Next>, Tag<Cur>>>(
    tag: T,
    down?: (value: Member<Next, T>) => Cur | NoEquivalent
  ): StepBuilder<Prev, Cur | Member<Next, T>, Next>

  /**
   * Removes a member from a tagged union. `up` says what older data with that
   * member becomes.
   */
  removeMember<const T extends Exclude<Tag<Cur>, Tag<Next>>>(
    tag: T,
    up: (value: Member<Cur, T>) => Others<Cur, T>
  ): StepBuilder<Prev, Others<Cur, T>, Next>

  /**
   * Describes the whole step by hand, for changes the other operations can't
   * express.
   *
   * **Example** (Combining two fields into a nested object)
   *
   * ```ts import.meta.vitest
   * import { Schema } from "effect"
   * import { VersionedSchema } from "effect/schema"
   *
   * const Person = VersionedSchema.make("Person", {
   *   version: 1,
   *   payload: Schema.Struct({ given: Schema.String, family: Schema.String })
   * }).next({
   *   version: 2,
   *   payload: Schema.Struct({ name: Schema.Struct({ given: Schema.String, family: Schema.String }) }),
   *   migration: (s) =>
   *     s.custom({
   *       up: ({ given, family }) => ({ name: { given, family } }),
   *       down: ({ name }) => ({ given: name.given, family: name.family })
   *     })
   * })
   *
   * Schema.decodeUnknownSync(Person)({ _version: 1, given: "Ada", family: "Lovelace" }) // => { name: { given: "Ada", family: "Lovelace" } }
   * ```
   */
  custom(f: {
    readonly up: (value: Cur) => Next
    readonly down: (value: Next) => Cur | NoEquivalent
  }): StepBuilder<Prev, Next, Next>
}

/**
 * A schema with explicitly numbered versions, identified by `Id`.
 *
 * **Details**
 *
 * It decodes records of any declared version into the latest version's type,
 * and encodes the latest version. Use {@link at} to encode older versions. Its
 * encoded type is the union of every version's records.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface VersionedSchema<Id extends string, Vs extends VersionSchemas> extends
  Schema.Codec<
    Last<Vs>["Type"],
    Records<Vs[number]>,
    Vs[number]["DecodingServices"],
    Vs[number]["EncodingServices"]
  >
{
  readonly "Rebuild": Rebuilt<
    Id,
    Last<Vs>["Type"],
    Records<Vs[number]>,
    Vs[number]["DecodingServices"],
    Vs[number]["EncodingServices"],
    Last<Vs>["~type.make.in"],
    Last<Vs>["~type.make"]
  >
  readonly "~type.make.in": Last<Vs>["~type.make.in"]
  readonly "~type.make": Last<Vs>["~type.make"]
  readonly "~type.mutability": "readonly"
  readonly "~type.optionality": "required"
  readonly "~type.constructor.default": "no-default"
  readonly "~encoded.mutability": "readonly"
  readonly "~encoded.optionality": "required"
  readonly "~versioned": Id
  readonly id: Id

  /**
   * This type at one of its declared versions, for {@link at},
   * {@link ClientVersions} and {@link DefaultVersions}. Combine several types'
   * versions with {@link versions}.
   *
   * **Gotchas**
   *
   * Only the schema `make` or `next` returns has it: `annotate`, `check` and
   * the other combinators that rebuild a schema drop it, so keep that binding.
   * For a recursive schema, annotate the `Schema.suspend` thunks rather than
   * the schema. It throws for an undeclared version, which the types already
   * rule out.
   */
  version(version: Vs[number]["version"]): Versions

  /**
   * Adds a version whose decoded data is the same as the previous version's,
   * for example when only a field's encoding changes.
   */
  next<const S extends Schema.Top, const N extends number>(
    options: {
      readonly version: N & NewVersion<N, Vs>
      readonly payload: S & ObjectCheck<S>
      readonly migration?: never
    } & StepCheck<VersionData<Last<Vs>>, VersionData<S>>
  ): VersionedSchema<Id, readonly [...Vs, Version<S, N, true>]>

  /**
   * Adds a version, with the migration from the previous version.
   *
   * **Example** (Composing operations into one step)
   *
   * ```ts import.meta.vitest
   * import { Schema } from "effect"
   * import { VersionedSchema } from "effect/schema"
   *
   * const Person = VersionedSchema.make("Person", {
   *   version: 1,
   *   payload: Schema.Struct({ name: Schema.String })
   * }).next({
   *   version: 2,
   *   payload: Schema.Struct({ fullName: Schema.String, active: Schema.Boolean }),
   *   migration: (s) => s.renameField("name", "fullName").addField("active", () => true)
   * })
   *
   * Schema.decodeUnknownSync(Person)({ _version: 1, name: "Ada" }) // => { fullName: "Ada", active: true }
   * ```
   */
  next<const S extends Schema.Top, const N extends number, C>(options: {
    readonly version: N & NewVersion<N, Vs>
    readonly payload: S & ObjectCheck<S>
    readonly migration: (
      s: StepBuilder<VersionData<Last<Vs>>, VersionData<Last<Vs>>, VersionData<S>>
    ) => StepBuilder<VersionData<Last<Vs>>, C, VersionData<S>> & StepCheck<C, VersionData<S>>
  }): VersionedSchema<Id, readonly [...Vs, Version<S, N, true>]>
}

// What `annotate`, `check`, `brand` and the other combinators that rebuild a
// schema return for a versioned one: still versioned for `NegotiationErrors`,
// but without `next`.
interface Rebuilt<Id extends string, T, E, RD, RE, MakeIn, Make> extends Schema.Codec<T, E, RD, RE> {
  readonly "Rebuild": Rebuilt<Id, T, E, RD, RE, MakeIn, Make>
  readonly "~versioned": Id
  readonly "~type.make.in": MakeIn
  readonly "~type.make": Make
  readonly "~type.mutability": "readonly"
  readonly "~type.optionality": "required"
  readonly "~type.constructor.default": "no-default"
  readonly "~encoded.mutability": "readonly"
  readonly "~encoded.optionality": "required"
}

// -----------------------------------------------------------------------------
// implementation
// -----------------------------------------------------------------------------

interface Op {
  readonly description: string
  readonly up: (value: any, prev: any) => any
  readonly down: (value: any, next: any) => any
}

interface Step {
  readonly from: number
  readonly to: number
  readonly ops: ReadonlyArray<Op>
}

interface Declaration {
  readonly version: number
  readonly payload: Schema.Top
  /** the decoded fields, which data is reduced to before constructing a value */
  readonly keys: ReadonlySet<PropertyKey>
  /** the payload's encoded form */
  readonly encoded: SchemaAST.Objects | SchemaAST.Union
}

const hasOwn = (o: object, key: PropertyKey) => Object.hasOwn(o, key)

const omit = (value: any, key: PropertyKey) => {
  if (!hasOwn(value, key)) return value
  const out = { ...value }
  delete out[key]
  return out
}

const renameKey = (value: any, from: string, to: string) => {
  if (!hasOwn(value, from)) return value
  const out = omit(value, from)
  out[to] = value[from]
  return out
}

const hasTag = (value: unknown, tag: string): boolean => Predicate.hasProperty(value, "_tag") && value._tag === tag

const isPlainObject = (u: unknown): u is Record<PropertyKey, unknown> => {
  if (typeof u !== "object" || u === null || Array.isArray(u)) return false
  const proto = Object.getPrototypeOf(u)
  return proto === Object.prototype || proto === null
}

// Migrations see plain data, so class instances are spread into objects.
const toData = (value: unknown): unknown =>
  typeof value === "object" && value !== null && !Array.isArray(value) && !isPlainObject(value)
    ? { ...value }
    : value

const pick = (value: unknown, keys: ReadonlySet<PropertyKey>): unknown => {
  if (!isPlainObject(value)) return value
  const out: Record<PropertyKey, unknown> = {}
  for (const key of Reflect.ownKeys(value)) if (keys.has(key)) out[key] = value[key]
  return out
}

const describeNoEquivalent = (r: NoEquivalent, fallback: string): NoEquivalent =>
  r.message === undefined ? unrepresentable(fallback) : r

class StepBuilderImpl implements StepBuilder<any, any, any> {
  declare readonly "~current": any
  readonly ops: ReadonlyArray<Op>
  constructor(ops: ReadonlyArray<Op>) {
    this.ops = ops
  }
  private push(op: Op): any {
    return new StepBuilderImpl([...this.ops, op])
  }
  renameField(from: string, to: string) {
    return this.push({
      description: `rename ${from} to ${to}`,
      up: (v) => renameKey(v, from, to),
      down: (v) => renameKey(v, to, from)
    })
  }
  addField(key: string, up?: (prev: any) => any) {
    return this.push({
      description: `add ${key}`,
      up: (v, prev) => up === undefined ? v : { ...v, [key]: up(prev) },
      down: (v) => omit(v, key)
    })
  }
  removeField(key: string, down?: (next: any) => any) {
    return this.push({
      description: `remove ${key}`,
      up: (v) => omit(v, key),
      down: (v, next) => down === undefined ? v : { ...v, [key]: down(next) }
    })
  }
  mapField(key: string, f: { readonly up: (a: any) => any; readonly down: (b: any) => any }) {
    return this.push({
      description: `map ${key}`,
      up: (v) => hasOwn(v, key) ? { ...v, [key]: f.up(v[key]) } : v,
      down: (v) => {
        if (!hasOwn(v, key)) return v
        const r = f.down(v[key])
        return isNoEquivalent(r) ? describeNoEquivalent(r, `${key} has no equivalent`) : { ...v, [key]: r }
      }
    })
  }
  addMember(tag: string, down?: (value: any) => unknown) {
    return this.push({
      description: `add member ${tag}`,
      up: (v) => v,
      down: (v) => {
        if (!hasTag(v, tag)) return v
        const r = down === undefined ? unrepresentable() : down(v)
        return isNoEquivalent(r) ? describeNoEquivalent(r, `${tag} has no equivalent`) : r
      }
    })
  }
  removeMember(tag: string, up: (value: any) => unknown) {
    return this.push({
      description: `remove member ${tag}`,
      up: (v) => hasTag(v, tag) ? up(v) : v,
      down: (v) => v
    })
  }
  custom(f: { readonly up: (a: any) => any; readonly down: (b: any) => any }) {
    return this.push({
      description: "custom migration",
      up: (v) => f.up(v),
      down: (v) => {
        const r = f.down(v)
        return isNoEquivalent(r) ? describeNoEquivalent(r, "no equivalent") : r
      }
    })
  }
}

const invalid = (message: string, input?: unknown) => new SchemaIssue.InvalidValue({ message }, input)

const decodedKeys = (ast: SchemaAST.AST, keys: Set<PropertyKey>): void => {
  if (SchemaAST.isObjects(ast)) { for (const p of ast.propertySignatures) keys.add(p.name) }
  else if (SchemaAST.isUnion(ast)) { for (const member of ast.types) decodedKeys(member, keys) }
  else {
    const constructor = SchemaAST.getConstructorDescriptor(ast)
    if (constructor !== undefined) decodedKeys(constructor.link.to, keys)
  }
}

const encodedRecord = (id: string, version: number, ast: SchemaAST.AST): SchemaAST.Objects | SchemaAST.Union => {
  if (SchemaAST.isObjects(ast)) {
    if (ast.indexSignatures.length > 0 || ast.propertySignatures.some((p) => p.name === VersionKey)) {
      throw new Error(`VersionedSchema ${id} v${version}: records must have fixed keys other than ${VersionKey}`)
    }
    return ast
  }
  if (SchemaAST.isUnion(ast)) {
    for (const member of ast.types) encodedRecord(id, version, member)
    return ast
  }
  throw new Error(`VersionedSchema ${id} v${version}: records must be encoded as objects`)
}

// Adds the `_version` field to the encoded form of a payload, or to each member
// of a union.
const withVersionField = (ast: SchemaAST.AST, field: SchemaAST.PropertySignature): SchemaAST.AST =>
  SchemaAST.isUnion(ast)
    ? new SchemaAST.Union(
      ast.types.map((member) => withVersionField(member, field)),
      ast.options,
      ast.annotations,
      ast.checks
    )
    : new SchemaAST.Objects([field, ...(ast as SchemaAST.Objects).propertySignatures], [], ast.annotations, ast.checks)

// A suspended schema in a payload's encoded form leads to an encoded copy of
// the versioned schema it reaches. Leading to that schema's records instead
// closes the cycle of a recursive history: codecs derived from the records
// (JSON, SchemaBinary) then reach the same node again, not a new copy at every
// level.
const tieRecursion = (ast: SchemaAST.AST): SchemaAST.AST => {
  if (SchemaAST.isSuspend(ast)) {
    return new SchemaAST.Suspend(
      () => {
        const target = ast.thunk()
        return (target.annotations?.[InternalVersionedSchema.RecordsKey] as History | undefined)?.records ?? target
      },
      ast.annotations,
      undefined,
      undefined,
      ast.context
    )
  }
  return "recur" in ast ? (ast as { recur: (f: typeof tieRecursion) => SchemaAST.AST }).recur(tieRecursion) : ast
}

const declare = (id: string, version: number, payload: Schema.Top): Declaration => {
  if (!Number.isSafeInteger(version) || version < 1) {
    throw new Error(`VersionedSchema ${id}: invalid version ${version}`)
  }
  if (!Schema.isSchema(payload)) throw new Error(`VersionedSchema ${id} v${version}: payload must be a Schema`)
  const keys = new Set<PropertyKey>()
  decodedKeys(payload.ast, keys)
  return {
    version,
    payload,
    keys,
    encoded: encodedRecord(id, version, tieRecursion(SchemaAST.toEncoded(payload.ast)))
  }
}

// "1", "1 or 2", "1, 2 or 3"
const formatVersions = (versions: ReadonlyArray<number>): string =>
  versions.length === 1 ? String(versions[0]) : `${versions.slice(0, -1).join(", ")} or ${versions.at(-1)}`

const expectedRecord = (id: string, versions: ReadonlyArray<number>, unversioned: boolean): string => {
  if (!unversioned) return `Expected ${id} with ${VersionKey} ${formatVersions(versions)}`
  return versions.length === 1
    ? `Expected ${id} without ${VersionKey}`
    : `Expected ${id} with ${VersionKey} ${formatVersions(versions.slice(1))}, or without ${VersionKey}`
}

class History implements InternalVersionedSchema.History {
  readonly id: string
  readonly unversioned: boolean
  readonly declarations: ReadonlyArray<Declaration>
  readonly steps: ReadonlyArray<Step>
  readonly versions: ReadonlyArray<number>
  readonly errors = errors
  readonly latest: Declaration
  /** every version's records, the encoded side of the schema */
  records: SchemaAST.AST | undefined
  transformation!: { readonly decode: unknown; readonly encode: unknown }

  constructor(id: string, unversioned: boolean, declarations: ReadonlyArray<Declaration>, steps: ReadonlyArray<Step>) {
    this.id = id
    this.unversioned = unversioned
    this.declarations = declarations
    this.steps = steps
    this.versions = declarations.map((declaration) => declaration.version)
    this.latest = declarations[declarations.length - 1]
    InternalVersionedSchema.markHistoryCreated()
  }

  declaration(version: number): Declaration | undefined {
    return this.declarations.find((declaration) => declaration.version === version)
  }

  unsupported(requested: number, input: unknown): SchemaIssue.Issue {
    return new SchemaIssue.InvalidValue({
      message: `${this.id} v${requested} is not supported (supported versions: ${this.versions.join(", ")})`,
      ...InternalVersionedSchema.unsupportedAnnotation({ id: this.id, requested })
    }, input)
  }

  // `input` is a record the union of every version's records accepted
  decode(input: unknown, options: SchemaAST.ParseOptions): Effect.Effect<unknown, SchemaIssue.Issue, unknown> {
    const record = input as Record<string, unknown>
    const marked = hasOwn(record, VersionKey)
    const declaration = marked ? this.declaration(record[VersionKey] as number) : this.declarations[0]
    if (declaration === undefined) return Effect.fail(invalid(`${this.id}: unknown ${VersionKey}`, input))
    return Schema.decodeUnknownEffect(declaration.payload)(marked ? omit(record, VersionKey) : record, options).pipe(
      Effect.mapError((error) => error.issue),
      Effect.flatMap((value) => this.upgrade(declaration, value))
    )
  }

  upgrade(from: Declaration, value: unknown): Effect.Effect<unknown, SchemaIssue.Issue> {
    if (from === this.latest) return Effect.succeed(value)
    return Effect.gen({ self: this }, function*() {
      let current = value
      for (const step of this.steps) {
        if (step.from < from.version) continue
        let data = toData(current)
        const prev = data
        try {
          for (const op of step.ops) data = op.up(data, prev)
        } catch (cause) {
          return yield* Effect.fail(
            invalid(`${this.id}: migration from v${step.from} failed: ${String(cause)}`, current)
          )
        }
        const target = this.declaration(step.to)!
        current = yield* target.payload.makeEffect(pick(data, target.keys))
      }
      return current
    })
  }

  unrepresentableIssue(version: number, issue: SchemaIssue.Issue): SchemaIssue.Issue {
    if (
      InternalVersionedSchema.findUnrepresentable(issue) !== undefined ||
      InternalVersionedSchema.findUnsupported(issue) !== undefined
    ) return issue
    const reason = `${this.id} can't be written at v${version}: ${SchemaIssue.makeFormatterDefault()(issue)}`
    return new SchemaIssue.InvalidValue({
      message: reason,
      ...InternalVersionedSchema.unrepresentableAnnotation({ id: this.id, version, reason }),
      cause: issue
    })
  }

  encode(value: unknown, options: SchemaAST.ParseOptions): Effect.Effect<unknown, SchemaIssue.Issue, unknown> {
    return Effect.flatMap(Effect.service(InternalVersionedSchema.Selection), (selection) => {
      if (selection.outsideBodies) return Effect.die(InternalVersionedSchema.usedOutsideBodies(this.id))
      const requested = hasOwn(selection.versions, this.id) ? selection.versions[this.id] : undefined
      if (requested === undefined && selection.negotiated !== undefined && !selection.negotiated.has(this.id)) {
        return Effect.die(InternalVersionedSchema.notNegotiated(this.id))
      }
      const version = requested === undefined
        ? this.latest.version
        : InternalVersionedSchema.atOrBelow(this, requested)
      if (version === undefined) return Effect.fail(this.unsupported(requested!, value))
      const declaration = this.declaration(version)!
      return this.downgrade(declaration, value).pipe(
        Effect.flatMap((old) =>
          Effect.mapError(
            Schema.encodeUnknownEffect(declaration.payload)(old, options),
            (error) => declaration === this.latest ? error.issue : this.unrepresentableIssue(version, error.issue)
          )
        ),
        Effect.map((encoded) => {
          if (this.unversioned && declaration === this.declarations[0] || !isPlainObject(encoded)) return encoded
          return { [VersionKey]: version, ...encoded }
        })
      )
    })
  }

  downgrade(to: Declaration, value: unknown): Effect.Effect<unknown, SchemaIssue.Issue> {
    if (to === this.latest) return Effect.succeed(value)
    return Effect.gen({ self: this }, function*() {
      let current = value
      for (let i = this.steps.length - 1; i >= 0 && this.steps[i].to > to.version; i--) {
        const step = this.steps[i]
        let data = toData(current)
        const next = data
        try {
          for (let j = step.ops.length - 1; j >= 0; j--) {
            const result = step.ops[j].down(data, next)
            if (isNoEquivalent(result)) {
              const reason = `${this.id} can't be written at v${to.version}: ${
                result.message ?? step.ops[j].description
              }`
              return yield* Effect.fail(
                new SchemaIssue.InvalidValue({
                  message: reason,
                  ...InternalVersionedSchema.unrepresentableAnnotation({ id: this.id, version: to.version, reason })
                }, value)
              )
            }
            data = result
          }
        } catch (cause) {
          return yield* Effect.fail(invalid(`${this.id}: migration to v${step.from} failed: ${String(cause)}`, current))
        }
        const target = this.declaration(step.from)!
        current = yield* target.payload.makeEffect(pick(data, target.keys)).pipe(
          Effect.mapError((issue) => this.unrepresentableIssue(to.version, issue))
        )
      }
      return current
    })
  }

  toSchema(): any {
    const message = expectedRecord(this.id, this.versions, this.unversioned)
    const members = this.declarations.map((declaration, i) =>
      withVersionField(
        declaration.encoded,
        this.unversioned && i === 0
          // a record with `_version` is never read as the unversioned version
          ? new SchemaAST.PropertySignature(VersionKey, Schema.optionalKey(Schema.Never.annotate({ message })).ast)
          : new SchemaAST.PropertySignature(VersionKey, Schema.Literal(declaration.version).ast)
      )
    )
    // the members are tried in order, and the unversioned one reads any object
    if (this.unversioned) members.push(members.shift()!)
    // Every version's records, told apart by `_version`, so serializations
    // that read the encoded side, like SchemaBinary, read any version.
    const records = Schema.make<Schema.Top>(
      new SchemaAST.Union(members, undefined, {
        identifier: this.id,
        message,
        [InternalVersionedSchema.RecordsKey]: this
      })
    )
    this.records = records.ast
    const transformation = SchemaTransformation.transformEffect<any, any, unknown, unknown>({
      decode: (input, options) => this.decode(input, options),
      encode: (value, options) => this.encode(value, options)
    })
    // a schema is this history only if it encodes through this transformation
    this.transformation = transformation
    const schema = records.pipe(Schema.decodeTo(Schema.toType(this.latest.payload), transformation))
    return Object.assign(InternalVersionedSchema.annotateHistory(schema, this), {
      "~versioned": this.id,
      id: this.id,
      version: (version: number) => this.pin(version),
      next: (options: NextOptions) => this.next(options)
    })
  }

  // the types reject undeclared versions; this catches casts and JavaScript callers
  pin(version: number): Versions {
    if (this.declaration(version) === undefined) {
      throw new Error(
        `VersionedSchema ${this.id}: version ${version} isn't declared (declared: ${this.versions.join(", ")})`
      )
    }
    return Object.freeze({ [this.id]: version }) as Versions
  }

  next(options: NextOptions): any {
    if (!(options.version > this.latest.version)) {
      throw new Error(`VersionedSchema ${this.id}: version ${options.version} must be above ${this.latest.version}`)
    }
    const declaration = declare(this.id, options.version, options.payload)
    const ops = options.migration === undefined ? [] : options.migration(new StepBuilderImpl([])).ops
    return new History(
      this.id,
      this.unversioned,
      [...this.declarations, declaration],
      [...this.steps, { from: this.latest.version, to: options.version, ops }]
    ).toSchema()
  }
}

interface NextOptions {
  readonly version: number
  readonly payload: Schema.Top
  readonly migration?: ((s: StepBuilderImpl) => StepBuilderImpl) | undefined
}

/**
 * Declares the first version of a versioned schema.
 *
 * **Details**
 *
 * `id` names the type in the `effect-versions` header and in errors, so it
 * must be unique among the versioned types a program uses, and printable ASCII
 * without spaces, `,` or `=`. Version numbers
 * are positive integers that increase with each `next`; gaps are allowed. The
 * payload's encoded form must be an object, or a union of objects, without a
 * `_version` field.
 *
 * Set `unversioned: true` when the first version is the shape from before you
 * adopted versioning: it is read and written without `_version`, and records
 * without `_version` are read as the first version. Clients built before
 * versioning don't send the `effect-versions` header, so once a second version
 * exists they're answered at the latest one. Wait until every client sends the
 * header before adding it, or pin the first version with
 * {@link DefaultVersions} until they have. Deploy servers that have only that
 * first version before clients that write a later one: a server built before
 * versioning can't reject newer records with `VersionUnsupported`, so a
 * rollback to it fails without a way to retry.
 *
 * **Example** (Reading an older version and writing either version)
 *
 * ```ts import.meta.vitest
 * import { Schema } from "effect"
 * import { VersionedSchema } from "effect/schema"
 *
 * const Person = VersionedSchema.make("Person", {
 *   version: 1,
 *   payload: Schema.Struct({ name: Schema.String }),
 *   unversioned: true
 * }).next({
 *   version: 2,
 *   payload: Schema.Struct({ fullName: Schema.String }),
 *   migration: (s) => s.renameField("name", "fullName")
 * })
 *
 * Schema.decodeUnknownSync(Person)({ name: "Ada" }) // => { fullName: "Ada" }
 * Schema.encodeSync(Person)({ fullName: "Ada" }) // => { _version: 2, fullName: "Ada" }
 * Schema.encodeSync(VersionedSchema.at(Person, Person.version(1)))({ fullName: "Ada" }) // => { name: "Ada" }
 * ```
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const make = <
  const Id extends string,
  const S extends Schema.Top,
  const N extends number,
  const Unversioned extends boolean = false
>(
  id: Id,
  options: {
    readonly version: N
    readonly payload: S & ObjectCheck<S>
    readonly unversioned?: Unversioned | undefined
  }
): VersionedSchema<Id, readonly [Version<S, N, Unversioned extends true ? false : true>]> => {
  // ids go in a header, and version records are keyed by them, where assigning
  // `__proto__` doesn't add a key
  if (!Predicate.isString(id) || !/^[!-~]+$/.test(id) || /[,=]/.test(id) || id === "__proto__") {
    throw new Error(`VersionedSchema: invalid id ${JSON.stringify(id)}`)
  }
  return new History(id, options.unversioned === true, [declare(id, options.version, options.payload)], []).toSchema()
}

/**
 * Writes the versioned types inside a schema at older versions. Decoding is
 * unchanged.
 *
 * **When to use**
 *
 * Use when writing records that readers on an older version must read, outside
 * `HttpApi` and Rpc: storage during a rollout, until every reader can read the
 * new version, or messages for consumers you can't negotiate with.
 *
 * **Details**
 *
 * Applies to every versioned type reachable from `schema`, including nested
 * ones. A type `versions` leaves out is written at its latest version.
 * Versions a server sent, such as a {@link VersionUnsupported} error's, can
 * name versions this build doesn't declare: one between declared versions
 * uses the newest declared one below it, one above the latest uses the
 * latest, and writing one older than every declared version fails.
 *
 * **Example** (Writing an order and its nested person at older versions)
 *
 * ```ts import.meta.vitest
 * import { Schema } from "effect"
 * import { VersionedSchema } from "effect/schema"
 *
 * const Person = VersionedSchema.make("Person", {
 *   version: 1,
 *   payload: Schema.Struct({ name: Schema.String })
 * }).next({
 *   version: 2,
 *   payload: Schema.Struct({ fullName: Schema.String }),
 *   migration: (s) => s.renameField("name", "fullName")
 * })
 * const Order = Schema.Struct({ id: Schema.String, buyer: Person })
 * const writeOld = Schema.encodeSync(VersionedSchema.at(Order, Person.version(1)))
 *
 * writeOld({ id: "o1", buyer: { fullName: "Ada" } }) // => { id: "o1", buyer: { _version: 1, name: "Ada" } }
 * ```
 *
 * @stability unstable
 * @category combinators
 * @since 4.1.0
 */
export const at = <S extends Schema.Top>(
  schema: S,
  versions: Versions
): Schema.middlewareEncoding<S, S["EncodingServices"]> =>
  schema.pipe(
    Schema.middlewareEncoding((effect) =>
      Effect.updateService(effect, InternalVersionedSchema.Selection, (outer) => ({
        ...outer,
        versions: { ...outer.versions, ...versions }
      }))
    )
  )
