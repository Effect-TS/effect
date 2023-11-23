import * as Cause from "../Cause.js"
import type * as Channel from "../Channel.js"
import * as Chunk from "../Chunk.js"
import * as Deferred from "../Deferred.js"
import * as Effect from "../Effect.js"
import * as Exit from "../Exit.js"
import { dual, pipe } from "../Function.js"
import type * as GroupBy from "../GroupBy.js"
import * as Option from "../Option.js"
import { pipeArguments } from "../Pipeable.js"
import { hasProperty, type Predicate } from "../Predicate.js"
import * as Queue from "../Queue.js"
import * as Ref from "../Ref.js"
import type * as Stream from "../Stream.js"
import type * as Take from "../Take.js"
import * as channel from "./channel.js"
import * as channelExecutor from "./channel/channelExecutor.js"
import * as core from "./core-stream.js"
import * as stream from "./stream.js"
import * as take from "./take.js"

/** @internal */
const GroupBySymbolKey = "effect/GroupBy"

/** @internal */
export const GroupByTypeId: GroupBy.GroupByTypeId = Symbol.for(
  GroupBySymbolKey
) as GroupBy.GroupByTypeId

const groupByVariance = {
  /* c8 ignore next */
  _R: (_: never) => _,
  /* c8 ignore next */
  _E: (_: never) => _,
  /* c8 ignore next */
  _K: (_: never) => _,
  /* c8 ignore next */
  _V: (_: never) => _
}

/** @internal */
export const isGroupBy = (u: unknown): u is GroupBy.GroupBy<unknown, unknown, unknown, unknown> =>
  hasProperty(u, GroupByTypeId)

/** @internal */
export const evaluate = dual<
  <K, E, V, R2, E2, A>(
    f: (key: K, stream: Stream.Stream<never, E, V>) => Stream.Stream<R2, E2, A>,
    options?: {
      readonly bufferSize?: number | undefined
    }
  ) => <R>(self: GroupBy.GroupBy<R, E, K, V>) => Stream.Stream<R2 | R, E | E2, A>,
  <R, K, E, V, R2, E2, A>(
    self: GroupBy.GroupBy<R, E, K, V>,
    f: (key: K, stream: Stream.Stream<never, E, V>) => Stream.Stream<R2, E2, A>,
    options?: {
      readonly bufferSize?: number | undefined
    }
  ) => Stream.Stream<R2 | R, E | E2, A>
>(
  (args) => isGroupBy(args[0]),
  <R, K, E, V, R2, E2, A>(
    self: GroupBy.GroupBy<R, E, K, V>,
    f: (key: K, stream: Stream.Stream<never, E, V>) => Stream.Stream<R2, E2, A>,
    options?: {
      readonly bufferSize?: number | undefined
    }
  ): Stream.Stream<R | R2, E | E2, A> =>
    stream.flatMap(
      self.grouped,
      ([key, queue]) => f(key, stream.flattenTake(stream.fromQueue(queue, { shutdown: true }))),
      { concurrency: "unbounded", bufferSize: options?.bufferSize ?? 16 }
    )
)

/** @internal */
export const filter = dual<
  <K>(predicate: Predicate<K>) => <R, E, V>(self: GroupBy.GroupBy<R, E, K, V>) => GroupBy.GroupBy<R, E, K, V>,
  <R, E, V, K>(self: GroupBy.GroupBy<R, E, K, V>, predicate: Predicate<K>) => GroupBy.GroupBy<R, E, K, V>
>(2, <R, E, V, K>(self: GroupBy.GroupBy<R, E, K, V>, predicate: Predicate<K>): GroupBy.GroupBy<R, E, K, V> =>
  make(
    pipe(
      self.grouped,
      stream.filterEffect((tuple) => {
        if (predicate(tuple[0])) {
          return pipe(Effect.succeed(tuple), Effect.as(true))
        }
        return pipe(Queue.shutdown(tuple[1]), Effect.as(false))
      })
    )
  ))

