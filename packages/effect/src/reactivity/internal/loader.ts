/**
 * The internals of `effect/reactivity/Loader`: keys, read definitions, Layer
 * builds, problems and the cache itself. Nothing here is module-level state.
 *
 * @internal
 */
import * as Cause from "../../Cause.ts"
import * as Clock from "../../Clock.ts"
import * as Context from "../../Context.ts"
import * as Data from "../../Data.ts"
import * as Duration from "../../Duration.ts"
import * as Effect from "../../Effect.ts"
import * as Equal from "../../Equal.ts"
import * as Exit from "../../Exit.ts"
import * as Fiber from "../../Fiber.ts"
import * as Hash from "../../Hash.ts"
import { byReferenceInstances } from "../../internal/equal.ts"
import { redactAST } from "../../internal/schemaRedact.ts"
import * as Option from "../../Option.ts"
import * as Schema from "../../Schema.ts"
import * as SchemaAST from "../../SchemaAST.ts"
import * as SchemaIssue from "../../SchemaIssue.ts"
import * as SchemaParser from "../../SchemaParser.ts"
import * as SchemaTransformation from "../../SchemaTransformation.ts"
import * as Scope from "../../Scope.ts"
import * as AsyncResult from "../AsyncResult.ts"

// -----------------------------------------------------------------------------
// Type ids
// -----------------------------------------------------------------------------

/** @internal */
export const ReadTypeId = "~effect/reactivity/Loader"

/** @internal */
export const CacheTypeId = "~effect/reactivity/Loader/Cache"

const BuildTypeId = "~effect/reactivity/Loader/Build"

// -----------------------------------------------------------------------------
// Keys
// -----------------------------------------------------------------------------

// A fixed name for the kind of a leaf. Never its value, nor anything the value can set, such as its string tag: a
// key can hold a secret.
const kindOf = (leaf: unknown): string => {
  switch (typeof leaf) {
    case "number":
      return "a non-finite number"
    case "undefined":
      return "undefined"
    case "object":
      return "a class instance"
    default:
      return "a " + typeof leaf
  }
}

class NonJsonLeaf {
  readonly kind: string
  constructor(leaf: unknown) {
    this.kind = kindOf(leaf)
  }
}

/**
 * Canonical JSON: sorted object keys, `undefined` properties dropped, no
 * whitespace, `-0` kept apart from `0`. It parses back with `JSON.parse`.
 * Throws a `NonJsonLeaf` on a leaf JSON can't carry.
 *
 * @internal
 */
export const canonical = (u: unknown): string => {
  if (u === null || typeof u === "boolean") return String(u)
  if (typeof u === "string") return JSON.stringify(u)
  if (typeof u === "number") {
    if (!Number.isFinite(u)) throw new NonJsonLeaf(u)
    return Object.is(u, -0) ? "-0" : String(u)
  }
  if (Array.isArray(u)) {
    const parts: Array<string> = []
    // Not `map`: a hole must throw too.
    for (let i = 0; i < u.length; i++) parts.push(canonical(u[i]))
    return "[" + parts.join(",") + "]"
  }
  if (typeof u === "object") {
    const proto = Object.getPrototypeOf(u)
    if (proto !== Object.prototype && proto !== null) throw new NonJsonLeaf(u)
    const o = u as Record<string, unknown>
    const parts: Array<string> = []
    for (const key of Object.keys(o).sort()) {
      if (o[key] !== undefined) parts.push(JSON.stringify(key) + ":" + canonical(o[key]))
    }
    return "{" + parts.join(",") + "}"
  }
  throw new NonJsonLeaf(u)
}

/**
 * A snapshot of a value for the `PatchMutated` check, deep and following
 * cycles, that runs none of the value's own code. It only reflects on a
 * value, so of a `Proxy` only the `getPrototypeOf`, `has`, `ownKeys` and
 * `getOwnPropertyDescriptor` traps run, never `get` or `set`.
 *
 * - An `Equal` value, found by the presence of the `Equal` key without
 *   reading it, an `Equal.byReference` object and a function become an inert
 *   stand-in, the same one for the same object, so that no `Equal` or `Hash`
 *   method of theirs runs when snapshots are compared.
 * - `Date`, `RegExp`, `Map`, `Set` and binary data are recognized by their
 *   internal slots and read through the built-in getters and methods called
 *   directly, which read nothing through the object.
 * - An array is copied by element, read through its own property descriptors.
 *   An accessor element is not read, and its slot holds a marker.
 * - Any other object becomes a prototype-less record of its own data
 *   properties, non-enumerable and symbol keys included, without its `Hash`
 *   method. An accessor is never read, and nothing inherited is copied.
 * - Binary data is kept as its bytes, each kind apart, so an unchanged float
 *   array holding `NaN` stays equal to itself.
 *
 * Two snapshots compare with `Equal.equals` as the data did when each was
 * taken, and neither holds a live object: `Equal.equals` and `Hash.hash`
 * cache by object, and a hash cached before one mutation would hide the next.
 * Throws when a trap throws or a buffer is detached.
 */
const materialize = (u: unknown, seen = new Map<object, unknown>()): unknown => {
  if (typeof u === "function") return standIn(u)
  if (typeof u !== "object" || u === null) return u
  if (byReferenceInstances.has(u) || Equal.symbol in u) return standIn(u)
  const known = seen.get(u)
  if (known !== undefined) return known
  if (ArrayBuffer.isView(u)) {
    const kind: string | undefined = typedArrayTag.call(u)
    if (kind === undefined) {
      // A `DataView`: its getter throws on a detached buffer, skipping the check.
      return new DataView(copyBytes(dataViewBuffer.call(u), dataViewOffset.call(u), dataViewLength.call(u)).buffer)
    }
    // `Equal.equals` compares typed array elements with `!==`, which never matches `NaN` and matches `0` with `-0`,
    // and doesn't tell kinds apart. A record under a private key holds the kind and the bytes instead.
    const out: Record<PropertyKey, unknown> = Object.create(null)
    out[typedArrayKey] = [
      kind,
      copyBytes(typedArrayBuffer.call(u), typedArrayOffset.call(u), typedArrayLength.call(u)).buffer
    ]
    return out
  }
  if (Array.isArray(u)) {
    const length = Object.getOwnPropertyDescriptor(u, "length")!.value as number
    const out: Array<unknown> = new Array(length)
    seen.set(u, out)
    for (let i = 0; i < length; i++) {
      const descriptor = Object.getOwnPropertyDescriptor(u, i)
      out[i] = descriptor === undefined
        ? undefined
        : "value" in descriptor
        ? materialize(descriptor.value, seen)
        : accessorSlot
    }
    return out
  }
  // `instanceof` only walks the prototypes; the slot check then tells a built-in object from a `Proxy` or an
  // object made from its prototype, which are copied as records.
  if (u instanceof Date && hasSlot(dateTime, u)) return new Date(dateTime.call(u))
  if (u instanceof RegExp && hasSlot(regExpSource, u)) return new RegExp(regExpSource.call(u), regExpFlags(u))
  if (u instanceof ArrayBuffer && hasSlot(arrayBufferLength, u)) {
    return copyBytes(u as ArrayBuffer, 0, arrayBufferLength.call(u)).buffer
  }
  if (
    sharedArrayBufferLength !== undefined && u instanceof SharedArrayBuffer && hasSlot(sharedArrayBufferLength, u)
  ) {
    const length: number = sharedArrayBufferLength.call(u)
    const out = new SharedArrayBuffer(length)
    new Uint8Array(out).set(new Uint8Array(u as SharedArrayBuffer, 0, length))
    return out
  }
  if (u instanceof Map && hasSlot(mapSize, u)) {
    const out = new Map()
    seen.set(u, out)
    mapForEach.call(u, (value, key) => out.set(materialize(key, seen), materialize(value, seen)))
    return out
  }
  if (u instanceof Set && hasSlot(setSize, u)) {
    const out = new Set()
    seen.set(u, out)
    setForEach.call(u, (value) => out.add(materialize(value, seen)))
    return out
  }
  const out: Record<PropertyKey, unknown> = Object.create(null)
  seen.set(u, out)
  for (const key of Reflect.ownKeys(u)) {
    if (key === Hash.symbol) continue
    const descriptor = Object.getOwnPropertyDescriptor(u, key)
    if (descriptor !== undefined && "value" in descriptor) out[key] = materialize(descriptor.value, seen)
  }
  return out
}

/** The stand-ins for values held by reference: equal only to themselves, with no `Equal` or `Hash` method. */
const standIns = new WeakMap<object, object>()
const standIn = (u: object): object => {
  let out = standIns.get(u)
  if (out === undefined) {
    out = Equal.byReferenceUnsafe(Object.create(null) as object)
    standIns.set(u, out)
  }
  return out
}
const typedArrayKey = Symbol("effect/reactivity/Loader/typedArray")
/** Where an array has an accessor element: it is never read. */
const accessorSlot = Symbol("effect/reactivity/Loader/accessor")

// The built-in getters and methods, called directly: they read internal slots and nothing through the object, and
// throw on an object without the slot, a `Proxy` included.
type Intrinsic = (this: unknown, ...args: Array<any>) => any
const getter = (proto: object, key: PropertyKey): Intrinsic => Object.getOwnPropertyDescriptor(proto, key)!.get!
const hasSlot = (intrinsic: Intrinsic, u: object): boolean => {
  try {
    intrinsic.call(u)
    return true
  } catch {
    return false
  }
}
const typedArrayProto: object = Object.getPrototypeOf(Uint8Array.prototype)
const typedArrayTag = getter(typedArrayProto, Symbol.toStringTag)
const typedArrayBuffer = getter(typedArrayProto, "buffer")
const typedArrayOffset = getter(typedArrayProto, "byteOffset")
const typedArrayLength = getter(typedArrayProto, "byteLength")
const dataViewBuffer = getter(DataView.prototype, "buffer")
const dataViewOffset = getter(DataView.prototype, "byteOffset")
const dataViewLength = getter(DataView.prototype, "byteLength")
const arrayBufferLength = getter(ArrayBuffer.prototype, "byteLength")
const sharedArrayBufferLength = typeof SharedArrayBuffer === "undefined"
  ? undefined
  : getter(SharedArrayBuffer.prototype, "byteLength")
const dateTime: Intrinsic = Date.prototype.getTime
const regExpSource = getter(RegExp.prototype, "source")
// Each flag on its own: the `flags` getter reads them through the object.
const regExpFlagGetters = (
  [
    ["d", "hasIndices"],
    ["g", "global"],
    ["i", "ignoreCase"],
    ["m", "multiline"],
    ["s", "dotAll"],
    ["u", "unicode"],
    ["v", "unicodeSets"],
    ["y", "sticky"]
  ] as const
).flatMap(([flag, key]) => key in RegExp.prototype ? [[flag, getter(RegExp.prototype, key)] as const] : [])
const regExpFlags = (u: object): string => {
  let flags = ""
  for (const [flag, get] of regExpFlagGetters) if (get.call(u)) flags += flag
  return flags
}
const mapSize = getter(Map.prototype, "size")
const setSize = getter(Set.prototype, "size")
const mapForEach: (this: unknown, f: (value: unknown, key: unknown) => void) => void = Map.prototype.forEach
const setForEach: (this: unknown, f: (value: unknown) => void) => void = Set.prototype.forEach
/** A copy of a buffer's bytes in a new `ArrayBuffer`. A detached buffer throws, skipping the check. */
const copyBytes = (buffer: ArrayBufferLike, offset: number, length: number): Uint8Array<ArrayBuffer> =>
  new Uint8Array(buffer, offset, length).slice()

/**
 * A snapshot of the encoding of a server value, for the `PatchMutated`
 * check, or `undefined` when the check can't be made: the encoding or the
 * snapshot throws. Never throws, since the check only reports.
 */
const materializedEncoding = (encode: () => unknown): { readonly encoded: unknown } | undefined => {
  try {
    return { encoded: materialize(encode()) }
  } catch {
    return undefined
  }
}

const lazy = <A>(make: () => A): () => A => {
  let made: { readonly value: A } | undefined
  return () => (made ??= { value: make() }).value
}

/**
 * Whether a type names `undefined`: `Schema.optional` and `Schema.UndefinedOr`
 * name it, and `Schema.Unknown` holds anything. A union names it when any of
 * its members does, whatever the union's mode. A declaration doesn't name it,
 * since only its guard could say. A `suspend` is followed, once.
 */
const namesUndefined = (ast: SchemaAST.AST, seen: Set<SchemaAST.AST> = new Set()): boolean => {
  switch (ast._tag) {
    case "Undefined":
    case "Void":
    case "Unknown":
    case "Any":
      return true
    case "Union":
      return ast.types.some((type) => namesUndefined(type, seen))
    case "Suspend": {
      if (seen.has(ast)) return false
      seen.add(ast)
      return namesUndefined(ast.thunk(), seen)
    }
    default:
      return false
  }
}

/**
 * A copy of `o` without the named properties. Every other own property keeps
 * its descriptor, so no getter runs and a property that isn't enumerable
 * stays. The copy has the prototype of `o`, and is frozen, sealed or closed to
 * extension when `o` is.
 */
