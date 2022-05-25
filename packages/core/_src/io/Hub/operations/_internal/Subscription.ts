export abstract class Subscription<A> {
  abstract isEmpty(): boolean
  abstract poll<D>(default_: D): A | D
  abstract pollUpTo(n: number): Chunk<A>
  abstract size(): number
  abstract unsubscribe(): void
}