/** @internal */
export const first = dual<
  (n: number) => <R, E, K, V>(self: GroupBy.GroupBy<R, E, K, V>) => GroupBy.GroupBy<R, E, K, V>,
  <R, E, K, V>(self: GroupBy.GroupBy<R, E, K, V>, n: number) => GroupBy.GroupBy<R, E, K, V>
>(2, <R, E, K, V>(self: GroupBy.GroupBy<R, E, K, V>, n: number): GroupBy.GroupBy<R, E, K, V> =>
  make(
    pipe(
      stream.zipWithIndex(self.grouped),
      stream.filterEffect((tuple) => {
        const index = tuple[1]
        const queue = tuple[0][1]
        if (index < n) {
          return pipe(Effect.succeed(tuple), Effect.as(true))
        }
        return pipe(Queue.shutdown(queue), Effect.as(false))
      }),
      stream.map((tuple) => tuple[0])
    )
  ))

/** @internal */
export const make = <R, E, K, V>(
  grouped: Stream.Stream<R, E, readonly [K, Queue.Dequeue<Take.Take<E, V>>]>
): GroupBy.GroupBy<R, E, K, V> => ({
  [GroupByTypeId]: groupByVariance,
  pipe() {
    return pipeArguments(this, arguments)
  },
  grouped
})

// Circular with Stream

/** @internal */
export const groupBy = dual<
  <A, R2, E2, K, V>(
    f: (a: A) => Effect.Effect<R2, E2, readonly [K, V]>,
    options?: {
      readonly bufferSize?: number | undefined
    }
  ) => <R, E>(self: Stream.Stream<R, E, A>) => GroupBy.GroupBy<R2 | R, E2 | E, K, V>,
  <R, E, A, R2, E2, K, V>(
    self: Stream.Stream<R, E, A>,
    f: (a: A) => Effect.Effect<R2, E2, readonly [K, V]>,
    options?: {
      readonly bufferSize?: number | undefined
    }
  ) => GroupBy.GroupBy<R2 | R, E2 | E, K, V>
>(
  (args) => stream.isStream(args[0]),
  <R, E, A, R2, E2, K, V>(
    self: Stream.Stream<R, E, A>,
    f: (a: A) => Effect.Effect<R2, E2, readonly [K, V]>,
    options?: {
      readonly bufferSize?: number | undefined
    }
  ): GroupBy.GroupBy<R | R2, E | E2, K, V> =>
    make(
      stream.unwrapScoped(
        Effect.gen(function*($) {
          const decider = yield* $(
            Deferred.make<
              never,
              (key: K, value: V) => Effect.Effect<never, never, Predicate<number>>
            >()
          )
          const output = yield* $(Effect.acquireRelease(
            Queue.bounded<Exit.Exit<Option.Option<E | E2>, readonly [K, Queue.Dequeue<Take.Take<E | E2, V>>]>>(
              options?.bufferSize ?? 16
            ),
            (queue) => Queue.shutdown(queue)
          ))
          const ref = yield* $(Ref.make<Map<K, number>>(new Map()))
          const add = yield* $(
            stream.mapEffectSequential(self, f),
            stream.distributedWithDynamicCallback(
              options?.bufferSize ?? 16,
              ([key, value]) => Effect.flatMap(Deferred.await(decider), (f) => f(key, value)),
              (exit) => Queue.offer(output, exit)
            )
          )
          yield* $(
            Deferred.succeed(decider, (key, _) =>
              pipe(
                Ref.get(ref),
                Effect.map((map) => Option.fromNullable(map.get(key))),
                Effect.flatMap(Option.match({
                  onNone: () =>
                    Effect.flatMap(add, ([index, queue]) =>
                      Effect.zipRight(
                        Ref.update(ref, (map) => map.set(key, index)),
                        pipe(
                          Queue.offer(
                            output,
                            Exit.succeed(
                              [
                                key,
                                mapDequeue(queue, (exit) =>
                                  new take.TakeImpl(pipe(
                                    exit,
                                    Exit.map((tuple) => Chunk.of(tuple[1]))
                                  )))
                              ] as const
                            )
                          ),
                          Effect.as<Predicate<number>>((n: number) => n === index)
                        )
                      )),
                  onSome: (index) => Effect.succeed<Predicate<number>>((n: number) => n === index)
                }))
              ))
          )
          return stream.flattenExitOption(stream.fromQueue(output, { shutdown: true }))
        })
      )
    )
)