const copyWithout = (o: object, names: ReadonlyArray<PropertyKey>): object => {
  const descriptors: Record<PropertyKey, PropertyDescriptor> = Object.getOwnPropertyDescriptors(o)
  for (const name of names) delete descriptors[name]
  const out = Object.create(Object.getPrototypeOf(o), descriptors)
  if (Object.isFrozen(o)) Object.freeze(out)
  else if (Object.isSealed(o)) Object.seal(out)
  else if (!Object.isExtensible(o)) Object.preventExtensions(out)
  return out
}

/**
 * Drops every optional property that is `undefined` from args that are a
 * struct, so `{ id, page: undefined }` and `{ id }` build one key. `null` when
 * the args Schema isn't a struct, or is one with no such property.
 *
 * Only the struct the args themselves are is looked at. What a property holds
 * goes to the args Schema as it is: a nested struct, a union, a class, a
 * record, a tuple, an `Option` or a collection. So do args that are a union, a
 * class or a `suspend`.
 *
 * The drop happens before the args Schema checks or encodes anything, so the
 * read behaves as it does for the same args without the property. It goes by
 * the type side of the Schema: what an encoding produces is the Schema's
 * business.
 *
 * A property is dropped when it is the args' own data property, it is
 * `undefined`, the struct says it may be missing, and its type names
 * `undefined`. Nothing is matched against a value, and no check, encoding,
 * declaration's guard or getter runs to decide. So the Schema still rejects an
 * `undefined` that `Schema.optionalKey` forbids, and a property behind a getter
 * or one the args inherit is the Schema's as it is.
 *
 * Args with nothing to drop are returned as they are, not as a copy.
 */
const dropUndefinedOf = (ast: SchemaAST.AST): ((args: unknown) => unknown) | null => {
  if (ast._tag !== "Objects") return null
  const optional = ast.propertySignatures.flatMap((property) => {
    const type = property.type
    // Asked on first use: the type may be behind a `suspend` that can't be followed yet.
    return SchemaAST.isOptional(type) ? [{ name: property.name, allowed: lazy(() => namesUndefined(type)) }] : []
  })
  if (optional.length === 0) return null
  return (args) => {
    if (typeof args !== "object" || args === null || Array.isArray(args)) return args
    let names: Array<PropertyKey> | undefined
    for (const { allowed, name } of optional) {
      const descriptor = Object.getOwnPropertyDescriptor(args, name)
      if (descriptor !== undefined && "value" in descriptor && descriptor.value === undefined && allowed()) {
        ;(names ??= []).push(name)
      }
    }
    return names === undefined ? args : copyWithout(args, names)
  }
}

/**
 * The JSON encoder of an args Schema, run on the args once the optional
 * `undefined` properties of an args struct are dropped.
 */
const argsEncoder = (ast: SchemaAST.AST): (args: unknown) => unknown => {
  const encode = Schema.encodeUnknownSync(Schema.toCodecJson(Schema.make<Schema.Codec<unknown, unknown>>(ast)))
  const drop = dropUndefinedOf(ast)
  return drop === null ? encode : (args) => encode(drop(args))
}

// -----------------------------------------------------------------------------
// Host signals
// -----------------------------------------------------------------------------

/** @internal */
export interface Signal {
  readonly get: () => boolean
  readonly subscribe: (listener: (value: boolean) => void) => () => void
}

/** @internal */
export interface SettableSignal extends Signal {
  readonly set: (value: boolean) => void
}

/**
 * A settable signal, for tests and for host Layers.
 *
 * @internal
 */
export const makeSignal = (initial = true): SettableSignal => {
  let current = initial
  const listeners = new Set<(value: boolean) => void>()
  return {
    get: () => current,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    set: (value) => {
      if (value === current) return
      current = value
      for (const listener of Array.from(listeners)) listener(value)
    }
  }
}

/** @internal */
export const alwaysTrue: Signal = { get: () => true, subscribe: () => () => {} }

// -----------------------------------------------------------------------------
// Problems
// -----------------------------------------------------------------------------

/** The public `Loader.DuplicateName`. */
export class DuplicateName extends Data.TaggedClass("DuplicateName")<{
  readonly message: string
  readonly read: string
}> {}

/** The public `Loader.IntervalThrew`. */
export class IntervalThrew extends Data.TaggedClass("IntervalThrew")<{
  readonly message: string
  readonly read: string
  readonly logKey: string
  readonly error: unknown
}> {}

/** The public `Loader.IntervalInvalid`. */
export class IntervalInvalid extends Data.TaggedClass("IntervalInvalid")<{
  readonly message: string
  readonly read: string
  readonly logKey: string
}> {}

/** The public `Loader.FetchRestarted`. */
export class FetchRestarted extends Data.TaggedClass("FetchRestarted")<{
  readonly message: string
  readonly read: string
  readonly logKey: string
}> {}

/** The public `Loader.PatchInvalid`. */
export class PatchInvalid extends Data.TaggedClass("PatchInvalid")<{
  readonly message: string
  readonly read: string
  readonly logKey: string
  readonly command: string
}> {}

/** The public `Loader.PatchMutated`. */
export class PatchMutated extends Data.TaggedClass("PatchMutated")<{
  readonly message: string
  readonly read: string
  readonly logKey: string
  readonly command: string
}> {}

/** The public `Loader.UncoveredWrite`. */
export class UncoveredWrite extends Data.TaggedClass("UncoveredWrite")<{
  readonly message: string
  readonly read: string
  readonly logKey: string
  readonly command: string
}> {}

/** The public `Loader.InvalidateIgnored`. */
export class InvalidateIgnored extends Data.TaggedClass("InvalidateIgnored")<{
  readonly message: string
  readonly read: string | undefined
}> {}

/** The public `Loader.EncodeFailed`. */
export class EncodeFailed extends Data.TaggedClass("EncodeFailed")<{
  readonly message: string
  readonly read: string
  readonly logKey: string
}> {}

/** The public `Loader.HydrationMalformed`. */
export class HydrationMalformed extends Data.TaggedClass("HydrationMalformed")<{
  readonly message: string
}> {}

/** The public `Loader.HydrationDecodeFailed`. */
export class HydrationDecodeFailed extends Data.TaggedClass("HydrationDecodeFailed")<{
  readonly message: string
  readonly read: string
  readonly part: "value" | "args"
  /** Only when `part` is `"value"`: decoded args are what a log key is built from. */
  readonly logKey: string | undefined
}> {}

/** @internal */
export type Problem =
  | DuplicateName
  | IntervalThrew
  | IntervalInvalid
  | FetchRestarted
  | PatchInvalid
  | PatchMutated
  | UncoveredWrite
  | InvalidateIgnored
  | EncodeFailed
  | HydrationMalformed
  | HydrationDecodeFailed

/** How many restarts of one fetch in a row, with no settle between, are reported. */
const restartLimit = 10

// -----------------------------------------------------------------------------
// Read definitions
// -----------------------------------------------------------------------------

/** @internal */
export type Settled = AsyncResult.Success<any, any> | AsyncResult.Failure<any, any>

/** @internal */
export type RefetchInterval =
  | Duration.Input
  | ((result: Settled, args: any) => Duration.Input | undefined)

/**
 * The data of a read. A read's identity is this object, not its class.
 *
 * @internal
 */
export interface ReadDef {
  readonly name: string
  readonly args: Schema.Top
  readonly success: Schema.Top
  readonly error: Schema.Top
  readonly staleMs: number
  readonly idleMs: number | undefined
  /** The constant form in milliseconds (`Infinity` is no interval), or the function form. */
  readonly refetchInterval: number | ((result: Settled, args: any) => Duration.Input | undefined) | undefined
  readonly tags: ReadonlyArray<string>
  /** Throws when the args don't encode, or encode to something JSON can't carry. */
  readonly argsKey: (args: unknown) => string
  /** The args with the optional `undefined` properties of an args struct dropped, as the key sees them. */
  readonly normalize: (args: unknown) => unknown
  /** The key through the redacting args codec. Never throws. */
  readonly logKey: (args: unknown, argsKey: string) => string
  /** The JSON codecs of the read's Schemas, built on first use. Each throws on a value that doesn't fit. */
  readonly codec: () => ReadCodec
}

/** @internal */
export interface ReadCodec {
  readonly encodeSuccess: (value: unknown) => unknown
  readonly decodeSuccess: (encoded: unknown) => unknown
  readonly encodeError: (error: unknown) => unknown
  readonly decodeError: (encoded: unknown) => unknown
  /** Whether a value is of the `success` Schema's type. */
  readonly isSuccess: (value: unknown) => boolean
  /** The args an args key was built from: `JSON.parse`, then the args codec. */
  readonly decodeArgs: (argsKey: string) => unknown
}

const jsonCodec = (schema: Schema.Top) => Schema.toCodecJson(schema as Schema.Codec<unknown, unknown>)

const makeCodec = (args: Schema.Top, success: Schema.Top, error: Schema.Top): ReadCodec => {
  const successJson = jsonCodec(success)
  const errorJson = jsonCodec(error)
  const argsJson = jsonCodec(args)
  const decodeArgs = Schema.decodeUnknownSync(argsJson)
  return {
    encodeSuccess: Schema.encodeUnknownSync(successJson),
    decodeSuccess: Schema.decodeUnknownSync(successJson),
    encodeError: Schema.encodeUnknownSync(errorJson),
    decodeError: Schema.decodeUnknownSync(errorJson),
    isSuccess: Schema.is(success as Schema.Codec<unknown, unknown>),
    decodeArgs: (argsKey) => decodeArgs(JSON.parse(argsKey))
  }
}

const quote = (name: string): string => JSON.stringify(name)

const nonNegative = (name: string, field: string, input: Duration.Input): number => {
  const duration = Duration.fromInputUnsafe(input)
  if (Duration.isNegative(duration)) {
    throw new Error("[Loader] read " + quote(name) + ": " + field + " can't be negative")
  }
  return Duration.toMillis(duration)
}

const subSecondHint = "A bare number is milliseconds: write a sub-second interval as a Duration string, such as " +
  "\"500 millis\"."

/** The interval in milliseconds, or why the input isn't one. */
const parseInterval = (input: Duration.Input): number | "invalid" => {
  if (typeof input === "number" && !(input >= 1000)) return "invalid"
  const duration = Duration.fromInput(input)
  if (Option.isNone(duration)) return "invalid"
  const ms = Duration.toMillis(duration.value)
  return ms > 0 ? ms : "invalid"
}

/**
 * Builds a read's data, and throws on what a definition may not say.
 *
 * @internal
 */
export const makeDef = (name: string, options: {
  readonly args: Schema.Top | Schema.Struct.Fields
  readonly success: Schema.Top
  readonly error: Schema.Top
  readonly staleTime: Duration.Input
  readonly idleTimeToLive?: Duration.Input | undefined
  readonly refetchInterval?: RefetchInterval | undefined
  readonly tags?: ReadonlyArray<{ readonly name: string }> | undefined
}): ReadDef => {
  const staleMs = nonNegative(name, "staleTime", options.staleTime)
  const idleMs = options.idleTimeToLive === undefined
    ? undefined
    : nonNegative(name, "idleTimeToLive", options.idleTimeToLive)
  let refetchInterval: ReadDef["refetchInterval"]
  if (typeof options.refetchInterval === "function") {
    refetchInterval = options.refetchInterval
  } else if (options.refetchInterval !== undefined) {
    const ms = parseInterval(options.refetchInterval)
    if (ms === "invalid") {
      throw new Error(
        "[Loader] read " + quote(name) + ": refetchInterval must be positive, and not a bare number under 1000. " +
          subSecondHint
      )
    }
    refetchInterval = ms
  }
  const args: Schema.Top = Schema.isSchema(options.args) ? options.args : Schema.Struct(options.args)
  // Built on first use: deriving a codec walks the Schema.
  let encodeArgs: ((args: unknown) => unknown) | undefined
  let encodeLogArgs: ((args: unknown) => unknown) | undefined | null = null
  const argsKey = (value: unknown): string => {
    encodeArgs ??= argsEncoder(args.ast)
    let encoded: unknown
    try {
      encoded = encodeArgs(value)
    } catch {
      // The Schema issue prints the value, so it isn't passed on.
      throw new Error("[Loader] read " + quote(name) + ": the args don't encode with the read's args Schema")
    }
    try {
      return canonical(encoded)
    } catch (leaf) {
      throw new Error(
        "[Loader] read " + quote(name) + ": the encoded args hold a value JSON can't carry (" +
          (leaf instanceof NonJsonLeaf ? leaf.kind : "unknown") + "). Give the args Schema a JSON encoding.",
        { cause: leaf }
      )
    }
  }
  const logKey = (value: unknown, key: string): string => {
    if (encodeLogArgs === null) {
      const redacted = redactAST(args.ast)
      // No `Schema.Redacted` in the args: the log key is the args key.
      encodeLogArgs = redacted === args.ast ? undefined : argsEncoder(redacted)
    }
    if (encodeLogArgs === undefined) return key
    try {
      return canonical(encodeLogArgs(value))
    } catch {
      return "\"~unserialisable\""
    }
  }
  let codec: ReadCodec | undefined
  let drop: ((args: unknown) => unknown) | null | undefined
  const normalize = (value: unknown): unknown => {
    if (drop === undefined) drop = dropUndefinedOf(args.ast)
    return drop === null ? value : drop(value)
  }
  return {
    name,
    args,
    normalize,
    success: options.success,
    error: options.error,
    codec: () => codec ??= makeCodec(args, options.success, options.error),
    staleMs,
    idleMs,
    refetchInterval,
    tags: (options.tags ?? []).map((tag) => tag.name),
    argsKey,
    logKey
  }
}

