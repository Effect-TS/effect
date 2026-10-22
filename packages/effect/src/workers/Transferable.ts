/**
 * Marks encoded worker message fields that should move through `postMessage` as
 * transfer-list entries.
 *
 * Worker messages still pass through schema encoding and structured clone, but
 * schemas wrapped with `schema` can also report backing resources such as
 * `ArrayBuffer`, `ImageData.data.buffer`, or `MessagePort` to a `Collector`.
 * Worker platforms then pass the collected values as the transfer list for the
 * same `postMessage` call, avoiding copies for large payloads and ports.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import { dual } from "../Function.ts"
import * as Schema from "../Schema.ts"
import * as SchemaGetter from "../SchemaGetter.ts"

/**
 * A value that can be listed in a `postMessage` transfer list.
 *
 * **Details**
 *
 * Resolved from the globals of the consuming project, so neither the DOM nor
 * the Node.js type declarations are required. Browser-like environments with a
 * `Worker` global (DOM, WebWorker, Deno, Bun) contribute their `Transferable`
 * type through `Worker.prototype.postMessage`. Node.js contributes the
 * `worker_threads` `Transferable` type through `structuredClone`. Environments
 * with neither fall back to `unknown`. The `& {}` keeps this name in emitted
 * declarations instead of the type it resolves to while building.
 *
 * @stability unstable
 * @category models
 * @since 4.0.7
 */
export type TransferableObject =
  & (typeof globalThis extends {
    readonly Worker: { readonly prototype: { readonly postMessage: (message: any, options?: infer Options) => void } }
  } ? TransferListElement<Options>
    : typeof globalThis extends { readonly structuredClone: (value: any, options?: infer Options) => any }
      ? TransferListElement<Options>
    : unknown)
  & {}

type TransferListElement<Options> = NonNullable<Options> extends { readonly transfer?: ReadonlyArray<infer A> } ? A
  : unknown

/**
 * Service for collecting `Transferable` objects while encoding worker messages
 * so they can be passed to `postMessage` transfer lists.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class Collector extends Context.Service<Collector, {
  readonly addAll: (
    _: Iterable<TransferableObject>
  ) => Effect.Effect<void>
  readonly addAllUnsafe: (_: Iterable<TransferableObject>) => void
  readonly read: Effect.Effect<Array<TransferableObject>>
  readonly readUnsafe: () => Array<TransferableObject>
  readonly clearUnsafe: () => Array<TransferableObject>
  readonly clear: Effect.Effect<Array<TransferableObject>>
}>()("effect/workers/Transferable/Collector") {}

/**
 * Creates a mutable `Collector` service directly, exposing unsafe synchronous
 * methods for reading, adding, and clearing collected transferables.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const makeCollectorUnsafe = (): Collector["Service"] => {
  let tranferables: Array<TransferableObject> = []
  const unsafeAddAll = (transfers: Iterable<TransferableObject>): void => {
    tranferables.push(...transfers)
  }
  const unsafeRead = (): Array<TransferableObject> => tranferables
  const unsafeClear = (): Array<TransferableObject> => {
    const prev = tranferables
    tranferables = []
    return prev
  }
  return Collector.of({
    addAllUnsafe: unsafeAddAll,
    addAll: (transferables) => Effect.sync(() => unsafeAddAll(transferables)),
    readUnsafe: unsafeRead,
    read: Effect.sync(unsafeRead),
    clearUnsafe: unsafeClear,
    clear: Effect.sync(unsafeClear)
  })
}

/**
 * Effect that creates a fresh `Collector` service for accumulating
 * transferables.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const makeCollector: Effect.Effect<Collector["Service"]> = Effect.sync(makeCollectorUnsafe)

/**
 * Adds transferables to the current `Collector` when one is present in the
 * context, and does nothing otherwise.
 *
 * @stability unstable
 * @category accessors
 * @since 4.0.0
 */
export const addAll = (
  tranferables: Iterable<TransferableObject>
): Effect.Effect<void> =>
  Effect.contextWith((services) => {
    const collector = Context.getOrUndefined(services, Collector)
    if (!collector) return Effect.void
    collector.addAllUnsafe(tranferables)
    return Effect.void
  })

/**
 * Creates a schema getter that records transferables derived from a value in
 * the current `Collector` while passing the value through unchanged.
 *
 * @stability unstable
 * @category getters
 * @since 4.0.0
 */
export const getterAddAll = <A>(
  f: (_: A) => Iterable<TransferableObject>
): SchemaGetter.Getter<A, A> =>
  SchemaGetter.transformEffect((e: A) =>
    Effect.contextWith((services) => {
      const collector = Context.getOrUndefined(services, Collector)
      if (!collector) return Effect.succeed(e)
      collector.addAllUnsafe(f(e))
      return Effect.succeed(e)
    })
  )

/**
 * Schema wrapper whose encode path can record transferables with a `Collector`
 * while preserving the wrapped schema's decoded type.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.0
 */
export interface Transferable<S extends Schema.Top> extends
  Schema.decodeTo<
    Schema.toType<S["Rebuild"]>,
    S["Rebuild"]
  >
{}

/**
 * Wraps a schema so encoding records transferables selected from the encoded
 * value, enabling worker messages to populate a `postMessage` transfer list.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.0
 */
export const schema: {
  <S extends Schema.Top>(
    f: (_: S["Encoded"]) => Iterable<TransferableObject>
  ): (self: S) => Transferable<S>
  <S extends Schema.Top>(
    self: S,
    f: (_: S["Encoded"]) => Iterable<TransferableObject>
  ): Transferable<S>
} = dual(
  2,
  <S extends Schema.Top>(
    self: S,
    f: (_: S["Encoded"]) => Iterable<TransferableObject>
  ): Transferable<S> =>
    self.annotate({
      toCodecJson: () => passthroughLink
    }).pipe(
      Schema.decode({
        decode: SchemaGetter.passthrough(),
        encode: getterAddAll(f)
      })
    )
)

const passthroughLink = Schema.link()(Schema.Any, {
  decode: SchemaGetter.passthrough(),
  encode: SchemaGetter.passthrough()
})

// `ImageData` is only declared by the DOM libraries, so resolve it from the
// consumer's globals instead of requiring DOM in Node-only projects.
type ImageDataInstance = typeof globalThis extends { readonly ImageData: { readonly prototype: infer A } } ? A : never

/**
 * Schema for transferring `ImageData` values with their pixel data buffer.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.0
 */
export const ImageData: Transferable<Schema.declare<ImageDataInstance>> = schema(
  Schema.Any as any as Schema.declare<ImageDataInstance>,
  (_) => [_.data.buffer]
)

/**
 * Schema for transferring `MessagePort` values as transferable objects.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.0
 */
export const MessagePort: Transferable<Schema.declare<MessagePort>> = schema(
  Schema.Any as any as Schema.declare<MessagePort>,
  (_) => [_]
)

/**
 * Schema for transferring `Uint8Array` values with their backing buffer.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.0
 */
export const Uint8Array: Transferable<Schema.instanceOf<globalThis.Uint8Array<ArrayBuffer>>> = schema(
  Schema.Uint8Array as any,
  (_) => [_.buffer]
)
