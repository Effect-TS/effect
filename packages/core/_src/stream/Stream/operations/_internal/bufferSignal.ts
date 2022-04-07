export function bufferSignal<R, E, A>(
  effect: LazyArg<
    Effect<Has<Scope>, never, Queue<Tuple<[Take<E, A>, Deferred<never, void>]>>>
  >,
  channel: LazyArg<Channel<R, unknown, unknown, unknown, E, Chunk<A>, unknown>>,
  __tsplusTrace?: string
): Channel<R, unknown, unknown, unknown, E, Chunk<A>, void> {
  return Channel.scoped(
    Effect.Do()
      .bind("queue", () => effect())
      .bind("start", () => Deferred.make<never, void>())
      .tap(({ start }) => start.succeed(undefined))
      .bind("ref", ({ start }) => Ref.make(start))
      .tap(({ queue, ref }) => (channel() >> producer<R, E, A>(queue, ref)).runScoped().fork())
      .map(({ queue }) => queue),
    (queue) => consumer<R, E, A>(queue)
  );
}

function producer<R, E, A>(
  queue: Queue<Tuple<[Take<E, A>, Deferred<never, void>]>>,
  ref: Ref<Deferred<never, void>>,
  __tsplusTrace?: string
): Channel<R, E, Chunk<A>, unknown, never, never, unknown> {
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
  );
}

function consumer<R, E, A>(
  queue: Queue<Tuple<[Take<E, A>, Deferred<never, void>]>>,
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
    ({ tuple: [take, deferred] }) =>
      Channel.fromEffect(deferred.succeed(undefined)) >
        take.fold(
          Channel.unit,
          (cause) => Channel.failCause(cause),
          (a) => Channel.write(a) > process
        )
  );
  return process;
}

function terminate<R, E, A>(
  queue: Queue<Tuple<[Take<E, A>, Deferred<never, void>]>>,
  ref: Ref<Deferred<never, void>>,
  take: Take<E, A>,
  __tsplusTrace?: string
): Channel<R, E, Chunk<A>, unknown, never, never, unknown> {
  return Channel.fromEffect(
    Effect.Do()
      .bind("latch", () => ref.get())
      .tap(({ latch }) => latch.await())
      .bind("deferred", () => Deferred.make<never, void>())
      .tap(({ deferred }) => queue.offer(Tuple(take, deferred)))
      .tap(({ deferred }) => ref.set(deferred))
      .map(({ deferred }) => deferred.await())
  );
}