/**
 * The cache-wide idle time in milliseconds. Throws on a negative one.
 *
 * @internal
 */
export const cacheIdleMs = (input: Duration.Input | undefined): number => {
  const duration = Duration.fromInputUnsafe(input ?? "5 minutes")
  if (Duration.isNegative(duration)) throw new Error("[Loader] idleTimeToLive can't be negative")
  return Duration.toMillis(duration)
}

/** @internal */
export const defOf = (read: { readonly [ReadTypeId]: unknown }): ReadDef => read[ReadTypeId] as ReadDef

/** @internal */
export const isRead = <T>(u: T): u is Extract<T, { readonly [ReadTypeId]: unknown }> =>
  (typeof u === "function" || (typeof u === "object" && u !== null)) && ReadTypeId in u

// -----------------------------------------------------------------------------
// Targets, patches and writes
// -----------------------------------------------------------------------------

/**
 * Where the args key of an entry target, a patch or a write is kept. It is
 * built when the target is, so args that don't encode throw where the target
 * is made: in `invalidates`, `optimistic` or `writes`.
 */
const ArgsKey = "~argsKey"

/** @internal */
export interface EntryTarget {
  readonly _tag: "Entry"
  readonly read: { readonly [ReadTypeId]: unknown }
  readonly args: unknown
  readonly [ArgsKey]: string
}

/** @internal */
export interface TagTarget {
  readonly _tag: "Tag"
  readonly name: string
}

/** A read class, one entry or a tag. @internal */
export type Target = { readonly [ReadTypeId]: unknown } | EntryTarget | TagTarget

/** @internal */
export interface PatchOne {
  readonly _tag: "Patch"
  readonly read: { readonly [ReadTypeId]: unknown }
  readonly args: unknown
  readonly patch: (value: any) => any
  readonly [ArgsKey]: string
}

/** @internal */
export interface PatchAll {
  readonly _tag: "PatchAll"
  readonly read: { readonly [ReadTypeId]: unknown }
  readonly patch: (value: any, args: any) => any
}

/** @internal */
export type Patch = PatchOne | PatchAll

/** @internal */
export interface Write {
  readonly _tag: "Set"
  readonly read: { readonly [ReadTypeId]: unknown }
  readonly args: unknown
  readonly value: unknown
  readonly [ArgsKey]: string
}

/** @internal */
export const entryTarget = (read: { readonly [ReadTypeId]: unknown }, args: unknown): EntryTarget => ({
  _tag: "Entry",
  read,
  args,
  [ArgsKey]: defOf(read).argsKey(args)
})

/** @internal */
export const patchOne = (
  read: { readonly [ReadTypeId]: unknown },
  args: unknown,
  patch: (value: any) => any
): PatchOne => ({ _tag: "Patch", read, args, patch, [ArgsKey]: defOf(read).argsKey(args) })

/** @internal */
export const patchAll = (
  read: { readonly [ReadTypeId]: unknown },
  patch: (value: any, args: any) => any
): PatchAll => ({ _tag: "PatchAll", read, patch })

/** @internal */
export const write = (read: { readonly [ReadTypeId]: unknown }, args: unknown, value: unknown): Write => ({
  _tag: "Set",
  read,
  args,
  value,
  [ArgsKey]: defOf(read).argsKey(args)
})

/**
 * A run's declarations compiled for matching: the reads it names whole, the
 * entries it names one by one, and its tags.
 *
 * @internal
 */
export interface Targets {
  readonly reads: ReadonlySet<string>
  readonly entries: ReadonlyMap<string, ReadonlySet<string>>
  readonly tags: ReadonlySet<string>
}

/**
 * Declared targets plus those implied by patches: one entry for `patch`, the
 * whole read for `patchAll`.
 *
 * @internal
 */
export const compileTargets = (
  invalidates: ReadonlyArray<Target>,
  optimistic: ReadonlyArray<Patch> = []
): Targets => {
  const reads = new Set<string>()
  const entries = new Map<string, Set<string>>()
  const tags = new Set<string>()
  const addEntry = (name: string, argsKey: string): void => {
    let keys = entries.get(name)
    if (keys === undefined) entries.set(name, keys = new Set())
    keys.add(argsKey)
  }
  for (const target of invalidates) {
    if (isRead(target)) reads.add(defOf(target).name)
    else if (target._tag === "Entry") addEntry(defOf(target.read).name, target[ArgsKey])
    else tags.add(target.name)
  }
  for (const patch of optimistic) {
    if (patch._tag === "Patch") addEntry(defOf(patch.read).name, patch[ArgsKey])
    else reads.add(defOf(patch.read).name)
  }
  return { reads, entries, tags }
}

/**
 * Whether compiled targets hit an entry. `tags` is `undefined` for a raw
 * hydrated entry, whose read the cache hasn't seen: every tag hits it.
 *
 * @internal
 */
export const targetsHit = (
  targets: Targets,
  name: string,
  tags: ReadonlyArray<string> | undefined,
  argsKey: string
): boolean => {
  if (targets.reads.has(name) || targets.entries.get(name)?.has(argsKey) === true) return true
  if (targets.tags.size === 0) return false
  if (tags === undefined) return true
  return tags.some((tag) => targets.tags.has(tag))
}

/**
 * The public `Loader.invalidatesEntry`: whether a run with these declarations
 * invalidates the entry of `read` at `args`, before fresh writes are
 * subtracted.
 *
 * @internal
 */
export const invalidatesEntry = (
  run: { readonly invalidates: ReadonlyArray<Target>; readonly optimistic?: ReadonlyArray<Patch> | undefined },
  read: { readonly [ReadTypeId]: unknown },
  args: unknown
): boolean => {
  const def = defOf(read)
  return targetsHit(compileTargets(run.invalidates, run.optimistic), def.name, def.tags, def.argsKey(args))
}

/**
 * Applies one patch to a value of the entry of `name` at `argsKey`. A patch
 * of another entry leaves it as it is.
 */
const applyPatch = (patch: Patch, name: string, argsKey: string, args: unknown, value: unknown): unknown => {
  if (defOf(patch.read).name !== name) return value
  if (patch._tag === "PatchAll") return patch.patch(value, args)
  return patch[ArgsKey] === argsKey ? patch.patch(value) : value
}

/**
 * The public `Loader.applyPatches`: applies, in order, every patch that
 * targets the entry of `read` at `args`.
 *
 * @internal
 */
export const applyPatches = (
  patches: ReadonlyArray<Patch>,
  read: { readonly [ReadTypeId]: unknown },
  args: unknown,
  value: unknown
): unknown => {
  const def = defOf(read)
  const argsKey = def.argsKey(args)
  for (const patch of patches) value = applyPatch(patch, def.name, argsKey, args, value)
  return value
}

// -----------------------------------------------------------------------------
// Builds: which Layer build owns a fetch
// -----------------------------------------------------------------------------

/** @internal */
export type Fetcher = (args: any) => Effect.Effect<any, any>

/**
 * One Layer build of a read's service. The service value is a plain function,
 * so a fake is `Layer.succeed(Read, fn)`; a function from a real build carries
 * its build, and a fake gets one per cache that never closes.
 *
 * @internal
 */
export interface Build {
  readonly fetcher: Fetcher
  closed: boolean
  readonly listeners: Set<(build: Build) => void>
  /** The fetches running under this build, in any cache, until their cleanup has finished. */
  readonly fibers: Set<Fiber.Fiber<any, any>>
}

/**
 * Wraps a fetcher for one Layer build. A new function per build, so two builds
 * never share an identity.
 *
 * @internal
 */
export const makeBuild = (fetcher: Fetcher): Build => {
  const wrapped: Fetcher = (args) => fetcher(args)
  const build: Build = { fetcher: wrapped, closed: false, listeners: new Set(), fibers: new Set() }
  Object.defineProperty(wrapped, BuildTypeId, { value: build })
  return build
}

/**
 * Closes a build: every cache that used it restarts or reverts its fetches.
 * It ends when every fetch that ran under the build has finished its cleanup,
 * so a build's finalizer that runs this first releases nothing a fetch still
 * uses.
 *
 * @internal
 */
export const closeBuild = (build: Build): Effect.Effect<void> =>
  Effect.suspend(() => {
    if (build.closed) return Effect.void
    build.closed = true
    for (const listener of Array.from(build.listeners)) listener(build)
    build.listeners.clear()
    return Fiber.interruptAll(build.fibers)
  })

// -----------------------------------------------------------------------------
// Cache: the internal API
// -----------------------------------------------------------------------------

/** @internal */
export type Trigger = "watch" | "get" | "prefetch" | "visibility" | "connectivity" | "interval" | "invalidation"

/** @internal */
export interface FetchEvent {
  readonly read: string
  readonly logKey: string
  readonly trigger: Trigger
  /** True when this start replaces an interrupted fetch. It keeps the trigger. */
  readonly restart: boolean
  /**
   * False for a fetcher call whose result is handed to `get` callers and never
   * stored: a run reading back its own target, or a `get` under a live patch.
   */
  readonly stored: boolean
}

/** @internal */
export interface WatchHandle {
  readonly logKey: () => string
  /** The entry's server state right now: `Initial` over a cold entry. */
  readonly current: () => AsyncResult.AsyncResult<any, any>
  /** The patched view right now, and whether it includes an unconfirmed patch. */
  readonly patchedView: () => PatchedView
  /** Drops the watcher count synchronously. Idempotent. */
  readonly unregister: () => void
}

/** @internal */
export interface PatchedView {
  readonly result: AsyncResult.AsyncResult<any, any>
  readonly patched: boolean
}

/** @internal */
export interface EntryInfo {
  readonly stored: AsyncResult.AsyncResult<any, any>
  /** The server state with every patch applied: what a loader field shows. */
  readonly view: AsyncResult.AsyncResult<any, any>
  /** Whether `view` includes an unconfirmed patch. */
  readonly patched: boolean
  readonly stale: boolean
  readonly watchers: number
  /** `held`: a refetch waits for the last live patch's run to exit. */
  readonly fetch: "none" | "running" | "held"
  /** The trigger of the fetch in flight, or the one a held fetch will start with. */
  readonly trigger: Trigger | undefined
  readonly patches: { readonly live: number; readonly held: number }
}

/**
 * How a run ended. `Stopped` is a run stopped before its work began: its
 * patches go and it invalidates nothing. `Failure` covers a typed failure,
 * an interrupt and a defect.
 *
 * @internal
 */
export type RunExit =
  | { readonly _tag: "Success"; readonly writes: ReadonlyArray<Write> }
  | { readonly _tag: "Failure" }
  | { readonly _tag: "Stopped" }

/**
 * One run of a Command, handed to the cache when it is issued.
 *
 * @internal
 */
export interface RunHandle {
  readonly command: string
  /** The predicate of `Loader.invalidatesEntry` over the run's declarations. */
  readonly invalidates: (def: ReadDef, argsKey: string) => boolean
  /** The work begins. A queued run is issued before it starts. */
  readonly start: () => void
  readonly isStarted: () => boolean
  /** Called once, at fiber exit. Later calls do nothing. */
  readonly finish: (exit: RunExit) => void
  /**
   * Runs a Command body in this run: starts it, provides it as `CurrentRun`,
   * and finishes it when the body's fiber exits. `writes` runs on success
   * only. When it throws, the run still settles, as a success with no
   * writes, and the body dies with what it threw.
   */
  readonly run: <A, E, R>(
    body: Effect.Effect<A, E, R>,
    writes?: ((success: A) => ReadonlyArray<Write>) | undefined
  ) => Effect.Effect<A, E, R>
}

/**
 * The `state["~loader"]` payload: entries by read name, as tagged tuples.
 *
 * @internal
 */
export type Dehydrated = Record<
  string,
  Array<
    | readonly [argsKey: string, tag: 0, encodedSuccess: unknown, timestamp: number]
    | readonly [argsKey: string, tag: 1, encodedErrors: ReadonlyArray<unknown>, timestamp: number]
  >
>

/**
 * The synchronous API of a cache, for the generated statics, the effect/ui
 * runtime and the test harnesses. The value of `Loader.Cache` is one of these.
 *
 * @internal
 */
