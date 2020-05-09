export class Flow<A extends ReadonlyArray<unknown>, B> {
  constructor(private readonly f: (...a: A) => B) {
    this.flow = this.flow.bind(this)
    this.done = this.done.bind(this)
  }
  flow<C>(g: (_: B) => C) {
    return new Flow((...a: A) => g(this.f(...a)))
  }
  done(): (...a: A) => B {
    return this.f
  }
}

export const flowF = <A extends ReadonlyArray<unknown>, B>(f: (...a: A) => B) =>
  new Flow(f)
