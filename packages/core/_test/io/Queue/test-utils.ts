export function waitForValue<A>(ref: Effect<never, never, A>, value: A): Effect<never, never, A> {
  return (ref < Clock.sleep((10).millis)).repeatUntil((a) => value === a)
}

export function waitForSize<A>(queue: Queue<A>, size: number): Effect<never, never, number> {
  return waitForValue(queue.size, size)
}
