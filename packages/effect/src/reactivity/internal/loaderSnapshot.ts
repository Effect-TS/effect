/**
 * PROTOTYPE (EFF-3558). The snapshot of a cache entry a Model holds, and its
 * Schema. Re-exported from `Loader` as `Loader.Snapshot`. Imports nothing
 * from effect/ui.
 */
import * as Cause from "../../Cause.ts"
import * as Effect from "../../Effect.ts"
import * as Equal from "../../Equal.ts"
import * as Hash from "../../Hash.ts"
import * as Option from "../../Option.ts"
import * as Schema from "../../Schema.ts"
import * as SchemaAST from "../../SchemaAST.ts"
import * as SchemaIssue from "../../SchemaIssue.ts"
import * as SchemaTransformation from "../../SchemaTransformation.ts"
import * as AsyncResult from "../AsyncResult.ts"
import type * as Loader from "../Loader.ts"

// Type-only import of Loader, so there is no runtime cycle with the module that re-exports this one.
const LoaderTypeId: typeof Loader.TypeId = "~effect/reactivity/Loader"

/**
 * @stability experimental
 * @category type ids
 * @since 4.1.3
 */
export const SnapshotTypeId = "~effect/reactivity/Loader/Snapshot" as const

type Settled<A, E> = AsyncResult.Success<A, E> | AsyncResult.Failure<A, E>

/** What a snapshot holds. Not public: only this module and the runtime read it. */
interface SnapshotData {
  readonly read: string
  readonly label: string
  /** `undefined` only for the empty snapshot. */
  readonly argsKey: string | undefined
  readonly result: Settled<any, any> | undefined
  /** The value includes an unconfirmed optimistic patch (resolution #7). Only ever true over a Success. */
  readonly patched: boolean
}

/**
 * An opaque, read-only copy of a cache entry, for the Model. Branded by read
 * and label. Only `$.empty`, a watch's message and `effect/ui/testing` make one,
 * and only a component's loaders read one.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Snapshot<in out Read, in out Label extends string> {
  readonly [SnapshotTypeId]: {
    readonly _Read: (_: Read) => Read
    readonly _Label: (_: Label) => Label
  }
}

class SnapshotImpl implements Equal.Equal {
  readonly [SnapshotTypeId]: SnapshotData
  constructor(data: SnapshotData) {
    this[SnapshotTypeId] = data
  }
  [Equal.symbol](that: unknown): boolean {
    if (!(that instanceof SnapshotImpl)) return false
    const a = this[SnapshotTypeId]
    const b = that[SnapshotTypeId]
    return a.read === b.read && a.label === b.label && a.argsKey === b.argsKey && a.patched === b.patched &&
      Equal.equals(a.result, b.result)
  }
  [Hash.symbol](): number {
    const data = this[SnapshotTypeId]
    return Hash.string(`${data.read}\u0000${data.label}\u0000${data.argsKey}`)
  }
}

const dataOf = (snapshot: Snapshot<any, any>): SnapshotData => (snapshot as unknown as SnapshotImpl)[SnapshotTypeId]

/** @internal */
export const makeSnapshot = (
  read: Loader.AnyDefinition,
  label: string,
  argsKey: string | undefined,
  result: Settled<any, any> | undefined,
  patched = false
): Snapshot<any, any> =>
  new SnapshotImpl({
    read: read[LoaderTypeId].key,
    label,
    argsKey,
    result,
    patched: patched && result?._tag === "Success"
  }) as unknown as Snapshot<any, any>

/**
 * The snapshot a field holds before its first emission. Opens as Initial.
 *
 * @internal
 */
export const emptySnapshot = (read: Loader.AnyDefinition, label: string): Snapshot<any, any> =>
  makeSnapshot(read, label, undefined, undefined)

/**
 * Strict open: the stored result when `argsKey` (the loader's current args) is
 * the snapshot's key, otherwise Initial, waiting when the read is enabled.
 *
 * @internal
 */
export const open = (
  snapshot: Snapshot<any, any>,
  argsKey: string | undefined
): AsyncResult.AsyncResult<any, any> => {
  if (argsKey === undefined) return AsyncResult.initial(false)
  const data = dataOf(snapshot)
  if (data.result === undefined || data.argsKey !== argsKey) return AsyncResult.initial(true)
  return data.result
}

/**
 * Whether the opened value includes an unconfirmed patch: false when `open` is Initial.
 *
 * @internal
 */
export const patched = (snapshot: Snapshot<any, any>, argsKey: string | undefined): boolean => {
  const data = dataOf(snapshot)
  return argsKey !== undefined && data.argsKey === argsKey && data.patched
}