/** @internal */
export const mapEffectOptions = dual<
  {
    <A, R2, E2, A2>(
      f: (a: A) => Effect.Effect<R2, E2, A2>,
      options?: {
        readonly concurrency?: number | "unbounded" | undefined
        readonly unordered?: boolean | undefined
      }
    ): <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A2>
    <A, R2, E2, A2, K>(
      f: (a: A) => Effect.Effect<R2, E2, A2>,
      options: {
        readonly key: (a: A) => K
        readonly bufferSize?: number | undefined
      }
    ): <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A2>
  },
  {
    <R, E, A, R2, E2, A2>(
      self: Stream.Stream<R, E, A>,
      f: (a: A) => Effect.Effect<R2, E2, A2>,
      options?: {
        readonly concurrency?: number | "unbounded" | undefined
        readonly unordered?: boolean | undefined
      }
    ): Stream.Stream<R2 | R, E2 | E, A2>
    <R, E, A, R2, E2, A2, K>(
      self: Stream.Stream<R, E, A>,
      f: (a: A) => Effect.Effect<R2, E2, A2>,
      options: {
        readonly key: (a: A) => K
        readonly bufferSize?: number | undefined
      }
    ): Stream.Stream<R2 | R, E2 | E, A2>
  }
>(
  (args) => typeof args[0] !== "function",
  (<R, E, A, R2, E2, A2, K>(
    self: Stream.Stream<R, E, A>,
    f: (a: A) => Effect.Effect<R2, E2, A2>,
    options?: {
      readonly key?: ((a: A) => K) | undefined
      readonly concurrency?: number | "unbounded" | undefined
      readonly unordered?: boolean | undefined
      readonly bufferSize?: number | undefined
    }
  ): Stream.Stream<R | R2, E | E2, A2> => {
    if (options?.key) {
      return evaluate(
        groupByKey(self, options.key, { bufferSize: options.bufferSize }),
        (_, s) => stream.mapEffectSequential(s, f)
      )
    }

    return stream.matchConcurrency(
      options?.concurrency,
      () => stream.mapEffectSequential(self, f),
      (n) =>
        options?.unordered ?
          stream.flatMap(self, (a) => stream.fromEffect(f(a)), { concurrency: n }) :
          stream.mapEffectPar(self, n, f)
    )
  }) as any
)

/** @internal */
export const bindEffect = dual<
  <N extends string, K, R2, E2, A>(
    tag: Exclude<N, keyof K>,
    f: (_: K) => Effect.Effect<R2, E2, A>,
    options?: {
      readonly concurrency?: number | "unbounded" | undefined
      readonly bufferSize?: number | undefined
    }
  ) => <R, E>(self: Stream.Stream<R, E, K>) => Stream.Stream<
    R | R2,
    E | E2,
    Effect.MergeRecord<K, { [k in N]: A }>
  >,
  <R, E, N extends string, K, R2, E2, A>(
    self: Stream.Stream<R, E, K>,
    tag: Exclude<N, keyof K>,
    f: (_: K) => Effect.Effect<R2, E2, A>,
    options?: {
      readonly concurrency?: number | "unbounded" | undefined
      readonly unordered?: boolean | undefined
    }
  ) => Stream.Stream<
    R | R2,
    E | E2,
    Effect.MergeRecord<K, { [k in N]: A }>
  >
>((args) => typeof args[0] !== "string", <R, E, N extends string, K, R2, E2, A>(
  self: Stream.Stream<R, E, K>,
  tag: Exclude<N, keyof K>,
  f: (_: K) => Effect.Effect<R2, E2, A>,
  options?: {
    readonly concurrency?: number | "unbounded" | undefined
    readonly unordered?: boolean | undefined
  }
) =>
  mapEffectOptions(self, (k) =>
    Effect.map(
      f(k),
      (a): Effect.MergeRecord<K, { [k in N]: A }> => ({ ...k, [tag]: a } as any)
    ), options))

