/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Iterable from "effect/Iterable"
import * as Layer from "effect/Layer"
import type * as ParseResult from "effect/ParseResult"
import * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"

/**
 * @since 1.0.0
 * @category Type IDs
 */
export const TypeId: TypeId = "~@effect/experimental/PersistedQueue"

/**
 * @since 1.0.0
 * @category Type IDs
 */
export type TypeId = "~@effect/experimental/PersistedQueue"

/**
 * @since 1.0.0
 * @category Models
 */
export interface PersistedQueue<in out A, out R = never> {
  readonly [TypeId]: TypeId

  /**
   * Adds an element to the queue. Returns the id of the enqueued element.
   *
   * If an element with the same id already exists in the queue, it will not be
   * added again.
   */
  readonly offer: (value: A, options?: {
    readonly id: string | undefined
  }) => Effect.Effect<string, PersistedQueueError | ParseResult.ParseError, R>

  /**
   * Takes an element from the queue.
   * If the queue is empty, it will wait until an element is available.
   *
   * If the returned effect succeeds, the element is marked as processed,
   * otherwise it will be retried according to the provided options.
   *
   * By default, max attempts is set to 10.
   */
  readonly take: <XA, XE, XR>(
    f: (value: A, metadata: {
      readonly id: string
      readonly attempts: number
    }) => Effect.Effect<XA, XE, XR>,
    options?: {
      readonly maxAttempts?: number | undefined
    }
  ) => Effect.Effect<XA, XE | PersistedQueueError | ParseResult.ParseError, R | XR>
}

/**
 * @since 1.0.0
 * @category Factory
 */
export class PersistedQueueFactory extends Context.Tag("@effect/experimental/PersistedQueue/PersistedQueueFactory")<
  PersistedQueueFactory,
  {
    readonly make: <A, I, R>(options: {
      readonly name: string
      readonly schema: Schema.Schema<A, I, R>
    }) => Effect.Effect<PersistedQueue<A, R>>
  }
>() {}

/**
 * @since 1.0.0
 * @category Accessors
 */
export const make = <A, I, R>(options: {
  readonly name: string
  readonly schema: Schema.Schema<A, I, R>
}): Effect.Effect<PersistedQueue<A, R>, never, PersistedQueueFactory> =>
  Effect.flatMap(
    PersistedQueueFactory,
    (factory) => factory.make(options)
  )

/**
 * @since 1.0.0
 * @category Factory
 */
export const makeFactory = Effect.gen(function*() {
  const store = yield* PersistedQueueStore

  return PersistedQueueFactory.of({
    make<A, I, R>(options: {
      readonly name: string
      readonly schema: Schema.Schema<A, I, R>
    }) {
      const encodeUnknown = Schema.encodeUnknown(options.schema)
      const decodeUnknown = Schema.decodeUnknown(options.schema)

      return Effect.succeed<PersistedQueue<A, R>>({
        [TypeId]: TypeId,
        offer: (value, opts) =>
          Effect.flatMap(
            encodeUnknown(value),
            (element) => {
              const id = opts?.id ?? crypto.randomUUID()
              return Effect.as(
                store.offer({
                  name: options.name,
                  id,
                  element,
                  isCustomId: opts?.id !== undefined
                }),
                id
              )
            }
          ),
        take: (f, opts) =>
          Effect.uninterruptibleMask(Effect.fnUntraced(function*(restore) {
            const scope = yield* Scope.make()
            const item = yield* store.take({
              name: options.name,
              maxAttempts: opts?.maxAttempts ?? 10
            }).pipe(
              Scope.extend(scope),
              restore
            )
            const exit = yield* decodeUnknown(item.element).pipe(
              Effect.flatMap((value) => f(value, { id: item.id, attempts: item.attempts })),
              restore,
              Effect.exit
            )
            yield* Scope.close(scope, exit)
            return yield* exit
          }))
      })
    }
  })
})

/**
 * @since 1.0.0
 * @category Factory
 */
export const layer: Layer.Layer<
  PersistedQueueFactory,
  never,
  PersistedQueueStore
> = Layer.effect(PersistedQueueFactory, makeFactory)

/**
 * @since 1.0.0
 * @category Errors
 */
export const ErrorTypeId: ErrorTypeId = "~@effect/experimental/PersistedQueue/PersistedQueueError"

/**
 * @since 1.0.0
 * @category Errors
 */
export type ErrorTypeId = "~@effect/experimental/PersistedQueue/PersistedQueueError"

/**
 * @since 1.0.0
 * @category Errors
 */
export class PersistedQueueError extends Schema.TaggedError<PersistedQueueError>(
  "@effect/experimental/PersistedQueue/PersistedQueueError"
)("PersistedQueueError", {
  message: Schema.String,
  cause: Schema.optional(Schema.Defect)
}) {
  /**
   * @since 1.0.0
   */
  readonly [ErrorTypeId]: ErrorTypeId = ErrorTypeId
}

/**
 * @since 1.0.0
 * @category Store
 */
export class PersistedQueueStore extends Context.Tag("@effect/experimental/PersistedQueue/PersistedQueueStore")<
  PersistedQueueStore,
  {
    readonly offer: (
      options: {
        readonly name: string
        readonly id: string
        readonly element: unknown
        readonly isCustomId: boolean
      }
    ) => Effect.Effect<void, PersistedQueueError>

    readonly take: (options: {
      readonly name: string
      readonly maxAttempts: number
    }) => Effect.Effect<
      {
        readonly id: string
        readonly attempts: number
        readonly element: unknown
      },
      PersistedQueueError,
      Scope.Scope
    >
  }
>() {}

/**
 * @since 1.0.0
 * @category Store
 */
export const layerStoreMemory: Layer.Layer<
  PersistedQueueStore
> = Layer.sync(PersistedQueueStore, () => {
  type Entry = {
    readonly id: string
    attempts: number
    readonly element: unknown
  }
  const ids = new Set<string>()
  const queues = new Map<string, {
    latch: Effect.Latch
    items: Set<Entry>
  }>()
  const getOrCreateQueue = (name: string) => {
    let queue = queues.get(name)
    if (!queue) {
      queue = {
        latch: Effect.unsafeMakeLatch(false),
        items: new Set()
      }
      queues.set(name, queue)
    }
    return queue
  }

  return PersistedQueueStore.of({
    offer: (options) =>
      Effect.sync(() => {
        if (ids.has(options.id)) return
        ids.add(options.id)
        const queue = getOrCreateQueue(options.name)
        queue.items.add({ id: options.id, attempts: 0, element: options.element })
        queue.latch.unsafeOpen()
      }),
    take: Effect.fnUntraced(function*(options) {
      const queue = getOrCreateQueue(options.name)
      while (true) {
        yield* queue.latch.await
        const item = Iterable.unsafeHead(queue.items)
        queue.items.delete(item)
        if (queue.items.size === 0) {
          queue.latch.unsafeClose()
        }
        yield* Effect.addFinalizer((exit) => {
          if (exit._tag === "Success") {
            return Effect.void
          } else if (!Exit.isInterrupted(exit)) {
            item.attempts += 1
          }
          if (item.attempts >= options.maxAttempts) {
            return Effect.void
          }
          queue.items.add(item)
          queue.latch.unsafeOpen()
          return Effect.void
        })
        return item
      }
    })
  })
})