/**
 * "Keep previous" (resolution #3): the value the snapshot holds for another key,
 * only while the loader is enabled and its current args are not the snapshot's.
 * A Failure gives its `previousSuccess`.
 *
 * @internal
 */
export const previous = (snapshot: Snapshot<any, any>, argsKey: string | undefined): Option.Option<any> => {
  if (argsKey === undefined) return Option.none()
  const data = dataOf(snapshot)
  if (data.result === undefined || data.argsKey === undefined || data.argsKey === argsKey) return Option.none()
  return AsyncResult.value(data.result)
}

/**
 * What history restore seeds a cold entry from (resolution #8): the snapshot's
 * key and Success, unless it was taken under a patch.
 *
 * @internal
 */
export const seedOf = (
  snapshot: Snapshot<any, any>
):
  | { readonly argsKey: string; readonly value: unknown; readonly timestamp: number; readonly patched: boolean }
  | undefined =>
{
  const data = dataOf(snapshot)
  if (data.argsKey === undefined || data.result === undefined || data.result._tag !== "Success") return undefined
  return { argsKey: data.argsKey, value: data.result.value, timestamp: data.result.timestamp, patched: data.patched }
}

/**
 * The annotation `Snapshot` schemas carry, so `Component.make` and the runtime
 * find snapshot fields in a Model's AST.
 *
 * @internal
 */
export const annotationKey = "~effect/reactivity/Loader/Snapshot/field"

/** @internal */
export interface Field {
  readonly read: string
  readonly label: string
  readonly definition: Loader.AnyDefinition
}

/** @internal */
export interface Found extends Field {
  /** Inside an array or a record. */
  readonly inArray: boolean
  /** The Model's own field holding it directly, the only place a loader can bind. */
  readonly field: string | undefined
}

/**
 * The snapshot fields of a Model schema. `Schema.suspend` isn't followed.
 *
 * @internal
 */
export const fieldsOf = (schema: Schema.Top): ReadonlyArray<Found> => {
  const out: Array<Found> = []
  const seen = new Set<SchemaAST.AST>()
  const visit = (ast: SchemaAST.AST, inArray: boolean, field: string | undefined): void => {
    switch (ast._tag) {
      case "Declaration": {
        const found = SchemaAST.resolveAt<Field>(annotationKey)(ast)
        // Not deduplicated by AST: one Snapshot schema value may sit in two fields.
        if (found !== undefined) {
          out.push({ ...found, inArray, field })
          return
        }
        if (seen.has(ast)) return
        seen.add(ast)
        for (const param of ast.typeParameters) visit(param, inArray, undefined)
        return
      }
      case "Objects": {
        if (seen.has(ast)) return
        seen.add(ast)
        const top = ast === schema.ast
        for (const signature of ast.propertySignatures) {
          visit(signature.type, inArray, top && typeof signature.name === "string" ? signature.name : undefined)
        }
        for (const signature of ast.indexSignatures) visit(signature.type, true, undefined)
        return
      }
      case "Arrays": {
        if (seen.has(ast)) return
        seen.add(ast)
        for (const element of ast.elements) visit(element, inArray, undefined)
        for (const element of ast.rest) visit(element, true, undefined)
        return
      }
      case "Union": {
        if (seen.has(ast)) return
        seen.add(ast)
        for (const member of ast.types) visit(member, inArray, undefined)
        return
      }
      default:
        return
    }
  }
  visit(schema.ast, false, undefined)
  return out
}

/**
 * The Model's Schema-level check, at module load in every build. Throws on a
 * snapshot inside an array or record, on two fields with one (read, label), on
 * a snapshot that isn't directly a field of the Model (it has no loader key),
 * and on a label that isn't its field's name. Returns the bindable fields.
 *
 * @internal
 */
export const checkModel = (name: string, schema: Schema.Top): ReadonlyArray<Found & { readonly field: string }> => {
  const seen = new Set<string>()
  const found = fieldsOf(schema)
  for (const field of found) {
    const id = `${field.read} "${field.label}"`
    if (field.inArray) {
      throw new Error(
        `${name}: the Model holds the snapshot ${id} inside an array or record. One loader is one read: use child instances for N reads.`
      )
    }
    if (seen.has(id)) throw new Error(`${name}: the Model has two snapshot fields for ${id}. Give each its own label.`)
    seen.add(id)
  }
  for (const field of found) {
    const id = `${field.read} "${field.label}"`
    if (field.field === undefined) {
      throw new Error(
        `${name}: the Model holds the snapshot ${id} nested in a union, a struct or an optional field. Only a field of the Model itself has a loader.`
      )
    }
    if (field.field !== field.label) {
      throw new Error(
        `${name}: the Model field "${field.field}" holds the snapshot ${id}. A snapshot's label is its field's name: use Loader.Snapshot(read, "${field.field}").`
      )
    }
  }
  return found as ReadonlyArray<Found & { readonly field: string }>
}