const mapDequeue = <A, B>(dequeue: Queue.Dequeue<A>, f: (a: A) => B): Queue.Dequeue<B> => new MapDequeue(dequeue, f)

class MapDequeue<in out A, out B> implements Queue.Dequeue<B> {
  readonly [Queue.DequeueTypeId] = {
    _Out: (_: never) => _
  }

  constructor(
    readonly dequeue: Queue.Dequeue<A>,
    readonly f: (a: A) => B
  ) {
  }

  capacity(): number {
    return Queue.capacity(this.dequeue)
  }

  get size(): Effect.Effect<never, never, number> {
    return Queue.size(this.dequeue)
  }

  unsafeSize(): Option.Option<number> {
    return this.dequeue.unsafeSize()
  }

  get awaitShutdown(): Effect.Effect<never, never, void> {
    return Queue.awaitShutdown(this.dequeue)
  }

  isActive(): boolean {
    return this.dequeue.isActive()
  }

  get isShutdown(): Effect.Effect<never, never, boolean> {
    return Queue.isShutdown(this.dequeue)
  }

  get shutdown(): Effect.Effect<never, never, void> {
    return Queue.shutdown(this.dequeue)
  }

  get isFull(): Effect.Effect<never, never, boolean> {
    return Queue.isFull(this.dequeue)
  }

  get isEmpty(): Effect.Effect<never, never, boolean> {
    return Queue.isEmpty(this.dequeue)
  }

  get take(): Effect.Effect<never, never, B> {
    return pipe(Queue.take(this.dequeue), Effect.map((a) => this.f(a)))
  }

  get takeAll(): Effect.Effect<never, never, Chunk.Chunk<B>> {
    return pipe(Queue.takeAll(this.dequeue), Effect.map(Chunk.map((a) => this.f(a))))
  }

  takeUpTo(max: number): Effect.Effect<never, never, Chunk.Chunk<B>> {
    return pipe(Queue.takeUpTo(this.dequeue, max), Effect.map(Chunk.map((a) => this.f(a))))
  }

  takeBetween(min: number, max: number): Effect.Effect<never, never, Chunk.Chunk<B>> {
    return pipe(Queue.takeBetween(this.dequeue, min, max), Effect.map(Chunk.map((a) => this.f(a))))
  }

  takeN(n: number): Effect.Effect<never, never, Chunk.Chunk<B>> {
    return pipe(Queue.takeN(this.dequeue, n), Effect.map(Chunk.map((a) => this.f(a))))
  }

