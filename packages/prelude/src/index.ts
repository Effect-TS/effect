import { eff as IO, freeEnv as Service, exit as Exit } from "@matechs/effect";
import * as Either from "fp-ts/lib/Either";
export { pipe } from "fp-ts/lib/pipeable";
import { Do as DoG } from "fp-ts-contrib/lib/Do";

export { IO };
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

export const Do = DoG(IO.eff);
