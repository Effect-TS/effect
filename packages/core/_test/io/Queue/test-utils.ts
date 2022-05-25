export function waitForValue<A>(ref: Effect.UIO<A>, value: A): Effect.UIO<A> {
  return (ref < Clock.sleep((10).millis)).repeatUntil((a) => value === a)
}

export function waitForSize<A>(queue: Queue<A>, size: number): Effect.UIO<number> {
  return waitForValue(queue.size, size)
}
