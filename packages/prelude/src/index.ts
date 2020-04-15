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

export class Fluent<A> {
  constructor(private readonly _: A) {
    this.pipe = this.pipe.bind(this);
    this.done = this.done.bind(this);
  }
  pipe<B>(f: (_: A) => B) {
    return new Fluent(f(this._));
  }
  done(): A {
    return this._;
  }
}

export const fluent = <A>(_: A) => new Fluent(_);
