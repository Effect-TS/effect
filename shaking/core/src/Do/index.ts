import type { Do as DoG } from "fp-ts-contrib/lib/Do"
import type { HKT } from "fp-ts/lib/HKT"
import type { Monad } from "fp-ts/lib/Monad"

import { sequenceS } from "../Apply/sequenceS"

class DoClass<M> {
  constructor(readonly M: Monad<M>, private result: HKT<M, any>) {}
  do(action: HKT<M, any>): DoClass<M> {
    return new DoClass(
      this.M,
      this.M.chain(this.result, (s) => this.M.map(action, () => s))
    )
  }
  doL(f: (s: any) => HKT<M, any>): DoClass<M> {
    return new DoClass(
      this.M,
      this.M.chain(this.result, (s) => this.M.map(f(s), () => s))
    )
  }
  bind(name: string, action: HKT<M, any>): DoClass<M> {
    return new DoClass(
      this.M,
      this.M.chain(this.result, (s) =>
        this.M.map(action, (b) => Object.assign({}, s, { [name]: b }))
      )
    )
  }
  bindL(name: string, f: (s: any) => HKT<M, any>): DoClass<M> {
    return new DoClass(
      this.M,
      this.M.chain(this.result, (s) =>
        this.M.map(f(s), (b) => Object.assign({}, s, { [name]: b }))
      )
    )
  }
  let(name: string, a: any): DoClass<M> {
    return new DoClass(
      this.M,
      this.M.map(this.result, (s) => Object.assign({}, s, { [name]: a }))
    )
  }
  letL(name: string, f: (s: any) => any): DoClass<M> {
    return new DoClass(
      this.M,
      this.M.map(this.result, (s) => Object.assign({}, s, { [name]: f(s) }))
    )
  }
  sequenceS(r: Record<string, HKT<M, any>>): DoClass<M> {
    return new DoClass(
      this.M,
      this.M.chain(this.result, (s) =>
        this.M.map(sequenceS(this.M)(r), (r) => Object.assign({}, s, r))
      )
    )
  }
  sequenceSL(f: (s: any) => Record<string, HKT<M, any>>): DoClass<M> {
    return new DoClass(
      this.M,
      this.M.chain(this.result, (s) =>
        this.M.map(sequenceS(this.M)(f(s)), (r) => Object.assign({}, s, r))
      )
    )
  }
  return<B>(f: (s: any) => B): HKT<M, B> {
    return this.M.map(this.result, f)
  }
  done(): HKT<M, any> {
    return this.result
  }
}

const init = {}

export const Do: typeof DoG = (M: any) => new DoClass(M, M.of(init)) as any
