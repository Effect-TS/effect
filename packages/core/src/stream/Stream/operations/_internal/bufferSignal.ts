import type { LazyArg } from "../../../..//data/Function"
import { Promise } from "../../../..//io/Promise"
import type { Queue } from "../../../..//io/Queue"
import type { Chunk } from "../../../../collection/immutable/Chunk"
import { Tuple } from "../../../../collection/immutable/Tuple"
import { Effect } from "../../../../io/Effect"
import { Ref } from "../../../../io/Ref"
import type { HasScope } from "../../../../io/Scope"
import { Channel } from "../../../Channel"
import { Take } from "../../../Take"

export function bufferSignal<R, E, A>(
  effect: LazyArg<
    Effect<HasScope, never, Queue<Tuple<[Take<E, A>, Promise<never, void>]>>>
  >,
  channel: LazyArg<Channel<R, unknown, unknown, unknown, E, Chunk<A>, unknown>>,
  __tsplusTrace?: string
): Channel<R, unknown, unknown, unknown, E, Chunk<A>, void> {
  return Channel.scoped(
    Effect.Do()
      .bind("queue", () => effect())
      .bind("start", () => Promise.make<never, void>())
      .tap(({ start }) => start.succeed(undefined))
      .bind("ref", ({ start }) => Ref.make(start))
      .tap(({ queue, ref }) =>
        (channel() >> producer<R, E, A>(queue, ref)).runScoped().fork()
      )
      .map(({ queue }) => queue),
    (queue) => consumer<R, E, A>(queue)
  )
}

function producer<R, E, A>(
  queue: Queue<Tuple<[Take<E, A>, Promise<never, void>]>>,
  ref: Ref<Promise<never, void>>,
  __tsplusTrace?: string
): Channel<R, E, Chunk<A>, unknown, never, never, unknown> {
  return Channel.readWith(
    (input: Chunk<A>) =>
      Channel.fromEffect(
        Effect.Do()
          .bind("promise", () => Promise.make<never, void>())
          .bind("added", ({ promise }) =>
            queue.offer(Tuple(Take.chunk(input), promise))
          )
          .tap(({ added, promise }) => Effect.when(added, ref.set(promise)))
      ) > producer(queue, ref),
    (err) => terminate(queue, ref, Take.fail(err)),
    () => terminate(queue, ref, Take.end)
  )
}

function consumer<R, E, A>(
  queue: Queue<Tuple<[Take<E, A>, Promise<never, void>]>>,
  __tsplusTrace?: string
): Channel<R, unknown, unknown, unknown, E, Chunk<A>, void> {
  const process: Channel<
    unknown,
    unknown,
    unknown,
    unknown,
    E,
    Chunk<A>,
    void
  > = Channel.fromEffect(queue.take).flatMap(
    ({ tuple: [take, promise] }) =>
      Channel.fromEffect(promise.succeed(undefined)) >
      take.fold(
        Channel.unit,
        (cause) => Channel.failCause(cause),
        (a) => Channel.write(a) > process
      )
  )
  return process
}

function terminate<R, E, A>(
  queue: Queue<Tuple<[Take<E, A>, Promise<never, void>]>>,
  ref: Ref<Promise<never, void>>,
  take: Take<E, A>,
  __tsplusTrace?: string
): Channel<R, E, Chunk<A>, unknown, never, never, unknown> {
  return Channel.fromEffect(
    Effect.Do()
      .bind("latch", () => ref.get)
      .tap(({ latch }) => latch.await())
      .bind("promise", () => Promise.make<never, void>())
      .tap(({ promise }) => queue.offer(Tuple(take, promise)))
      .tap(({ promise }) => ref.set(promise))
      .map(({ promise }) => promise.await())
  )
}
