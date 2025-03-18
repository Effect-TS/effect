/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import * as Option from "effect/Option"
import * as ParseResult from "effect/ParseResult"
import * as Schema from "effect/Schema"

/**
 * @since 1.0.0
 * @category models
 */
export interface CollectorService {
  readonly addAll: (_: Iterable<globalThis.Transferable>) => Effect.Effect<void>
  readonly unsafeAddAll: (_: Iterable<globalThis.Transferable>) => void
  readonly read: Effect.Effect<Array<globalThis.Transferable>>
  readonly unsafeRead: () => Array<globalThis.Transferable>
  readonly unsafeClear: () => Array<globalThis.Transferable>
  readonly clear: Effect.Effect<Array<globalThis.Transferable>>
}

/**
 * @since 1.0.0
 * @category tags
 */
export class Collector extends Context.Tag("@effect/platform/Transferable/Collector")<
  Collector,
  CollectorService
>() {}

/**
 * @since 1.0.0
 * @category constructors
 */
export const unsafeMakeCollector = (): CollectorService => {
  let tranferables: Array<globalThis.Transferable> = []
  const unsafeAddAll = (transfers: Iterable<globalThis.Transferable>): void => {
    // eslint-disable-next-line no-restricted-syntax
    tranferables.push(...transfers)
  }
  const unsafeRead = (): Array<globalThis.Transferable> => tranferables
  const unsafeClear = (): Array<globalThis.Transferable> => {
    const prev = tranferables
    tranferables = []
    return prev
  }
  return Collector.of({
    unsafeAddAll,
    addAll: (transferables) => Effect.sync(() => unsafeAddAll(transferables)),
    unsafeRead,
    read: Effect.sync(unsafeRead),
    unsafeClear,
    clear: Effect.sync(unsafeClear)
  })
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeCollector: Effect.Effect<CollectorService> = Effect.sync(unsafeMakeCollector)

/**
 * @since 1.0.0
 * @category accessors
 */
export const addAll = (tranferables: Iterable<globalThis.Transferable>): Effect.Effect<void> =>
  Effect.flatMap(
    Effect.serviceOption(Collector),
    Option.match({
      onNone: () => Effect.void,
      onSome: (_) => _.addAll(tranferables)
    })
  )

/**
 * @since 1.0.0
 * @category schema
 */
export const schema: {
  <I>(
    f: (_: I) => Iterable<globalThis.Transferable>
  ): <A, R>(self: Schema.Schema<A, I, R>) => Schema.Schema<A, I, R>
  <A, I, R>(
    self: Schema.Schema<A, I, R>,
    f: (_: I) => Iterable<globalThis.Transferable>
  ): Schema.Schema<A, I, R>
} = dual(2, <A, I, R>(
  self: Schema.Schema<A, I, R>,
  f: (_: I) => Iterable<globalThis.Transferable>
) =>
  Schema.transformOrFail(
    Schema.encodedSchema(self),
    self,
    { strict: true, decode: ParseResult.succeed, encode: (i) => Effect.as(addAll(f(i)), i) }
  ))

/**
 * @since 1.0.0
 * @category schema
 */
export const ImageData: Schema.Schema<ImageData> = schema(
  Schema.Any,
  (_) => [(_ as ImageData).data.buffer]
)

/**
 * @since 1.0.0
 * @category schema
 */
export const MessagePort: Schema.Schema<MessagePort> = schema(
  Schema.Any,
  (_) => [_ as MessagePort]
)

/**
 * @since 1.0.0
 * @category schema
 */
export const Uint8Array: Schema.Schema<Uint8Array> = schema(
  Schema.Uint8ArrayFromSelf,
  (_) => [_.buffer]
)
