export function waitForValue<A>(ref: UIO<A>, value: A): RIO<HasClock, A> {
  return (ref < Clock.sleep((10).millis)).repeatUntil((a) => value === a);
}

export function waitForSize<A>(queue: Queue<A>, size: number): RIO<HasClock, number> {
  return waitForValue(queue.size, size);
}
