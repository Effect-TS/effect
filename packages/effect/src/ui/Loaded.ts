/**
 * PROTOTYPE (EFF-3558). Binds a `Loader` read to a component: the Model holds
 * an opaque snapshot, a watch in `subscriptions` keeps it current, and the
 * view opens it with the binding's current args.
 *
 * @stability experimental
 * @since 4.1.3
 */
import * as Cause from "../Cause.ts"
import * as Effect from "../Effect.ts"
import * as Equal from "../Equal.ts"
import * as Hash from "../Hash.ts"
import * as Option from "../Option.ts"
import * as AsyncResult from "../reactivity/AsyncResult.ts"
import * as Loader from "../reactivity/Loader.ts"
import * as Schema from "../Schema.ts"
import * as SchemaAST from "../SchemaAST.ts"
import * as SchemaIssue from "../SchemaIssue.ts"
import * as SchemaTransformation from "../SchemaTransformation.ts"
import * as Stream from "../Stream.ts"
import * as services from "./internal/services.ts"
import * as Subscription from "./Subscription.ts"

/**
 * @stability experimental
 * @category type ids
 * @since 4.1.3
 */
export const SnapshotTypeId = "~effect/ui/Loaded/Snapshot" as const

type Settled<A, E> = AsyncResult.Success<A, E> | AsyncResult.Failure<A, E>

/** What a snapshot holds. Not public: only this module and the runtime read it. */
interface SnapshotData {
  readonly read: string
  readonly label: string
  /** `undefined` only for the binding's `empty`. */
  readonly argsKey: string | undefined
  readonly result: Settled<any, any> | undefined
}

/**
 * An opaque, read-only copy of a cache entry, for the Model. Branded by read
 * and label. Only `empty`, a watch's message and `effect/ui/testing` make one,
 * and only the binding's `open` reads one.
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
    return a.read === b.read && a.label === b.label && a.argsKey === b.argsKey && Equal.equals(a.result, b.result)
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
  result: Settled<any, any> | undefined
): Snapshot<any, any> =>
  new SnapshotImpl({ read: read[Loader.TypeId].key, label, argsKey, result }) as unknown as Snapshot<any, any>

/**
 * The annotation `Snapshot` schemas carry, so the runtime finds snapshot
 * fields in a Model's AST.
 *
 * @internal
 */
export const annotationKey = "~effect/ui/Loaded/field"

/** @internal */
export interface Field {
  readonly read: string
  readonly label: string
}

/**
 * The snapshot fields of a Model schema, with whether each sits inside an
 * array. `Schema.suspend` isn't followed.
 *
 * @internal
 */
export const fieldsOf = (schema: Schema.Top): ReadonlyArray<Field & { readonly inArray: boolean }> => {
  const out: Array<Field & { readonly inArray: boolean }> = []
  const seen = new Set<SchemaAST.AST>()
  const visit = (ast: SchemaAST.AST, inArray: boolean): void => {
    if (seen.has(ast)) return
    seen.add(ast)
    switch (ast._tag) {
      case "Declaration": {
        const field = SchemaAST.resolveAt<Field>(annotationKey)(ast)
        if (field !== undefined) out.push({ ...field, inArray })
        for (const param of ast.typeParameters) visit(param, inArray)
        return
      }
      case "Objects": {
        for (const signature of ast.propertySignatures) visit(signature.type, inArray)
        for (const signature of ast.indexSignatures) visit(signature.type, true)
        return
      }
      case "Arrays": {
        for (const element of ast.elements) visit(element, inArray)
        for (const element of ast.rest) visit(element, true)
        return
      }
      case "Union": {
        for (const member of ast.types) visit(member, inArray)
        return
      }
      default:
        return
    }
  }
  visit(schema.ast, false)
  return out
}

/**
 * The Model's Schema-level check (EFF-3554): throws on a snapshot inside an
 * array or record, and on two fields with one (read, label).
 *
 * @internal
 */
export const checkModel = (name: string, schema: Schema.Top): void => {
  const seen = new Set<string>()
  for (const field of fieldsOf(schema)) {
    const id = `${field.read} "${field.label}"`
    if (field.inArray) {
      throw new Error(
        `${name}: the Model holds the snapshot ${id} inside an array or record. One binding is one read: use child instances for N reads.`
      )
    }
    if (seen.has(id)) throw new Error(`${name}: the Model has two snapshot fields for ${id}. Give each its own label.`)
    seen.add(id)
  }
}

// -- wire ---------------------------------------------------------------------
// [] for empty, [argsKey, 0, success, timestamp] for a Success and
// [argsKey, 1, [error, ...], 0, [success, timestamp]?] for a Failure: the ~loader tuples,
// plus a Failure's previous Success. `waiting` is never written.

const encode = (def: Loader.ReadInternal, data: SnapshotData): unknown => {
  const result = data.result
  if (result === undefined || data.argsKey === undefined) return []
  if (result._tag === "Success") return [data.argsKey, 0, def.encodeSuccess(result.value), result.timestamp]
  const errors = result.cause.reasons.filter(Cause.isFailReason).map((reason) => def.encodeError(reason.error))
  return Option.isSome(result.previousSuccess)
    ? [data.argsKey, 1, errors, 0, [
      def.encodeSuccess(result.previousSuccess.value.value),
      result.previousSuccess.value.timestamp
    ]]
    : [data.argsKey, 1, errors, 0]
}