export interface CacheInternals {
  readonly [CacheTypeId]: typeof CacheTypeId
  /** Hands the cache a read's definition. Its hydrated entries are decoded now. */
  readonly register: (def: ReadDef) => void
  /**
   * Registers a watcher. The count rises and the zero-to-one fetch decision is
   * made here, but the fetcher starts one scheduler step later and `onChange`
   * is never called for the state at registration: read `current()` or
   * `patchedView()`. With `patched`, `onChange` gets the patched view;
   * otherwise the server value, and `patched` is always false.
   */
  readonly watch: (
    def: ReadDef,
    args: unknown,
    fetcher: Fetcher,
    onChange: (result: Settled, patched: boolean) => void,
    onDefect?: ((cause: Cause.Cause<never>) => void) | undefined,
    options?: { readonly patched?: boolean | undefined } | undefined
  ) => WatchHandle
  /** The server value. Doesn't create the entry or reset its idle timer. */
  readonly peek: (def: ReadDef, args: unknown) => AsyncResult.AsyncResult<any, any>
  /** `run` is the caller's, from `CurrentRun`. */
  readonly get: (def: ReadDef, args: unknown, fetcher: Fetcher, run: RunHandle | undefined) => Effect.Effect<any, any>
  readonly prefetch: (def: ReadDef, args: unknown, fetcher: Fetcher) => void
  /**
   * One synchronous batch: an entry hit twice restarts once. `byHand` is a
   * read's own `invalidate`, which a settle-once cache reports and ignores.
   */
  readonly invalidate: (
    targets: ReadonlyArray<Target>,
    options?: { readonly byHand?: boolean | undefined } | undefined
  ) => void
  /**
   * Begins a run at issue: registers its patches, which are live from now on.
   * Throws, registering nothing, when a patch throws on first application.
   */
  readonly beginRun: (options: {
    readonly command: string
    readonly invalidates: ReadonlyArray<Target>
    readonly optimistic?: ReadonlyArray<Patch> | undefined
  }) => RunHandle
  /**
   * Interrupts every fetch in flight and every pending `get`, and returns
   * every settled entry for `~loader`. An entry that can't be encoded is
   * left out and reported.
   */
  readonly dehydrate: () => Dehydrated
  /**
   * Holds the `~loader` payload's entries raw until their read registers.
   * Opens the fetch-free window unless `static`, where every entry has an
   * unknown age instead.
   */
  readonly hydrate: (raw: unknown, options?: { readonly static?: boolean | undefined } | undefined) => void
  /** Closes the fetch-free window: unwatched hydrated Failures go, raw ones included. */
  readonly closeWindow: () => void
  readonly isWindowOpen: () => boolean
  /**
   * History restore: fills a cold entry from a snapshot's Success, stored
   * stale. Never from a snapshot taken under a patch. Returns whether it did.
   */
  readonly seed: (snapshot: unknown) => boolean
  /** Called at every fetch start. */
  readonly onFetch: (listener: (event: FetchEvent) => void) => () => void
  readonly inspect: (def: ReadDef, args: unknown) => EntryInfo | undefined
}

/** @internal */
export const internals = (cache: { readonly [CacheTypeId]: unknown }): CacheInternals => cache as CacheInternals

/**
 * The run a Command body runs in. The effect/ui runtime provides it, so a
 * `get` in the body can tell its run's own targets.
 *
 * @internal
 */
export const CurrentRun: Context.Reference<RunHandle | undefined> = Context.Reference<RunHandle | undefined>(
  "effect/reactivity/Loader/CurrentRun",
  { defaultValue: () => undefined }
)

// -----------------------------------------------------------------------------
// Snapshots
// -----------------------------------------------------------------------------

/** @internal */
export const SnapshotTypeId = "~effect/reactivity/Loader/Snapshot"

/**
 * The annotation a snapshot Schema carries, so effect/ui finds the snapshot
 * fields of a Model.
 *
 * @internal
 */
export const snapshotAnnotationKey = "~effect/reactivity/Loader/Snapshot/field"

/** What a snapshot holds. @internal */
export interface SnapshotData {
  readonly def: ReadDef
  readonly label: string
  /** `undefined` only for the empty snapshot. */
  readonly argsKey: string | undefined
  readonly args: unknown
  /** `undefined` only for the empty snapshot. `waiting` lives in memory only. */
  readonly result: Settled | undefined
  /** The value includes an unconfirmed patch. Only ever true over a Success. */
  readonly patched: boolean
}

/** @internal */
export class SnapshotImpl implements Equal.Equal {
  readonly [SnapshotTypeId]: SnapshotData
  constructor(data: SnapshotData) {
    this[SnapshotTypeId] = data
  }
  [Equal.symbol](that: unknown): boolean {
    if (!(that instanceof SnapshotImpl)) return false
    const a = this[SnapshotTypeId]
    const b = that[SnapshotTypeId]
    return a.def.name === b.def.name && a.label === b.label && a.argsKey === b.argsKey && a.patched === b.patched &&
      Equal.equals(a.result, b.result)
  }
  [Hash.symbol](): number {
    const data = this[SnapshotTypeId]
    return Hash.string(data.def.name + "\u0000" + data.label + "\u0000" + data.argsKey)
  }
}

/** @internal */
export const makeSnapshot = (
  def: ReadDef,
  label: string,
  entry: { readonly args: unknown; readonly argsKey: string } | undefined,
  result: Settled | undefined,
  patched = false
): SnapshotImpl =>
  new SnapshotImpl({
    def,
    label,
    argsKey: entry?.argsKey,
    // As the key sees them, so the args Schema never meets an `undefined` the key dropped.
    args: entry === undefined ? undefined : def.normalize(entry.args),
    result: entry === undefined ? undefined : result,
    patched: entry !== undefined && patched && result?._tag === "Success"
  })

/** @internal */
export const snapshotData = (u: unknown): SnapshotData | undefined =>
  u instanceof SnapshotImpl ? u[SnapshotTypeId] : undefined

const settledMap = (
  result: Settled,
  success: (u: unknown) => Effect.Effect<unknown, SchemaIssue.Issue>,
  error: (u: unknown) => Effect.Effect<unknown, SchemaIssue.Issue>
): Effect.Effect<Settled, SchemaIssue.Issue> => {
  // `waiting` is never carried over: a decoded snapshot is never waiting.
  if (result._tag === "Success") {
    return Effect.map(success(result.value), (value) => AsyncResult.success(value, { timestamp: result.timestamp }))
  }
  const fails = result.cause.reasons.filter(Cause.isFailReason)
  return Effect.flatMap(
    Effect.forEach(fails, (reason) => error(reason.error)),
    (errors) => {
      const cause = Cause.fromReasons(errors.map((e) => Cause.makeFailReason(e)))
      if (Option.isNone(result.previousSuccess)) return Effect.succeed(AsyncResult.failure(cause))
      const previous = result.previousSuccess.value
      return Effect.map(success(previous.value), (value) =>
        AsyncResult.failure(cause, {
          previousSuccess: Option.some(AsyncResult.success(value, { timestamp: previous.timestamp }))
        }))
    }
  )
}

/**
 * The Schema of a Model field that holds a snapshot of a read. Its type
 * parameters are the read's `args`, `success` and `error` Schemas, so a walk
 * over the Model's AST, such as the log's redaction, reaches what a snapshot
 * holds. On the wire a snapshot is a tuple: `[]` when empty,
 * `[argsKey, 0, value, timestamp, patched]` for a Success, and
 * `[argsKey, 1, [error, ...], [value, timestamp] | null]` for a Failure with
 * its previous Success.
 *
 * The args key on the wire is built through the `args` type parameter, so
 * it is the entry's key in page state and its log key under the log's
 * redaction. Decoding takes the args from the key, decodes them all the way
 * and checks that they key back to it.
 *
 * @internal
 */
export const snapshotSchema = (
  read: { readonly [ReadTypeId]: unknown },
  label: string
): Schema.Top => {
  const def = defOf(read)
  const is = (u: unknown): u is SnapshotImpl =>
    u instanceof SnapshotImpl && u[SnapshotTypeId].def.name === def.name && u[SnapshotTypeId].label === label
  const invalid = (message: string) =>
    new SchemaIssue.InvalidValue({ message: "a snapshot of " + quote(def.name) + ": " + message })
  const makeRun = (decoding: boolean) => (typeParameters: ReadonlyArray<SchemaAST.AST>) => {
    const [args, success, error] = typeParameters.map((ast) =>
      SchemaParser.decodeUnknownEffect(Schema.make<Schema.Codec<unknown, unknown>>(ast))
    )
    return (
      input: unknown,
      ast: SchemaAST.Declaration,
      options: SchemaAST.ParseOptions
    ): Effect.Effect<SnapshotImpl, SchemaIssue.Issue> => {
      if (!is(input)) return Effect.fail(new SchemaIssue.InvalidType(ast, input, options))
      const data = input[SnapshotTypeId]
      if (data.result === undefined) return Effect.succeed(input)
      const result = data.result
      // The key stays as it is: it is the snapshot's identity. A decoded snapshot is accepted only when its
      // args, decoded all the way, key back to it, so it never names an entry other than the one it was taken from.
      return Effect.flatMap(
        Effect.all([
          args(data.args, options),
          settledMap(result, (u) => success(u, options), (u) => error(u, options))
        ]),
        ([args, result]) => {
          if (decoding) {
            let back: string | undefined
            try {
              back = def.argsKey(args)
            } catch {
              back = undefined
            }
            if (back !== data.argsKey) return Effect.fail(invalid("the args key isn't the key of its args"))
          }
          return Effect.succeed(new SnapshotImpl({ ...data, args, result }))
        }
      )
    }
  }
  const toCodecJson = ([args, success, error]: ReadonlyArray<Schema.Top>) => {
    const argsJson = Schema.toCodecJson(args as Schema.Codec<unknown, unknown>)
    const encodeArgs = SchemaParser.encodeUnknownEffect(argsJson)
    const decodeArgs = SchemaParser.decodeUnknownEffect(argsJson)
    // `args` here is the encoded side of the args Schema, so these see the args as the declaration passes them.
    const toKey = (args: unknown, options: SchemaAST.ParseOptions): Effect.Effect<string, SchemaIssue.Issue> =>
      Effect.flatMap(encodeArgs(args, options), (encoded) => {
        try {
          return Effect.succeed(canonical(encoded))
        } catch {
          return Effect.fail(invalid("the encoded args hold a value JSON can't carry"))
        }
      })
    const fromKey = (
      key: string,
      options: SchemaAST.ParseOptions
    ): Effect.Effect<unknown, SchemaIssue.Issue> => {
      let parsed: unknown
      try {
        parsed = JSON.parse(key)
      } catch {
        return Effect.fail(invalid("the args key isn't JSON"))
      }
      // The declaration checks the key once the args are decoded all the way.
      return decodeArgs(parsed, options)
    }
    return Schema.link<SnapshotImpl>()(
      Schema.Union([
        Schema.Tuple([]),
        Schema.Tuple([Schema.String, Schema.Literal(0), success, Schema.Number, Schema.Boolean]),
        Schema.Tuple([
          Schema.String,
          Schema.Literal(1),
          Schema.Array(error),
          Schema.NullOr(Schema.Tuple([success, Schema.Number]))
        ])
      ]),
      SchemaTransformation.transformEffect<SnapshotImpl, any>({
        decode: (tuple, options) => {
          if (tuple.length === 0) return Effect.succeed(makeSnapshot(def, label, undefined, undefined))
          const [key, tag, payload, fourth, fifth] = tuple
          return Effect.map(fromKey(key, options), (args) => {
            const data = { def, label, argsKey: key as string, args }
            if (tag === 0) {
              return new SnapshotImpl({
                ...data,
                result: AsyncResult.success(payload, { timestamp: fourth }),
                patched: fifth === true
              })
            }
            return new SnapshotImpl({
              ...data,
              result: AsyncResult.failure(
                Cause.fromReasons((payload as ReadonlyArray<unknown>).map((e) => Cause.makeFailReason(e))),
                {
                  previousSuccess: fourth === null
                    ? Option.none()
                    : Option.some(AsyncResult.success(fourth[0], { timestamp: fourth[1] }))
                }
              ),
              patched: false
            })
          })
        },
        encode: (snapshot, options) => {
          const data = snapshot[SnapshotTypeId]
          const result = data.result
          if (result === undefined) return Effect.succeed([])
          return Effect.map(toKey(data.args, options), (key) =>
            result._tag === "Success"
              ? [key, 0, result.value, result.timestamp, data.patched]
              : [
                key,
                1,
                result.cause.reasons.filter(Cause.isFailReason).map((reason) => reason.error),
                Option.isSome(result.previousSuccess)
                  ? [result.previousSuccess.value.value, result.previousSuccess.value.timestamp]
                  : null
              ])
        }
      })
    )
  }
  return Schema.make(
    new SchemaAST.Declaration(
      [def.args.ast, def.success.ast, def.error.ast],
      makeRun(true),
      {
        expected: "Loader.Snapshot(" + quote(def.name) + ", " + quote(label) + ")",
        [snapshotAnnotationKey]: { read: def.name, label, definition: read },
        toCodecJson
      } as Schema.Annotations.Annotations,
      undefined,
      undefined,
      undefined,
      undefined,
      makeRun(false)
    )
  )
}

// -----------------------------------------------------------------------------
// Cache: implementation
// -----------------------------------------------------------------------------

interface Watcher {
  readonly onChange: (result: Settled, patched: boolean) => void
  readonly onDefect: ((cause: Cause.Cause<never>) => void) | undefined
  readonly build: Build
  /** Gets the patched view, not the server value. */
  readonly patched: boolean
  last: AsyncResult.AsyncResult<any, any>
  lastPatched: boolean
  active: boolean
}

interface Waiter {
  readonly build: Build
  readonly resume: (exit: Exit.Exit<any, any>) => void
  /** Set when the waiter is a caller of a caller-only fetch, not of the stored one. */
  shared: Shared | undefined
}

interface FetchRec {
  readonly trigger: Trigger
  readonly build: Build
  fiber: Fiber.Fiber<any, any> | undefined
}

/**
 * A caller-only fetch: a fetcher call made for `get` callers under a live
 * patch, whose result is handed to them and never stored. The entry doesn't
 * see it.
 */
