import type { Chunk } from "@fp-ts/data/Chunk"

/** @internal */
export function bufferSignal<R, E, A>(
  effect: Effect<Scope, never, Queue<readonly [Take<E, A>, Deferred<never, void>]>>,
  channel: Channel<R, unknown, unknown, unknown, E, Chunk<A>, unknown>
): Channel<R, unknown, unknown, unknown, E, Chunk<A>, void> {
  return Channel.unwrapScoped(
    Do(($) => {
      const queue = $(effect)
      const start = $(Deferred.make<never, void>())
      $(start.succeed(undefined))
      const ref = $(Ref.make(start))
      $((channel >> producer<E, A>(queue, ref)).runScoped.forkScoped)
      return consumer(queue)
    })
  )
}

function producer<E, A>(
  queue: Queue<readonly [Take<E, A>, Deferred<never, void>]>,
  ref: Ref<Deferred<never, void>>
): Channel<never, E, Chunk<A>, unknown, never, never, unknown> {
  return Channel.readWith(
    (input: Chunk<A>) =>
      Channel.fromEffect(
        Do(($) => {
          const deferred = $(Deferred.make<never, void>())
          const added = $(queue.offer([Take.chunk(input), deferred] as const))
          $(Effect.when(added, ref.set(deferred)))
        })
      ).zipRight(producer(queue, ref)),
    (err) => terminate(queue, ref, Take.fail(err)),
    () => terminate(queue, ref, Take.end)
  )
}

function consumer<E, A>(
  queue: Queue<readonly [Take<E, A>, Deferred<never, void>]>
): Channel<never, unknown, unknown, unknown, E, Chunk<A>, void> {
  const process: Channel<
    never,
    unknown,
    unknown,
    unknown,
    E,
    Chunk<A>,
    void
  > = Channel.fromEffect(queue.take).flatMap(
    ([take, deferred]) =>
      Channel.fromEffect(deferred.succeed(undefined)).flatMap(() =>
        take.fold(
          Channel.unit,
          (cause) => Channel.failCause(cause),
          (a) => Channel.write(a).flatMap(() => process)
        )
      )
  )
  return process
}

function terminate<E, A>(
  queue: Queue<readonly [Take<E, A>, Deferred<never, void>]>,
  ref: Ref<Deferred<never, void>>,
  take: Take<E, A>
): Channel<never, E, Chunk<A>, unknown, never, never, unknown> {
  return Channel.fromEffect(
    Do(($) => {
      const latch = $(ref.get)
      $(latch.await)
      const deferred = $(Deferred.make<never, void>())
      $(queue.offer([take, deferred]))
      $(ref.set(deferred))
      $(deferred.await)
    })
  )
}