  poll(): Effect.Effect<never, never, Option.Option<B>> {
    return pipe(Queue.poll(this.dequeue), Effect.map(Option.map((a) => this.f(a))))
  }

  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export const groupByKey = dual<
  <A, K>(
    f: (a: A) => K,
    options?: {
      readonly bufferSize?: number | undefined
    }
  ) => <R, E>(self: Stream.Stream<R, E, A>) => GroupBy.GroupBy<R, E, K, A>,
  <R, E, A, K>(
    self: Stream.Stream<R, E, A>,
    f: (a: A) => K,
    options?: {
      readonly bufferSize?: number | undefined
    }
  ) => GroupBy.GroupBy<R, E, K, A>
>(
  (args) => typeof args[0] !== "function",
  <R, E, A, K>(
    self: Stream.Stream<R, E, A>,
    f: (a: A) => K,
    options?: {
      readonly bufferSize?: number | undefined
    }
  ): GroupBy.GroupBy<R, E, K, A> => {
    const loop = (
      map: Map<K, Queue.Queue<Take.Take<E, A>>>,
      outerQueue: Queue.Queue<Take.Take<E, readonly [K, Queue.Queue<Take.Take<E, A>>]>>
    ): Channel.Channel<R, E, Chunk.Chunk<A>, unknown, E, never, unknown> =>
      core.readWithCause({
        onInput: (input: Chunk.Chunk<A>) =>
          core.flatMap(
            core.fromEffect(
              Effect.forEach(groupByIterable(input, f), ([key, values]) => {
                const innerQueue = map.get(key)
                if (innerQueue === undefined) {
                  return pipe(
                    Queue.bounded<Take.Take<E, A>>(options?.bufferSize ?? 16),
                    Effect.flatMap((innerQueue) =>
                      pipe(
                        Effect.sync(() => {
                          map.set(key, innerQueue)
                        }),
                        Effect.zipRight(
                          Queue.offer(outerQueue, take.of([key, innerQueue] as const))
                        ),
                        Effect.zipRight(
                          pipe(
                            Queue.offer(innerQueue, take.chunk(values)),
                            Effect.catchSomeCause((cause) =>
                              Cause.isInterruptedOnly(cause) ?
                                Option.some(Effect.unit) :
                                Option.none()
                            )
                          )
                        )
                      )
                    )
                  )
                }
                return Effect.catchSomeCause(
                  Queue.offer(innerQueue, take.chunk(values)),
                  (cause) =>
                    Cause.isInterruptedOnly(cause) ?
                      Option.some(Effect.unit) :
                      Option.none()
                )
              }, { discard: true })
            ),
            () => loop(map, outerQueue)
          ),
        onFailure: (cause) => core.fromEffect(Queue.offer(outerQueue, take.failCause(cause))),
        onDone: () =>
          pipe(
            core.fromEffect(
              pipe(
                Effect.forEach(map.entries(), ([_, innerQueue]) =>
                  pipe(
                    Queue.offer(innerQueue, take.end),
                    Effect.catchSomeCause((cause) =>
                      Cause.isInterruptedOnly(cause) ?
                        Option.some(Effect.unit) :
                        Option.none()
                    )
                  ), { discard: true }),
                Effect.zipRight(Queue.offer(outerQueue, take.end))
              )
            )
          )
      })
    return make(stream.unwrapScoped(
      pipe(
        Effect.sync(() => new Map<K, Queue.Queue<Take.Take<E, A>>>()),
        Effect.flatMap((map) =>
          pipe(
            Effect.acquireRelease(
              Queue.unbounded<Take.Take<E, readonly [K, Queue.Queue<Take.Take<E, A>>]>>(),
              (queue) => Queue.shutdown(queue)
            ),
            Effect.flatMap((queue) =>
              pipe(
                self,
                stream.toChannel,
                core.pipeTo(loop(map, queue)),
                channel.drain,
                channelExecutor.runScoped,
                Effect.forkScoped,
                Effect.as(stream.flattenTake(stream.fromQueue(queue, { shutdown: true })))
              )
            )
          )
        )
      )
    ))
  }
)

/**
 * A variant of `groupBy` that retains the insertion order of keys.
 *
 * @internal
 */
const groupByIterable = dual<
  <V, K>(f: (value: V) => K) => (iterable: Iterable<V>) => Chunk.Chunk<[K, Chunk.Chunk<V>]>,
  <V, K>(iterable: Iterable<V>, f: (value: V) => K) => Chunk.Chunk<[K, Chunk.Chunk<V>]>
>(2, <V, K>(iterable: Iterable<V>, f: (value: V) => K): Chunk.Chunk<[K, Chunk.Chunk<V>]> => {
  const builder: Array<[K, Array<V>]> = []
  const iterator = iterable[Symbol.iterator]()
  const map = new Map<K, Array<V>>()
  let next: IteratorResult<V, any>
  while ((next = iterator.next()) && !next.done) {
    const value = next.value
    const key = f(value)
    if (map.has(key)) {
      const innerBuilder = map.get(key)!
      innerBuilder.push(value)
    } else {
      const innerBuilder: Array<V> = [value]
      builder.push([key, innerBuilder])
      map.set(key, innerBuilder)
    }
  }
  return Chunk.unsafeFromArray(
    builder.map((tuple) => [tuple[0], Chunk.unsafeFromArray(tuple[1])])
  )
})
