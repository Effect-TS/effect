import { URIS3, Kind3 } from "fp-ts/lib/HKT";
import { Monad3E } from "./overload";
import * as T from "./effect";
import { pipe } from "fp-ts/lib/pipeable";

export type Rem<R, R2> = R extends R2 & infer R3 ? R3 : R;

export class FluentImpl<R, E, A> {
  constructor(readonly t: T.Effect<R, E, A>) {}

  chain: <R2, E2, A2>(
    f: (s: A) => T.Effect<R2, E2, A2>
  ) => FluentImpl<R & R2, E | E2, A2> = f =>
    new FluentImpl(T.effect.chain(this.t, f));

  chainError: <R2, E2, A2>(
    f: (r: E) => T.Effect<R2, E2, A2>
  ) => FluentImpl<R & R2, E2, A | A2> = f =>
    new FluentImpl(T.effect.chainError(this.t, f));

  tap: <R2, E2, A2>(
    f: (s: A) => T.Effect<R2, E2, A2>
  ) => FluentImpl<R & R2, E | E2, A> = f =>
    new FluentImpl(T.effect.chainTap(this.t, f));

  done: () => T.Effect<R, E, A> = () => this.t;

  provideS<R2 extends object>(r: R2): FluentImpl<Rem<R, R2>, E, A> {
    return new FluentImpl(pipe(this.t, T.provideS(r)) as any);
  }

  provide(r: R): FluentImpl<unknown, E, A> {
    return new FluentImpl(pipe(this.t, T.provideS(r)));
  }
}

export function fluent<R, E, A>(eff: T.Effect<R, E, A>): FluentImpl<R, E, A> {
  return new FluentImpl<R, E, A>(eff);
}