const decode = (read: Loader.AnyDefinition, label: string, encoded: unknown): Snapshot<any, any> => {
  const def = read[Loader.TypeId]
  if (!Array.isArray(encoded)) throw new Error("expected an array")
  if (encoded.length === 0) return makeSnapshot(read, label, undefined, undefined)
  const [argsKey, tag, payload, timestamp, previous] = encoded
  if (typeof argsKey !== "string") throw new Error("expected an args key")
  if (tag === 0) {
    return makeSnapshot(
      read,
      label,
      argsKey,
      AsyncResult.success(def.decodeSuccess(payload), { timestamp: Number(timestamp) })
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
 * The Schema of a Model field holding the snapshot of `read` under `label`.
 *
 * @stability experimental
 * @category schemas
 * @since 4.1.3
 */
export const Snapshot = <Read extends Loader.AnyDefinition, const Label extends string>(
  read: Read,
  label: Label
): Schema.Codec<Snapshot<Read, Label>, unknown> => {
  const def = read[Loader.TypeId]
  const is = (u: unknown): u is Snapshot<Read, Label> =>
    u instanceof SnapshotImpl && u[SnapshotTypeId].read === def.key && u[SnapshotTypeId].label === label
  return Schema.declare(is, {
    expected: `Loaded.Snapshot(${def.key}, "${label}")`,
    [annotationKey]: { read: def.key, label } satisfies Field,
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
  } as any) as any
}

// -- binding ------------------------------------------------------------------

/**
 * What a watch's Subscription carries for the runtime. Not public.
 *
 * @internal
 */
export interface Marker {
  readonly read: Loader.AnyDefinition
  readonly label: string
  /** `undefined`: the read is disabled, and the marker is inert. */
  readonly args: unknown
  readonly argsKey: string | undefined
  readonly toMsg: (snapshot: Snapshot<any, any>) => unknown
}

/** @internal */
export const markerOf = (subscription: object): Marker | undefined => (subscription as any)[services.loadedMarker]

/**
 * The service a read's watch adds to a component's requirements: the read
 * itself, never its fetcher's services.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.3
 */
export type ServiceOf<Read> = Read extends { readonly Identifier: infer Self } ? Self
  : Read extends Loader.Service<infer Self, any, any, any, any, any, any> ? Self
  : never

/**
 * One read with one set of args, declared once and used for `empty`, `watch`
 * and `open`, so the watch and the view can't use different args.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Binding<Read extends Loader.AnyDefinition, Label extends string, Model, Props> {
  readonly read: Read
  readonly label: Label
  /** The snapshot `init` stores. Opens as Initial. */
  readonly empty: Snapshot<Read, Label>
  /** For `subscriptions`: ensure loaded, then send each change as a message. */
  readonly watch: <Msg>(
    model: Model,
    props: Props,
    toMsg: (snapshot: Snapshot<Read, Label>) => Msg
  ) => Subscription.Subscription<Msg, ServiceOf<Read>>
  /**
   * For the view: the stored result when the binding's current args match the
   * snapshot's key, otherwise Initial (waiting when the read is enabled).
   */
  readonly open: (
    snapshot: Snapshot<Read, Label>,
    model: Model,
    props: Props
  ) => AsyncResult.AsyncResult<Loader.SuccessOf<Read>, Loader.ErrorOf<Read>>
}

/**
 * Binds `read` under `label`. `args` returning `undefined` disables the read.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.3
 */
export const at = <Read extends Loader.AnyDefinition, const Label extends string, Model, Props>(
  read: Read,
  label: Label,
  args: (model: Model, props: Props) => Loader.ArgsOf<Read> | undefined
): Binding<Read, Label, Model, Props> => {
  const def = read[Loader.TypeId]
  const disabledKey = Subscription.keyOf(`~loaded/${label}`)
  return {
    read,
    label,
    empty: makeSnapshot(read, label, undefined, undefined),
    watch: (model, props, toMsg) => {
      const current = args(model, props)
      const argsKey = current === undefined ? undefined : def.argsKey(current)
      const marker: Marker = { read, label, args: current, argsKey, toMsg: toMsg as any }
      return {
        [Subscription.TypeId]: Subscription.TypeId,
        // The label and the args key are the Subscription key, so a re-key closes the old watcher first.
        key: argsKey === undefined ? disabledKey : Subscription.keyOf(`~loaded/${label}`, argsKey),
        stream: Stream.never,
        [services.loadedMarker]: marker
      } as any
    },
    open: (snapshot, model, props) => {
      const current = args(model, props)
      if (current === undefined) return AsyncResult.initial(false)
      const data = dataOf(snapshot)
      if (data.result === undefined || data.argsKey !== def.argsKey(current)) return AsyncResult.initial(true)
      return data.result
    }
  }
}