// -- wire ---------------------------------------------------------------------
// [] for empty, [argsKey, 0, success, timestamp] for a Success ([..., 1] when taken under a patch) and
// [argsKey, 1, [error, ...], 0, [success, timestamp]?] for a Failure: the ~loader tuples,
// plus a Failure's previous Success. `waiting` is never written.

const encode = (def: Loader.ReadInternal, data: SnapshotData): unknown => {
  const result = data.result
  if (result === undefined || data.argsKey === undefined) return []
  if (result._tag === "Success") {
    const out: Array<unknown> = [data.argsKey, 0, def.encodeSuccess(result.value), result.timestamp]
    // The patched bit goes into history.state, so a restore never seeds the cache from an unconfirmed value.
    if (data.patched) out.push(1)
    return out
  }
  const errors = result.cause.reasons.filter(Cause.isFailReason).map((reason) => def.encodeError(reason.error))
  return Option.isSome(result.previousSuccess)
    ? [data.argsKey, 1, errors, 0, [
      def.encodeSuccess(result.previousSuccess.value.value),
      result.previousSuccess.value.timestamp
    ]]
    : [data.argsKey, 1, errors, 0]
}

const decode = (read: Loader.AnyDefinition, label: string, encoded: unknown): Snapshot<any, any> => {
  const def = read[LoaderTypeId]
  if (!Array.isArray(encoded)) throw new Error("expected an array")
  if (encoded.length === 0) return makeSnapshot(read, label, undefined, undefined)
  const [argsKey, tag, payload, timestamp, previous] = encoded
  if (typeof argsKey !== "string") throw new Error("expected an args key")
  if (tag === 0) {
    return makeSnapshot(
      read,
      label,
      argsKey,
      AsyncResult.success(def.decodeSuccess(payload), { timestamp: Number(timestamp) }),
      previous === 1
    )
  }
  if (tag === 1 && Array.isArray(payload)) {
    return makeSnapshot(
      read,
      label,
      argsKey,
      AsyncResult.failure(
        Cause.fromReasons(payload.map((error) => Cause.makeFailReason(def.decodeError(error)))),
        {
          previousSuccess: Array.isArray(previous)
            ? Option.some(AsyncResult.success(def.decodeSuccess(previous[0]), { timestamp: Number(previous[1]) }))
            : Option.none()
        }
      )
    )
  }
  throw new Error("expected a Success or a Failure")
}

/**
 * The Schema returned by `Snapshot(read, label)`. Its `make` input is the
 * branded snapshot, so a struct or tagged-union constructor rejects a snapshot
 * of another read or label.
 *
 * @stability experimental
 * @category schemas
 * @since 4.1.3
 */
export interface SnapshotSchema<Read, Label extends string> extends Schema.declare<Snapshot<Read, Label>> {}

/**
 * The Schema of a Model field holding the snapshot of `read`. `label` is the
 * field's name.
 *
 * @stability experimental
 * @category schemas
 * @since 4.1.3
 */
export const Snapshot = <Read extends Loader.AnyDefinition, const Label extends string>(
  read: Read,
  label: Label
): SnapshotSchema<Read, Label> => {
  const def = read[LoaderTypeId]
  const is = (u: unknown): u is Snapshot<Read, Label> =>
    u instanceof SnapshotImpl && u[SnapshotTypeId].read === def.key && u[SnapshotTypeId].label === label
  return Schema.declare<Snapshot<Read, Label>>(is, {
    expected: `Loader.Snapshot(${def.key}, "${label}")`,
    [annotationKey]: { read: def.key, label, definition: read } satisfies Field,
    toCodecJson: () =>
      Schema.link<Snapshot<Read, Label>>()(
        Schema.Unknown,
        SchemaTransformation.transformEffect({
          decode: (encoded: unknown) =>
            Effect.try({
              try: () => decode(read, label, encoded) as Snapshot<Read, Label>,
              catch: (error) =>
                new SchemaIssue.InvalidValue(
                  { message: `not a snapshot of ${def.key}: ${String(error)}` },
                  encoded
                )
            }),
          encode: (snapshot: Snapshot<Read, Label>) =>
            Effect.try({
              try: () => encode(def, dataOf(snapshot)),
              catch: (error) => new SchemaIssue.InvalidValue({ message: String(error) }, snapshot)
            })
        })
      )
  } as any)
}
