import {
  effect as Effect,
  freeEnv as Service,
  managed as Managed,
  stream as Stream,
  streameither as StreamEither
} from "@matechs/effect";
import * as Function from "fp-ts/lib/function";
import * as Either from "./either";
import * as Option from "./option";
import * as Exit from "./exit";

export { pipe } from "fp-ts/lib/pipeable";

export { Effect, Stream, StreamEither, Managed, Option };
export { Exit };
export { Either };
export { Service };
export { Function };

export class Pipe<A> {
  constructor(private readonly _: A) {
    this.pipe = this.pipe.bind(this);
    this.done = this.done.bind(this);
  }
  pipe<B>(f: (_: A) => B) {
    return new Pipe(f(this._));
  }
  done(): A {
    return this._;
  }
}

export class Flow<A extends ReadonlyArray<unknown>, B> {
  constructor(private readonly f: (...a: A) => B) {
    this.flow = this.flow.bind(this);
    this.done = this.done.bind(this);
  }
  flow<C>(g: (_: B) => C) {
    return new Flow((...a: A) => g(this.f(...a)));
  }
  done(): (...a: A) => B {
    return this.f;
  }
}

export type CombineNeeds<N, P, N2> = N & P extends P & infer Q ? Q & N2 : N & P & N2;

export class FlowP<Need, Prov, AddE> {
  constructor(private readonly f: Effect.Provider<Need, Prov, AddE>) {
    this.flow = this.flow.bind(this);
    this.done = this.done.bind(this);
  }
  flow<Need2, Prov2, AddE2>(
    g: Effect.Provider<Need2, Prov2, AddE2>
  ): FlowP<CombineNeeds<Need, Prov2, Need2>, Prov & Prov2, AddE | AddE2> {
    return new FlowP((x) => g(this.f(x)));
  }
  done() {
    return this.f;
  }
}

export const pipeF = <A>(_: A) => new Pipe(_);
export const flowF = <A extends ReadonlyArray<unknown>, B>(f: (...a: A) => B) => new Flow(f);
export const flowP = <Need, Prov, AddE>(p: Effect.Provider<Need, Prov, AddE>) => new FlowP(p);