interface Shared {
  readonly entry: Entry
  build: Build
  readonly callers: Set<Waiter>
  fiber: Fiber.Fiber<any, any> | undefined
}

interface Idle {
  expiresAt: number
  cancel: () => void
}

interface Run {
  readonly command: string
  /** Issue order. */
  readonly issue: number
  readonly targets: Targets
  /** The sequence number at the run's start: a write or invalidation after it makes a write stale. */
  startSeq: number
  started: boolean
  done: boolean
  /** The entries its patches registered on. */
  readonly entries: Set<Entry>
}

interface PatchRec {
  readonly run: Run
  readonly patch: Patch
  /** Live while the run is queued or running. Held after its success, until a settle or a stored write. */
  live: boolean
}

type RawTuple = Dehydrated[string][number]

interface Entry {
  readonly def: ReadDef
  readonly argsKey: string
  readonly args: unknown
  logKey: string | undefined
  /** The settled server state, never waiting. `undefined` is cold. */
  result: Settled | undefined
  /** From `Clock`. Never `AsyncResult`'s timestamp, which is display-only. */
  settledAt: number
  invalidated: boolean
  removed: boolean
  readonly watchers: Set<Watcher>
  /** Pending `get` callers of the stored fetch. */
  readonly waiters: Set<Waiter>
  fetch: FetchRec | undefined
  /** Restarts since the last settle. */
  restarts: number
  idle: Idle | undefined
  /** The interval worked out for the current settle. `undefined`: not worked out yet. */
  interval: { readonly ms: number | undefined } | undefined
  intervalDue: number | undefined
  intervalCancel: (() => void) | undefined
  /** In issue order. */
  patches: Array<PatchRec>
  /** The first trigger deferred under a live patch. */
  deferred: Trigger | undefined
  /** The caller-only fetch `get` callers join, while a patch is live. */
  shared: Shared | undefined
  /** Sequence numbers: when the entry was made, and the last write or invalidation that hit it. */
  readonly born: number
  touched: number
  /** The issue number of the latest run that wrote or invalidated the entry. */
  reached: number
  /** Hydrated, and nothing has fetched or written it since. Only means something while the window is open. */
  hydrated: boolean
}

const runBody = <A, E, R>(
  handle: RunHandle,
  body: Effect.Effect<A, E, R>,
  writes: ((success: A) => ReadonlyArray<Write>) | undefined
): Effect.Effect<A, E, R> =>
  Effect.uninterruptibleMask((restore) => {
    handle.start()
    return Effect.flatMap(
      Effect.exit(restore(Effect.provideService(body, CurrentRun, handle))),
      (exit): Effect.Effect<A, E> => {
        if (exit._tag === "Failure") {
          handle.finish({ _tag: "Failure" })
          return exit
        }
        let sets: ReadonlyArray<Write> = []
        try {
          if (writes !== undefined) sets = writes(exit.value)
        } catch (error) {
          handle.finish({ _tag: "Success", writes: [] })
          return Effect.die(error)
        }
        handle.finish({ _tag: "Success", writes: sets })
        return exit
      }
    )
  })

const isBareFailure = (result: Settled | undefined): boolean =>
  result !== undefined && result._tag === "Failure" && Option.isNone(result.previousSuccess)

// A fetched Failure holds only its Fails, so it has the shape of a hydrated one.
const failsOnly = (cause: Cause.Cause<any>): Cause.Cause<any> =>
  Cause.fromReasons(cause.reasons.filter(Cause.isFailReason).map((reason) => Cause.makeFailReason(reason.error)))

const diesOnly = (cause: Cause.Cause<any>): Cause.Cause<never> =>
  Cause.fromReasons(cause.reasons.filter(Cause.isDieReason).map((reason) => Cause.makeDieReason(reason.defect)))

/** What a caller of a fetch gets: a defect, the Fails only, or an interrupt for a revert. */
const callerExit = (exit: Exit.Exit<any, any>): Exit.Exit<any, any> =>
  exit._tag === "Success"
    ? exit
    : Cause.hasDies(exit.cause)
    ? Exit.failCause(diesOnly(exit.cause))
    : Cause.hasFails(exit.cause)
    ? Exit.failCause(failsOnly(exit.cause))
    : Exit.interrupt()

const withWaiting = (result: Settled, waiting: boolean): Settled =>
  result.waiting === waiting
    ? result
    : result._tag === "Success"
    ? AsyncResult.success(result.value, { waiting, timestamp: result.timestamp })
    : AsyncResult.failure(result.cause, { previousSuccess: result.previousSuccess, waiting })

const settledEffect = (result: Settled): Effect.Effect<any, any> =>
  result._tag === "Success" ? Effect.succeed(result.value) : Effect.failCause(result.cause)

const isRawTuple = (u: unknown): u is RawTuple =>
  Array.isArray(u) && u.length === 4 && typeof u[0] === "string" && typeof u[3] === "number" &&
  (u[1] === 0 || (u[1] === 1 && Array.isArray(u[2])))

/** The `~loader` payload by read name and args key, or `undefined` when it isn't the tuple shape. */
const parseRaw = (input: unknown): Map<string, Map<string, RawTuple>> | undefined => {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return undefined
  const out = new Map<string, Map<string, RawTuple>>()
  for (const [name, tuples] of Object.entries(input)) {
    if (!Array.isArray(tuples)) return undefined
    const byKey = new Map<string, RawTuple>()
    for (const tuple of tuples) {
      if (!isRawTuple(tuple)) return undefined
      if (!byKey.has(tuple[0])) byKey.set(tuple[0], tuple)
    }
    if (byKey.size > 0) out.set(name, byKey)
  }
  return out
}

/**
 * Builds a cache synchronously. `context` supplies the `Clock` and the
 * scheduler, and every fetch and timer is forked with it. The cache is
 * disposed when `scope` closes.
 *
 * @internal
 */
