export function bufferSignal<R, E, A>(
  effect: LazyArg<
    Effect<Scope, never, Queue<Tuple<[Take<E, A>, Deferred<never, void>]>>>
  >,
  channel: LazyArg<Channel<R, unknown, unknown, unknown, E, Chunk<A>, unknown>>,
  __tsplusTrace?: string
): Channel<R, unknown, unknown, unknown, E, Chunk<A>, void> {
  return Channel.unwrapScoped(
    Do(($) => {
      const queue = $(Effect.suspendSucceed(effect))
      const start = $(Deferred.make<never, void>())
      $(start.succeed(undefined))
      const ref = $(Ref.make(start))
      $((channel() >> producer<E, A>(queue, ref)).runScoped.fork)
      return consumer(queue)
    })
  )
}

function producer<E, A>(
  queue: Queue<Tuple<[Take<E, A>, Deferred<never, void>]>>,
  ref: Ref<Deferred<never, void>>,
  __tsplusTrace?: string
): Channel<never, E, Chunk<A>, unknown, never, never, unknown> {
  return Channel.readWith(
    (input: Chunk<A>) =>
      Channel.fromEffect(
        Effect.Do()
          .bind("promise", () => Deferred.make<never, void>())
          .bind("added", ({ promise }) => queue.offer(Tuple(Take.chunk(input), promise)))
          .tap(({ added, promise }) => Effect.when(added, ref.set(promise)))
      ) > producer(queue, ref),
    (err) => terminate(queue, ref, Take.fail(err)),
    () => terminate(queue, ref, Take.end)
  )
}

function consumer<E, A>(
  queue: Queue<Tuple<[Take<E, A>, Deferred<never, void>]>>,
  __tsplusTrace?: string
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
    ({ tuple: [take, deferred] }) =>
      Channel.fromEffect(deferred.succeed(undefined)) >
        take.fold(
          Channel.unit,
          (cause) => Channel.failCause(cause),
          (a) => Channel.write(a) > process
        )
  )
  return process
}

function terminate<E, A>(
  queue: Queue<Tuple<[Take<E, A>, Deferred<never, void>]>>,
  ref: Ref<Deferred<never, void>>,
  take: Take<E, A>,
  __tsplusTrace?: string
): Channel<never, E, Chunk<A>, unknown, never, never, unknown> {
  return Channel.fromEffect(
    Do(($) => {
      const latch = $(ref.get())
      $(latch.await())
      const deferred = $(Deferred.make<never, void>())
      $(queue.offer(Tuple(take, deferred)))
      $(ref.set(deferred))
      return deferred.await()
    })
  )
}
