export interface Next<A> {
  readonly done?: boolean
  readonly value: A
}
