export function waitForValue<A>(ref: UIO<A>, value: A): UIO<A> {
  return (ref < Clock.sleep((10).millis)).repeatUntil((a) => value === a);
}

export function waitForSize<A>(queue: Queue<A>, size: number): UIO<number> {
  return waitForValue(queue.size, size);
}