export const makeCache = (options: {
  readonly scope: Scope.Scope
  readonly context: Context.Context<never>
  readonly visibility: Signal
  readonly connectivity: Signal
  /** The problems sink. A throw from it is swallowed. */
  readonly report: (problem: Problem) => void
  /** In milliseconds, from `cacheIdleMs`. */
  readonly idleMs: number
  /**
   * The server's per-request mode: an entry settles at most once and is never
   * stale after, every settle is stored, a read's own `invalidate` is ignored
   * and reported, and no idle timer, interval or host edge runs.
   */
  readonly settleOnce?: boolean | undefined
}): CacheInternals => {
  const { connectivity, context, visibility } = options
  const clock = Context.get(context, Clock.Clock)
  const defaultIdleMs = options.idleMs
  const settleOnce = options.settleOnce === true

  const reads = new Map<string, ReadDef>()
  const duplicates = new WeakSet<ReadDef>()
  const index = new Map<string, Map<string, Entry>>()
  // Builds made for fakes, and every build this cache listens to.
  const fakeBuilds = new WeakMap<Fetcher, Build>()
  const attached = new Set<Build>()
  const fetchListeners = new Set<(event: FetchEvent) => void>()
  const timers = new Set<Fiber.Fiber<any, any>>()
  // Every fetch fiber until its cleanup has finished, and per entry the interrupted one its next fetch waits for.
  const fetchFibers = new Set<Fiber.Fiber<any, any>>()
  const draining = new Map<string, Fiber.Fiber<any, any>>()
  const sharedFetches = new Set<Shared>()
  // Hydrated entries whose read hasn't registered yet.
  let raw = new Map<string, Map<string, RawTuple>>()
  let hydratedAt = 0
  let hydratedStatic = false
  let windowOpen = false
  // Writes and invalidations, entry creation and run starts share one sequence.
  let seq = 0
  let issued = 0
  let disposed = false

  const now = (): number => clock.currentTimeMillisUnsafe()
  const runFork = Effect.runForkWith(context)
  /** Runs `f` one scheduler step later. */
  const defer = (f: () => void): void => {
    runFork(Effect.andThen(Effect.yieldNow, Effect.sync(() => disposed ? undefined : f())))
  }
  /** A `Clock` sleep. Returns its cancel. */
  const timer = (ms: number, f: () => void): () => void => {
    const fiber: Fiber.Fiber<any, any> = runFork(Effect.andThen(
      Effect.sleep(ms),
      Effect.sync(() => {
        timers.delete(fiber)
        if (!disposed) f()
      })
    ))
    timers.add(fiber)
    return () => {
      timers.delete(fiber)
      fiber.interruptUnsafe()
    }
  }
  const report = (problem: Problem): void => {
    try {
      options.report(problem)
    } catch {
      // A check only reports: a sink that throws changes nothing.
    }
  }

  // -- registry and index -----------------------------------------------------
  /** First wins: the first definition under a name pins everything about the read. */
  const register = (def: ReadDef): ReadDef => {
    const existing = reads.get(def.name)
    if (existing === undefined) {
      reads.set(def.name, def)
      decodeRaw(def)
      return def
    }
    if (existing !== def && !duplicates.has(def)) {
      duplicates.add(def)
      report(
        new DuplicateName({
          read: def.name,
          message: "[Loader] a second read named " + quote(def.name) +
            " was registered in one cache. The first definition wins."
        })
      )
    }
    return existing
  }
  const allEntries = (): Array<Entry> => {
    const out: Array<Entry> = []
    for (const byKey of index.values()) for (const entry of byKey.values()) out.push(entry)
    return out
  }
  const lookup = (def: ReadDef, argsKey: string): Entry | undefined => index.get(def.name)?.get(argsKey)
  const ensureEntry = (def: ReadDef, args: unknown, argsKey = def.argsKey(args)): Entry => {
    const found = lookup(def, argsKey)
    if (found !== undefined) return found
    const entry: Entry = {
      def,
      argsKey,
      args,
      logKey: undefined,
      result: undefined,
      settledAt: 0,
      invalidated: false,
      removed: false,
      watchers: new Set(),
      waiters: new Set(),
      fetch: undefined,
      restarts: 0,
      idle: undefined,
      interval: undefined,
      intervalDue: undefined,
      intervalCancel: undefined,
      patches: [],
      deferred: undefined,
      shared: undefined,
      born: ++seq,
      touched: 0,
      reached: 0,
      hydrated: false
    }
    let byKey = index.get(def.name)
    if (byKey === undefined) index.set(def.name, byKey = new Map())
    byKey.set(argsKey, entry)
    return entry
  }
  const removeEntry = (entry: Entry): void => {
    if (entry.removed) return
    entry.removed = true
    cancelIdle(entry)
    stopInterval(entry)
    const byKey = index.get(entry.def.name)
    if (byKey !== undefined && byKey.get(entry.argsKey) === entry) {
      byKey.delete(entry.argsKey)
      if (byKey.size === 0) index.delete(entry.def.name)
    }
  }
  const drainKey = (entry: Entry): string => quote(entry.def.name) + entry.argsKey
  const logKeyOf = (entry: Entry): string => entry.logKey ??= entry.def.logKey(entry.args, entry.argsKey)

  // -- builds -----------------------------------------------------------------
  const buildOf = (fetcher: Fetcher): Build => {
    let build = (fetcher as { readonly [BuildTypeId]?: Build })[BuildTypeId]
    if (build === undefined) {
      build = fakeBuilds.get(fetcher)
      if (build === undefined) {
        build = { fetcher, closed: false, listeners: new Set(), fibers: new Set() }
        fakeBuilds.set(fetcher, build)
      }
      return build
    }
    if (!build.closed && !attached.has(build)) {
      attached.add(build)
      build.listeners.add(buildClosed)
    }
    return build
  }
  /** The build the cache uses when it asks itself: the earliest live watcher's, then a waiter's. */
  const survivingBuild = (entry: Entry): Build | undefined => {
    for (const watcher of entry.watchers) if (!watcher.build.closed) return watcher.build
    for (const waiter of entry.waiters) if (!waiter.build.closed) return waiter.build
    return undefined
  }

  // -- state ------------------------------------------------------------------
  const isStale = (entry: Entry): boolean =>
    settleOnce
      ? entry.result === undefined
      : entry.result === undefined || entry.result._tag === "Failure" || entry.invalidated ||
        now() - entry.settledAt >= entry.def.staleMs
  const hasLive = (entry: Entry): boolean => entry.patches.some((patch) => patch.live)
  /** Inside the fetch-free window, a hydrated entry. */
  const inWindow = (entry: Entry): boolean => windowOpen && entry.hydrated
  /** The server value. `waiting` means only that a stored fetch is in flight. */
  const view = (entry: Entry): AsyncResult.AsyncResult<any, any> => {
    const waiting = entry.fetch !== undefined
    return entry.result === undefined ? AsyncResult.initial(waiting) : withWaiting(entry.result, waiting)
  }
  /** The server value with every patch applied in issue order. A patch that throws is dropped from the entry. */
  const patchedViewOf = (entry: Entry, server: AsyncResult.AsyncResult<any, any>): PatchedView => {
    if (entry.patches.length === 0 || server._tag !== "Success") return { result: server, patched: false }
    let value = server.value
    for (const rec of entry.patches.slice()) {
      try {
        value = applyPatch(rec.patch, entry.def.name, entry.argsKey, entry.args, value)
      } catch {
        entry.patches = entry.patches.filter((other) => other !== rec)
      }
    }
    if (entry.patches.length === 0) return { result: server, patched: false }
    return {
      result: AsyncResult.success(value, { waiting: server.waiting, timestamp: server.timestamp }),
      patched: true
    }
  }
  /** Quiet over a cold entry, and skips a state equal to a watcher's last. */
  const emit = (entry: Entry): void => {
    if (entry.watchers.size === 0) return
    const server = view(entry)
    if (server._tag === "Initial") return
    let patchedView: PatchedView | undefined
    for (const watcher of Array.from(entry.watchers)) {
      if (!watcher.active) continue
      let result: AsyncResult.AsyncResult<any, any> = server
      let patched = false
      if (watcher.patched) {
        patchedView ??= patchedViewOf(entry, server)
        result = patchedView.result
        patched = patchedView.patched
      }
      if (patched === watcher.lastPatched && Equal.equals(result, watcher.last)) continue
      watcher.last = result
      watcher.lastPatched = patched
      watcher.onChange(result as Settled, patched)
    }
  }
  const emitFetch = (entry: Entry, trigger: Trigger, restart: boolean, stored: boolean): void => {
    if (fetchListeners.size === 0) return
    const event: FetchEvent = { read: entry.def.name, logKey: logKeyOf(entry), trigger, restart, stored }
    for (const listener of Array.from(fetchListeners)) {
      try {
        listener(event)
      } catch {
        // A listener can't change what the cache does.
      }
    }
  }

  // -- idle timer -------------------------------------------------------------
  const cancelIdle = (entry: Entry): void => {
    if (entry.idle !== undefined) {
      entry.idle.cancel()
      entry.idle = undefined
    }
  }
  // A live patch blocks collection. A patch held after success doesn't.
  const idleEligible = (entry: Entry): boolean =>
    !entry.removed && entry.watchers.size === 0 && entry.waiters.size === 0 && entry.fetch === undefined &&
    !hasLive(entry)
  const idleTtl = (entry: Entry): number => entry.def.idleMs ?? defaultIdleMs
  // Built like `RcMap`'s: an `expiresAt` a reset moves, and a sleep that goes round again.
  const startIdle = (entry: Entry): void => {
    cancelIdle(entry)
    // The server starts no idle timers.
    if (settleOnce) return
    const ttl = idleTtl(entry)
    if (ttl === Infinity) return
    if (ttl <= 0) return removeEntry(entry)
    const idle: Idle = { expiresAt: now() + ttl, cancel: () => {} }
    entry.idle = idle
    const sleep = (ms: number): void => {
      idle.cancel = timer(ms, () => {
        if (entry.idle !== idle) return
        const remaining = idle.expiresAt - now()
        if (remaining > 0) return sleep(remaining)
        entry.idle = undefined
        if (idleEligible(entry)) removeEntry(entry)
      })
    }
    sleep(ttl)
  }
  /** Called whenever the entry may have gone quiet: removes a cold one, starts the timer on a settled one. */
  const afterQuiet = (entry: Entry): void => {
    if (disposed || !idleEligible(entry)) return
    if (entry.result === undefined) return removeEntry(entry)
    if (entry.idle === undefined) startIdle(entry)
  }
  const resetIdle = (entry: Entry): void => {
    if (entry.idle !== undefined) entry.idle.expiresAt = now() + idleTtl(entry)
  }

  // -- interval ---------------------------------------------------------------
  const paused = (): boolean => !visibility.get() || !connectivity.get()
  const stopInterval = (entry: Entry): void => {
    if (entry.intervalCancel !== undefined) {
      entry.intervalCancel()
      entry.intervalCancel = undefined
    }
    entry.intervalDue = undefined
  }
  /** Worked out once per settle: a function form that throws or returns nonsense means none until the next. */
  const intervalMs = (entry: Entry): number | undefined => {
    if (entry.result === undefined) return undefined
    if (entry.interval !== undefined) return entry.interval.ms
    const ms = evaluateInterval(entry, entry.result)
    entry.interval = { ms }
    return ms
  }
  const evaluateInterval = (entry: Entry, result: Settled): number | undefined => {
    const interval = entry.def.refetchInterval
    if (interval === undefined) return undefined
    if (typeof interval === "number") return interval === Infinity ? undefined : interval
    let input: Duration.Input | undefined
    try {
      input = interval(result, entry.args)
    } catch (error) {
      const logKey = logKeyOf(entry)
      report(
        new IntervalThrew({
          read: entry.def.name,
          logKey,
          error,
          message: "[Loader] refetchInterval of " + quote(entry.def.name) + " threw at " + logKey +
            ". There is no interval until the next settle."
        })
      )
      return undefined
    }
    if (input === undefined) return undefined
    const ms = parseInterval(input)
    if (ms === "invalid") {
      const logKey = logKeyOf(entry)
      report(
        new IntervalInvalid({
          read: entry.def.name,
          logKey,
          message: "[Loader] refetchInterval of " + quote(entry.def.name) +
            " returned zero, a negative or a bare number under 1000 at " + logKey +
            ". There is no interval until the next settle. " + subSecondHint
        })
      )
      return undefined
    }
    return ms === Infinity ? undefined : ms
  }
  const fireInterval = (entry: Entry): void => {
    // Paused: the due time stays, and the edge pass picks it up.
    if (paused() || entry.fetch !== undefined || entry.watchers.size === 0) return
    const build = survivingBuild(entry)
    if (build !== undefined) ensureFetch(entry, "interval", build)
  }
  const armInterval = (entry: Entry): void => {
    if (entry.intervalCancel !== undefined) entry.intervalCancel()
    entry.intervalCancel = undefined
    if (entry.intervalDue === undefined) return
    const remaining = entry.intervalDue - now()
    if (remaining <= 0) {
      let cancelled = false
      entry.intervalCancel = () => {
        cancelled = true
      }
      defer(() => {
        if (cancelled) return
        entry.intervalCancel = undefined
        fireInterval(entry)
      })
      return
    }
    entry.intervalCancel = timer(remaining, () => {
      entry.intervalCancel = undefined
      fireInterval(entry)
    })
  }
  /** Counts from the last settle. Called at a settle and at the zero-to-one watch. */
  const scheduleInterval = (entry: Entry): void => {
    stopInterval(entry)
    if (settleOnce || entry.removed || entry.watchers.size === 0) return
    const ms = intervalMs(entry)
    if (ms === undefined) return
    entry.intervalDue = entry.settledAt + ms
    armInterval(entry)
  }
  /**
   * A fetch ended without a settle. If the interval's timer already fired,
   * nothing else would arm it again, so a new interval counts from now and
   * polling carries on. While paused the due time stays for the edge pass.
   */
  const rearmInterval = (entry: Entry): void => {
    if (settleOnce || disposed || entry.removed || entry.watchers.size === 0 || entry.fetch !== undefined) return
    if (entry.intervalCancel !== undefined || paused()) return
    const ms = intervalMs(entry)
    if (ms === undefined) return
    entry.intervalDue = now() + ms
    armInterval(entry)
  }
  const intervalElapsed = (entry: Entry): boolean => entry.intervalDue !== undefined && entry.intervalDue <= now()

  // -- fetching ---------------------------------------------------------------
  const startFetch = (entry: Entry, trigger: Trigger, build: Build, restart: boolean): void => {
    const fetch: FetchRec = { trigger, build, fiber: undefined }
    entry.fetch = fetch
    // A fetch after hydration makes the entry ordinary: a `get` joins it.
    entry.hydrated = false
    cancelIdle(entry)
    emitFetch(entry, trigger, restart, true)
    // The fetcher never starts inside the call that asked for it, nor before the fetch it replaces has finished
    // its cleanup. The wait is uninterruptible, so a chain of restarts still ends in order.
    const key = drainKey(entry)
    const previous = draining.get(key)
    const fiber = runFork(Effect.andThen(
      previous === undefined ? Effect.yieldNow : Effect.uninterruptible(Fiber.await(previous)),
      Effect.suspend(() => build.fetcher(entry.args))
    ))
    fetch.fiber = fiber
    fetchFibers.add(fiber)
    build.fibers.add(fiber)
    fiber.addObserver((exit) => {
      fetchFibers.delete(fiber)
      build.fibers.delete(fiber)
      if (draining.get(key) === fiber) draining.delete(key)
      onFetchExit(entry, fetch, exit)
    })
    emit(entry)
  }
  /**
   * Interrupts the fetch without settling anything, and without waiting for its cleanup: the entry's next fetch,
   * the build's close and the cache's disposal wait for that. The caller restarts or reverts.
   */
  const dropFetch = (entry: Entry, fetch: FetchRec): void => {
    entry.fetch = undefined
    if (fetch.fiber === undefined) return
    draining.set(drainKey(entry), fetch.fiber)
    fetch.fiber.interruptUnsafe()
  }
  /**
   * One fetch per entry: a caller that finds one in flight joins it. Under a
   * live patch nothing fetches, and the first trigger is kept for the check
   * made when the last live owner exits.
   */
  const ensureFetch = (entry: Entry, trigger: Trigger, build: Build): void => {
    if (entry.fetch !== undefined || disposed) return
    if (settleOnce && entry.result !== undefined) return
    if (hasLive(entry)) {
      entry.deferred ??= trigger
      return
    }
    startFetch(entry, trigger, build, false)
  }
  /** A restarted fetch keeps its trigger. Ten in a row with no settle between are reported, once. */
  const restartFetch = (entry: Entry, dropped: FetchRec, build: Build): void => {
    entry.restarts++
    if (entry.restarts === restartLimit) {
      const logKey = logKeyOf(entry)
      report(
        new FetchRestarted({
          read: entry.def.name,
          logKey,
          message: "[Loader] the fetch of " + quote(entry.def.name) + " at " + logKey + " was restarted " +
            restartLimit + " times in a row without settling."
        })
      )
    }
    startFetch(entry, dropped.trigger, build, true)
  }
  const resumeWaiters = (entry: Entry, exit: Exit.Exit<any, any>): void => {
    if (entry.waiters.size === 0) return
    const waiters = Array.from(entry.waiters)
    entry.waiters.clear()
    for (const waiter of waiters) waiter.resume(exit)
  }
  /** A settle or a stored write: patches held after success are confirmed and go. */
  const store = (entry: Entry, result: Settled): void => {
    entry.result = result
    entry.settledAt = now()
    entry.invalidated = false
    entry.restarts = 0
    entry.interval = undefined
    entry.hydrated = false
    if (entry.patches.length > 0) entry.patches = entry.patches.filter((patch) => patch.live)
    scheduleInterval(entry)
  }
  /**
   * A fetch ended with nothing to store and nothing to restart it: the entry keeps its previous state, its
   * freshness included. Only a defect marks the previous Success stale.
   */
  const revert = (entry: Entry): void => {
    resumeWaiters(entry, Exit.interrupt())
    emit(entry)
    rearmInterval(entry)
    afterQuiet(entry)
  }
  const onFetchExit = (entry: Entry, fetch: FetchRec, exit: Exit.Exit<any, any>): void => {
    if (entry.fetch !== fetch || disposed) return
    entry.fetch = undefined
    const previous = entry.result
    const waiterExit = callerExit(exit)
    let defect: Cause.Cause<never> | undefined
    let stored = false
    if (exit._tag === "Success") {
      store(entry, AsyncResult.success(exit.value, { timestamp: now() }))
      stored = true
    } else if (Cause.hasDies(exit.cause)) {
      // Never stored: the previous state stays, marked stale, so a remount fetches fresh.
      defect = diesOnly(exit.cause)
      if (previous !== undefined) entry.invalidated = true
    } else if (Cause.hasFails(exit.cause)) {
      const previousSuccess = previous === undefined
        ? Option.none<AsyncResult.Success<any, any>>()
        : previous._tag === "Success"
        ? Option.some(previous)
        : previous.previousSuccess
      // An unwatched entry never holds a Failure with no previous Success, except on the server.
      if (entry.watchers.size > 0 || settleOnce || Option.isSome(previousSuccess)) {
        store(entry, AsyncResult.failure(failsOnly(exit.cause), { previousSuccess }))
        stored = true
      }
    }
    // Otherwise interrupted, such as by the fetcher itself: a revert, never a Failure.
    resumeWaiters(entry, waiterExit)
    if (defect !== undefined) {
      for (const watcher of Array.from(entry.watchers)) {
        if (watcher.active) watcher.onDefect?.(defect)
      }
    }
    emit(entry)
    if (!stored) rearmInterval(entry)
    afterQuiet(entry)
  }
  /** The dropped fetch restarts under a surviving build, or the entry reverts. */
  const restartOrRevert = (entry: Entry, dropped: FetchRec, fallback: Build | undefined): void => {
    const next = survivingBuild(entry) ?? fallback
    if (next !== undefined) restartFetch(entry, dropped, next)
    else revert(entry)
  }
  function buildClosed(build: Build): void {
    attached.delete(build)
    if (disposed) return
    for (const entry of allEntries()) {
      const fetch = entry.fetch
      if (fetch === undefined || fetch.build !== build) continue
      dropFetch(entry, fetch)
      restartOrRevert(entry, fetch, undefined)
    }
    for (const shared of Array.from(sharedFetches)) {
      if (shared.build !== build) continue
      let next: Build | undefined
      for (const caller of shared.callers) {
        if (!caller.build.closed) {
          next = caller.build
          break
        }
      }
      if (next === undefined) {
        endShared(shared, Exit.interrupt())
      } else {
        shared.build = next
        runShared(shared, true)
      }
    }
  }

  // -- caller-only fetches ----------------------------------------------------
  /**
   * Like a stored fetch, a caller-only one starts only once what it replaces has finished its cleanup: the stored
   * fetch it was converted from, or its own fetch under a build that closed.
   */
  const runShared = (shared: Shared, restart: boolean): void => {
    emitFetch(shared.entry, "get", restart, false)
    const build = shared.build
    const previous: Array<Fiber.Fiber<any, any>> = []
    const stored = draining.get(drainKey(shared.entry))
    if (stored !== undefined) previous.push(stored)
    const replaced = shared.fiber
    if (replaced !== undefined) {
      // Cleared first, so the replaced fiber's exit doesn't end the callers' fetch.
      shared.fiber = undefined
      replaced.interruptUnsafe()
      previous.push(replaced)
    }
    const fiber = runFork(Effect.andThen(
      previous.length === 0 ? Effect.yieldNow : Effect.uninterruptible(Fiber.awaitAll(previous)),
      Effect.suspend(() => build.fetcher(shared.entry.args))
    ))
    shared.fiber = fiber
    fetchFibers.add(fiber)
    build.fibers.add(fiber)
    fiber.addObserver((exit) => {
      fetchFibers.delete(fiber)
      build.fibers.delete(fiber)
      if (shared.fiber === fiber && !disposed) endShared(shared, exit)
    })
  }
  /** Hands the exit to the callers. Nothing is stored and the entry doesn't change. */
  const endShared = (shared: Shared, exit: Exit.Exit<any, any>): void => {
    sharedFetches.delete(shared)
    if (shared.entry.shared === shared) shared.entry.shared = undefined
    const fiber = shared.fiber
    shared.fiber = undefined
    if (exit._tag === "Failure" && fiber !== undefined) fiber.interruptUnsafe()
    const callers = Array.from(shared.callers)
    shared.callers.clear()
    const out = callerExit(exit)
    for (const caller of callers) caller.resume(out)
  }
  const startShared = (entry: Entry, build: Build, callers: Iterable<Waiter>, restart: boolean): Shared => {
    const shared: Shared = { entry, build, callers: new Set(), fiber: undefined }
    for (const caller of callers) {
      caller.shared = shared
      shared.callers.add(caller)
    }
    entry.shared = shared
    sharedFetches.add(shared)
    runShared(shared, restart)
    return shared
  }
  /** A caller leaves: the fetch lives while it has callers. */
  const leave = (entry: Entry, waiter: Waiter): void => {
    const shared = waiter.shared
    if (shared === undefined) {
      entry.waiters.delete(waiter)
    } else if (shared.callers.delete(waiter) && shared.callers.size === 0) {
      endShared(shared, Exit.interrupt())
    }
    afterQuiet(entry)
  }

  // -- watch, peek, get, prefetch ---------------------------------------------
  const watch: CacheInternals["watch"] = (def, args, fetcher, onChange, onDefect, watchOptions) => {
    const entry = ensureEntry(register(def), args)
    const build = buildOf(fetcher)
    const first = entry.watchers.size === 0
    // Only the zero-to-one transition is a fetch trigger: a joining watcher never refetches. Inside the
    // fetch-free window a hydrated entry isn't fetched.
    if (first && isStale(entry) && !inWindow(entry)) ensureFetch(entry, "watch", build)
    const patched = watchOptions?.patched === true
    const current = patched ? patchedViewOf(entry, view(entry)) : { result: view(entry), patched: false }
    const watcher: Watcher = {
      onChange,
      onDefect,
      build,
      patched,
      last: current.result,
      lastPatched: current.patched,
      active: true
    }
    entry.watchers.add(watcher)
    cancelIdle(entry)
    if (first) scheduleInterval(entry)
    return {
      logKey: () => logKeyOf(entry),
      current: () => view(entry),
      patchedView: () => patchedViewOf(entry, view(entry)),
      unregister: () => {
        if (!watcher.active) return
        watcher.active = false
        entry.watchers.delete(watcher)
        if (entry.watchers.size > 0) return
        stopInterval(entry)
        if (isBareFailure(entry.result) && !settleOnce && !inWindow(entry)) entry.result = undefined
        afterQuiet(entry)
      }
    }
  }

  const peek: CacheInternals["peek"] = (def, args) => {
    const registered = register(def)
    const entry = lookup(registered, registered.argsKey(args))
    return entry === undefined ? AsyncResult.initial() : view(entry)
  }

  /** Waits for a caller-only fetch, joining the one in flight. */
  const getShared = (entry: Entry, build: Build): Effect.Effect<any, any> =>
    Effect.callback<any, any>((resume) => {
      const waiter: Waiter = { build, resume, shared: undefined }
      if (entry.shared === undefined) {
        startShared(entry, build, [waiter], false)
      } else {
        waiter.shared = entry.shared
        entry.shared.callers.add(waiter)
      }
      return Effect.sync(() => leave(entry, waiter))
    })

  /** Waits for the stored fetch, starting one when none is in flight. */
  const getStored = (entry: Entry, build: Build): Effect.Effect<any, any> =>
    Effect.callback<any, any>((resume) => {
      const waiter: Waiter = { build, resume, shared: undefined }
      entry.waiters.add(waiter)
      cancelIdle(entry)
      ensureFetch(entry, "get", build)
      return Effect.sync(() => leave(entry, waiter))
    })

  // The order of checks: own target, hydration window, live patch, staleness.
  const get: CacheInternals["get"] = (def, args, fetcher, run) =>
    Effect.suspend((): Effect.Effect<any, any> => {
      if (disposed) return Effect.interrupt
      const registered = register(def)
      const argsKey = registered.argsKey(args)
      // A started run reading back an entry it invalidates calls the fetcher itself: never from the store, never
      // joined and never stored.
      if (run !== undefined && run.isStarted() && run.invalidates(registered, argsKey)) {
        const existing = lookup(registered, argsKey)
        if (existing !== undefined) {
          resetIdle(existing)
          emitFetch(existing, "get", false, false)
        } else if (fetchListeners.size > 0) {
          const event: FetchEvent = {
            read: registered.name,
            logKey: registered.logKey(args, argsKey),
            trigger: "get",
            restart: false,
            stored: false
          }
          for (const listener of Array.from(fetchListeners)) {
            try {
              listener(event)
            } catch {
              // A listener can't change what the cache does.
            }
          }
        }
        return buildOf(fetcher).fetcher(args)
      }
      const entry = ensureEntry(registered, args, argsKey)
      const result = entry.result
      if (result !== undefined && (inWindow(entry) || settleOnce)) {
        resetIdle(entry)
        return settledEffect(result)
      }
      const build = buildOf(fetcher)
      if (hasLive(entry)) {
        resetIdle(entry)
        // A live patch only registers over a Success, and no stored fetch runs under it.
        if (result !== undefined && result._tag === "Success" && !isStale(entry)) return Effect.succeed(result.value)
        return getShared(entry, build)
      }
      if (result !== undefined && result._tag === "Success" && !isStale(entry)) {
        resetIdle(entry)
        return Effect.succeed(result.value)
      }
      return getStored(entry, build)
    })

  const prefetch: CacheInternals["prefetch"] = (def, args, fetcher) => {
    if (disposed) return
    const entry = ensureEntry(register(def), args)
    // Nothing under a live patch.
    if (hasLive(entry)) return
    if (inWindow(entry) || !isStale(entry)) return resetIdle(entry)
    ensureFetch(entry, "prefetch", buildOf(fetcher))
    afterQuiet(entry)
  }

  // -- invalidation -----------------------------------------------------------
  /** Naming a read registers it, so its hydrated entries are decoded and matched exactly. */
  const registerTargets = (targets: ReadonlyArray<Target>): void => {
    for (const target of targets) {
      if (isRead(target)) register(defOf(target))
      else if (target._tag === "Entry") register(defOf(target.read))
    }
  }
  /** Target resolution, written over the predicate: every entry it hits. A tag drops every raw entry. */
  const resolve = (targets: Targets): Set<Entry> => {
    const out = new Set<Entry>()
    for (const entry of allEntries()) {
      if (targetsHit(targets, entry.def.name, entry.def.tags, entry.argsKey)) out.add(entry)
    }
    if (targets.tags.size > 0) raw.clear()
    return out
  }
  const invalidateEntry = (entry: Entry): void => {
    entry.touched = ++seq
    // A never-fetched entry is a no-op.
    if (entry.result === undefined && entry.fetch === undefined) return
    if (entry.result !== undefined) entry.invalidated = true
    // Under a live patch the refetch waits for the last live owner.
    if (hasLive(entry)) {
      entry.deferred ??= "invalidation"
      return
    }
    // A refetch held back by a patch keeps the trigger it was held with.
    const trigger = entry.deferred ?? "invalidation"
    entry.deferred = undefined
    const fetch = entry.fetch
    if (fetch !== undefined) {
      // In flight: interrupted and restarted, watched or not. A prefetch restarts under its own build.
      dropFetch(entry, fetch)
      return restartOrRevert(entry, fetch, fetch.build.closed ? undefined : fetch.build)
    }
    if (entry.watchers.size > 0) {
      const build = survivingBuild(entry)
      if (build !== undefined) ensureFetch(entry, trigger, build)
    }
  }
  const invalidate: CacheInternals["invalidate"] = (targets, invalidateOptions) => {
    if (disposed) return
    registerTargets(targets)
    if (settleOnce) {
      if (invalidateOptions?.byHand === true) {
        const named = targets.find((target) => isRead(target) || target._tag === "Entry")
        const read = named === undefined
          ? undefined
          : isRead(named)
          ? defOf(named).name
          : defOf((named as EntryTarget).read).name
        report(
          new InvalidateIgnored({
            read,
            message: "[Loader] invalidate" + (read === undefined ? "" : " of " + quote(read)) +
              " was called on a per-request server cache, where it does nothing."
          })
        )
      }
      return
    }
    for (const entry of resolve(compileTargets(targets))) invalidateEntry(entry)
  }

  // -- runs, patches and writes -----------------------------------------------
  /** The check made when a run's patches stop being live on an entry: a refetch that was held back. */
  const settleRunEntry = (entry: Entry): void => {
    if (entry.removed) return
    if (!hasLive(entry)) {
      // A caller-only fetch in flight finishes for its callers. Later `get`s don't join it.
      entry.shared = undefined
      const deferred = entry.deferred
      entry.deferred = undefined
      if (entry.fetch === undefined && entry.watchers.size > 0) {
        if (isStale(entry) || (intervalElapsed(entry) && !paused())) {
          const build = survivingBuild(entry)
          if (build !== undefined) ensureFetch(entry, deferred ?? "invalidation", build)
        } else if (entry.intervalDue !== undefined && entry.intervalCancel === undefined && !paused()) {
          armInterval(entry)
        }
      }
    }
    emit(entry)
    afterQuiet(entry)
  }
  /** `Equal.equals`, true when it throws: a check that only reports never fails a run. */
  const equalsOrTrue = (a: unknown, b: unknown): boolean => {
    try {
      return Equal.equals(a, b)
    } catch {
      return true
    }
  }
  const isValidSuccess = (entry: Entry, value: unknown): boolean => {
    try {
      return entry.def.codec().isSuccess(value)
    } catch {
      return true
    }
  }
  const storeWrite = (entry: Entry, value: unknown, fresh: boolean): void => {
    const fetch = entry.fetch
    store(entry, AsyncResult.success(value, { timestamp: now() }))
    if (!fresh) entry.invalidated = true
    // A fetch that began before the write would overwrite it with older data.
    if (fetch !== undefined) {
      dropFetch(entry, fetch)
      restartOrRevert(entry, fetch, fetch.build.closed ? undefined : fetch.build)
    }
    if (entry.idle !== undefined) startIdle(entry)
    emit(entry)
    afterQuiet(entry)
  }
  /** Returns the entries stored fresh, and adds those whose write was skipped to `skipped`. */
  const applyWrites = (run: Run, writes: ReadonlyArray<Write>, skipped: Set<Entry>): Set<Entry> => {
    const fresh = new Set<Entry>()
    for (const set of writes) {
      const def = register(defOf(set.read))
      const argsKey = set[ArgsKey]
      const existing = lookup(def, argsKey)
      if (
        existing !== undefined && existing.born <= run.startSeq && !targetsHit(run.targets, def.name, def.tags, argsKey)
      ) {
        const logKey = logKeyOf(existing)
        report(
          new UncoveredWrite({
            read: def.name,
            logKey,
            command: run.command,
            message: "[Loader] " + quote(run.command) + " wrote " + quote(def.name) + " at " + logKey +
              ", which neither its invalidates nor a patch covers. The write applies."
          })
        )
      }
      const entry = existing ?? ensureEntry(def, set.args, argsKey)
      // A run issued later has already reached the entry: this answer may be the older one, so it isn't stored,
      // and the entry is invalidated.
      if (entry.reached > run.issue) {
        skipped.add(entry)
        continue
      }
      entry.reached = run.issue
      if (entry.patches.some((patch) => patch.live && patch.run !== run)) {
        // Under another run's live patch it isn't stored, and the entry goes stale.
        entry.touched = ++seq
        if (entry.result !== undefined) entry.invalidated = true
        entry.deferred ??= "invalidation"
        continue
      }
      const isFresh = entry.touched <= run.startSeq
      entry.touched = ++seq
      storeWrite(entry, set.value, isFresh)
      if (isFresh) fresh.add(entry)
    }
    return fresh
  }
  const beginRun: CacheInternals["beginRun"] = (runOptions) => {
    const optimistic = runOptions.optimistic ?? []
    registerTargets(runOptions.invalidates)
    const targets = compileTargets(runOptions.invalidates, optimistic)
    // A patch over an entry with no Success isn't registered, silently.
    const planned: Array<{ readonly entry: Entry; readonly patch: Patch }> = []
    for (const patch of optimistic) {
      const def = register(defOf(patch.read))
      if (patch._tag === "Patch") {
        const entry = lookup(def, patch[ArgsKey])
        if (entry !== undefined && entry.result?._tag === "Success") planned.push({ entry, patch })
      } else {
        for (const entry of index.get(def.name)?.values() ?? []) {
          if (entry.result?._tag === "Success") planned.push({ entry, patch })
        }
      }
    }
    // First application is all-or-nothing: a throw here leaves nothing registered.
    const values = new Map<Entry, unknown>()
    const before = new Map<Entry, { readonly encoded: unknown } | undefined>()
    const invalid = new Set<Entry>()
    for (const { entry, patch } of planned) {
      if (!values.has(entry)) {
        const server = (entry.result as AsyncResult.Success<any, any>).value
        // Materialized: an encoding can share parts with the value, such as under `Schema.Any`.
        before.set(entry, materializedEncoding(() => entry.def.codec().encodeSuccess(server)))
        values.set(
          entry,
          (patchedViewOf(entry, entry.result!) as { readonly result: AsyncResult.Success<any, any> })
            .result.value
        )
      }
      const next = applyPatch(patch, entry.def.name, entry.argsKey, entry.args, values.get(entry))
      values.set(entry, next)
      if (!isValidSuccess(entry, next)) invalid.add(entry)
    }
    const run: Run = {
      command: runOptions.command,
      issue: ++issued,
      targets,
      startSeq: seq,
      started: false,
      done: false,
      entries: new Set()
    }
    for (const { entry, patch } of planned) {
      entry.patches.push({ run, patch, live: true })
      run.entries.add(entry)
    }
    for (const entry of run.entries) {
      const logKey = logKeyOf(entry)
      if (invalid.has(entry)) {
        report(
          new PatchInvalid({
            read: entry.def.name,
            logKey,
            command: run.command,
            message: "[Loader] a patch of " + quote(run.command) + " on " + quote(entry.def.name) + " at " + logKey +
              " made a value the read's success Schema rejects. It is used as is."
          })
        )
      }
      const encoded = before.get(entry)
      if (encoded !== undefined && entry.result?._tag === "Success") {
        const value = entry.result.value
        const after = materializedEncoding(() => entry.def.codec().encodeSuccess(value))
        if (after !== undefined && !equalsOrTrue(encoded.encoded, after.encoded)) {
          report(
            new PatchMutated({
              read: entry.def.name,
              logKey,
              command: run.command,
              message: "[Loader] a patch of " + quote(run.command) + " on " + quote(entry.def.name) + " at " +
                logKey + " changed the value it was given. A patch must return a new value."
            })
          )
        }
      }
      // No stored fetch runs on an entry with a live patch. `get` callers waiting on it get a caller-only fetch.
      const fetch = entry.fetch
      if (fetch !== undefined) {
        dropFetch(entry, fetch)
        entry.deferred ??= fetch.trigger
        if (entry.waiters.size > 0) {
          const waiters = Array.from(entry.waiters)
          entry.waiters.clear()
          const build = waiters.find((waiter) => !waiter.build.closed)?.build
          if (build === undefined) {
            for (const waiter of waiters) waiter.resume(Exit.interrupt())
          } else {
            startShared(entry, build, waiters, true)
          }
        }
      }
      cancelIdle(entry)
      emit(entry)
    }
    const handle: RunHandle = {
      command: run.command,
      run: (body, writes) => runBody(handle, body, writes),
      invalidates: (def, argsKey) => targetsHit(targets, def.name, def.tags, argsKey),
      start: () => {
        if (run.started || run.done) return
        run.started = true
        run.startSeq = seq
      },
      isStarted: () => run.started && !run.done,
      finish: (exit) => {
        if (run.done) return
        run.done = true
        // A run may outlive the cache.
        if (disposed) return
        if (exit._tag === "Success") {
          for (const entry of run.entries) {
            for (const patch of entry.patches) if (patch.run === run) patch.live = false
          }
          const skipped = new Set<Entry>()
          const fresh = applyWrites(run, exit.writes, skipped)
          if (!settleOnce) {
            const hit = resolve(targets)
            for (const entry of skipped) hit.add(entry)
            for (const entry of hit) {
              // Only a write stored fresh is left out of its run's own invalidation.
              if (fresh.has(entry)) continue
              if (run.issue > entry.reached) entry.reached = run.issue
              invalidateEntry(entry)
            }
          }
        } else {
          for (const entry of run.entries) entry.patches = entry.patches.filter((patch) => patch.run !== run)
          if (exit._tag === "Failure" && !settleOnce) {
            // A failed run may still have landed its server write, so an older answer is no longer the latest.
            for (const entry of resolve(targets)) {
              if (run.issue > entry.reached) entry.reached = run.issue
              invalidateEntry(entry)
            }
          }
        }
        for (const entry of run.entries) settleRunEntry(entry)
      }
    }
    return handle
  }

  // -- hydration --------------------------------------------------------------
  /** Decodes the raw hydrated entries of a read that just registered. */
  function decodeRaw(def: ReadDef): void {
    const byKey = raw.get(def.name)
    if (byKey === undefined) return
    raw.delete(def.name)
    for (const [wireKey, tuple] of byKey) {
      let args: unknown
      let argsKey: string
      try {
        args = def.codec().decodeArgs(wireKey)
        argsKey = def.argsKey(args)
      } catch {
        report(
          new HydrationDecodeFailed({
            read: def.name,
            part: "args",
            logKey: undefined,
            message: "[Loader] the args of a hydrated entry of " + quote(def.name) +
              " failed to decode. The entry is cold."
          })
        )
        continue
      }
      const existing = lookup(def, argsKey)
      if (existing?.result !== undefined) continue
      let result: Settled
      try {
        const codec = def.codec()
        result = tuple[1] === 0
          ? AsyncResult.success(codec.decodeSuccess(tuple[2]), { timestamp: tuple[3] })
          : AsyncResult.failure(
            Cause.fromReasons(tuple[2].map((error) => Cause.makeFailReason(codec.decodeError(error))))
          )
      } catch {
        const logKey = def.logKey(args, argsKey)
        report(
          new HydrationDecodeFailed({
            read: def.name,
            part: "value",
            logKey,
            message: "[Loader] a hydrated entry of " + quote(def.name) + " at " + logKey +
              " failed to decode. The entry is cold."
          })
        )
        continue
      }
      const entry = existing ?? ensureEntry(def, args, argsKey)
      entry.result = result
      // It ages from the client's mount. Under `static` its age is unknown: stale unless never stale by age.
      entry.settledAt = hydratedAt
      entry.invalidated = hydratedStatic && def.staleMs !== Infinity
      entry.hydrated = windowOpen
      afterQuiet(entry)
    }
  }
  const hydrate: CacheInternals["hydrate"] = (input, hydrateOptions) => {
    if (disposed) return
    const parsed = parseRaw(input)
    if (parsed === undefined) {
      report(new HydrationMalformed({ message: "[Loader] the ~loader state isn't the tuple shape. It was ignored." }))
      return
    }
    hydratedAt = now()
    hydratedStatic = hydrateOptions?.static === true
    windowOpen = !hydratedStatic
    raw = parsed
    // Reads the cache has already seen decode at once.
    for (const name of Array.from(raw.keys())) {
      const def = reads.get(name)
      if (def !== undefined) decodeRaw(def)
    }
  }
  const closeWindow = (): void => {
    if (!windowOpen) return
    windowOpen = false
    for (const [name, byKey] of raw) {
      for (const [argsKey, tuple] of byKey) if (tuple[1] === 1) byKey.delete(argsKey)
      if (byKey.size === 0) raw.delete(name)
    }
    for (const entry of allEntries()) {
      if (!entry.hydrated) continue
      entry.hydrated = false
      if (entry.watchers.size === 0 && isBareFailure(entry.result)) {
        entry.result = undefined
        afterQuiet(entry)
      }
    }
  }
  const dehydrate: CacheInternals["dehydrate"] = () => {
    const out: Dehydrated = {}
    for (const entry of allEntries()) {
      if (entry.fetch !== undefined) dropFetch(entry, entry.fetch)
      resumeWaiters(entry, Exit.interrupt())
      if (entry.shared !== undefined) endShared(entry.shared, Exit.interrupt())
      const result = entry.result
      if (result === undefined) {
        afterQuiet(entry)
        continue
      }
      try {
        const codec = entry.def.codec()
        const tuple: RawTuple = result._tag === "Success"
          ? [entry.argsKey, 0, codec.encodeSuccess(result.value), result.timestamp]
          : [
            entry.argsKey,
            1,
            result.cause.reasons.filter(Cause.isFailReason).map((reason) => codec.encodeError(reason.error)),
            entry.settledAt
          ]
        ;(out[entry.def.name] ??= []).push(tuple)
      } catch {
        const logKey = logKeyOf(entry)
        report(
          new EncodeFailed({
            read: entry.def.name,
            logKey,
            message: "[Loader] the entry of " + quote(entry.def.name) + " at " + logKey +
              " failed to encode. It was left out, and the client fetches it."
          })
        )
      }
    }
    return out
  }
  const seed: CacheInternals["seed"] = (snapshot) => {
    const data = snapshotData(snapshot)
    // A per-request cache never refetches a settled entry, so a seed there would be final.
    if (disposed || settleOnce || data === undefined) return false
    // Never from a value that may never have been saved.
    if (data.patched || data.argsKey === undefined || data.result?._tag !== "Success") return false
    const def = register(data.def)
    const existing = lookup(def, data.argsKey)
    if (existing?.result !== undefined) return false
    const entry = existing ?? ensureEntry(def, data.args, data.argsKey)
    entry.result = AsyncResult.success(data.result.value, { timestamp: data.result.timestamp })
    entry.settledAt = now()
    entry.invalidated = true
    afterQuiet(entry)
    return true
  }

  // -- host signals -----------------------------------------------------------
  /** One synchronous pass over watched entries, on a false-to-true edge with both signals then true. */
  const edgePass = (trigger: "visibility" | "connectivity"): void => {
    for (const entry of allEntries()) {
      if (entry.watchers.size === 0 || entry.fetch !== undefined) continue
      if (isStale(entry) || intervalElapsed(entry)) {
        const build = survivingBuild(entry)
        if (build !== undefined) ensureFetch(entry, trigger, build)
      } else if (entry.intervalDue !== undefined && entry.intervalCancel === undefined) {
        // Not due yet: it sleeps for the remainder.
        armInterval(entry)
      }
    }
  }
  const listen = (signal: Signal, trigger: "visibility" | "connectivity"): () => void => {
    let last = signal.get()
    return signal.subscribe((value) => {
      const was = last
      last = value
      if (disposed || settleOnce || was || !value || paused()) return
      edgePass(trigger)
    })
  }
  const offVisibility = listen(visibility, "visibility")
  const offConnectivity = listen(connectivity, "connectivity")

  // -- the service ------------------------------------------------------------
  const self: CacheInternals = {
    [CacheTypeId]: CacheTypeId,
    register: (def) => {
      register(def)
    },
    watch,
    peek,
    get,
    prefetch,
    invalidate,
    beginRun,
    dehydrate,
    hydrate,
    closeWindow,
    isWindowOpen: () => windowOpen,
    seed,
    onFetch: (listener) => {
      fetchListeners.add(listener)
      return () => {
        fetchListeners.delete(listener)
      }
    },
    inspect: (def, args) => {
      const registered = register(def)
      const entry = lookup(registered, registered.argsKey(args))
      if (entry === undefined) return undefined
      const stored = view(entry)
      const patched = patchedViewOf(entry, stored)
      return {
        stored,
        view: patched.result,
        patched: patched.patched,
        stale: isStale(entry),
        watchers: entry.watchers.size,
        fetch: entry.fetch !== undefined ? "running" : entry.deferred !== undefined ? "held" : "none",
        trigger: entry.fetch?.trigger ?? entry.deferred,
        patches: {
          live: entry.patches.filter((patch) => patch.live).length,
          held: entry.patches.filter((patch) => !patch.live).length
        }
      }
    }
  }

  Effect.runSync(Scope.addFinalizer(
    options.scope,
    Effect.suspend(() => {
      disposed = true
      offVisibility()
      offConnectivity()
      for (const build of attached) build.listeners.delete(buildClosed)
      attached.clear()
      for (const entry of allEntries()) {
        if (entry.fetch !== undefined) dropFetch(entry, entry.fetch)
        resumeWaiters(entry, Exit.interrupt())
      }
      for (const shared of Array.from(sharedFetches)) endShared(shared, Exit.interrupt())
      for (const fiber of Array.from(timers)) fiber.interruptUnsafe()
      timers.clear()
      // Disposal ends when every fetch has finished its cleanup.
      return Fiber.interruptAll(fetchFibers)
    })
  ))

  return self
}
