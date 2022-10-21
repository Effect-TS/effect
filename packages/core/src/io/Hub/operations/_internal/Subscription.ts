export interface Subscription<A> {
  get isEmpty(): boolean
  poll<D>(default_: D): A | D
  pollUpTo(n: number): Chunk<A>
  get size(): number
  unsubscribe(): void
}
