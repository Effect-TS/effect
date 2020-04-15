import { effect as T, freeEnv as Service } from "@matechs/effect";
import { Do as DoG } from "fp-ts-contrib/lib/Do";
import * as Either from "./either";
import * as Exit from "./exit";
export * as F from "fp-ts/lib/function";
export { pipe } from "fp-ts/lib/pipeable";

export { T };
export { Exit };
export { Either };
export { Service };

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

export const Do = DoG(T.effect);
