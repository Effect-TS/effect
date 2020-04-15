import {
  effect as T,
  freeEnv as Service,
  managed as M,
  stream as S,
  streameither as SE
} from "@matechs/effect";
import * as F from "fp-ts/lib/function";
import * as Either from "./either";
import * as Exit from "./exit";

export { pipe } from "fp-ts/lib/pipeable";
export { T, S, SE, M };
export { Exit };
export { Either };
export { Service };
export { F };

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