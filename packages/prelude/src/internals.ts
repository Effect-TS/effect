import { effect as T } from "@matechs/effect"

export type CombineNeeds<N, P, N2> = N & P extends P & infer Q ? Q & N2 : N & P & N2

export class FlowP<Need, Prov, AddE, Op> {
  constructor(private readonly f?: any) {
    this.with = this.with.bind(this)
    this.done = this.done.bind(this)
  }

  with<Need2, Prov2, Err2, Op2>(
    _: T.Provider<Need2, Prov2, Err2, Op2>
  ): FlowP<CombineNeeds<Need, Prov2, Need2>, Prov & Prov2, AddE | Err2, Op | Op2> {
    return new FlowP((x: any) => (_ as any)(this.f(x))) as any
  }

  done(): T.Provider<Need, Prov, AddE, Op> {
    return this.f
  }
}

export class Pipe<A> {
  constructor(private readonly _: A) {
    this.pipe = this.pipe.bind(this)
    this.done = this.done.bind(this)
  }
  pipe<B>(f: (_: A) => B) {
    return new Pipe(f(this._))
  }
  done(): A {
    return this._
  }
}

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
