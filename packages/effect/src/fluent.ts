import * as T from "./effect";
import { pipe } from "fp-ts/lib/pipeable";
import { FunctionN } from "fp-ts/lib/function";
import { Cause, Exit } from "./original/exit";

export type Strip<R, R2 extends Partial<R>> = {
  [k in Exclude<keyof R, keyof R2>]: R[k];
};

export class Fluent<R, E, A> {
  constructor(private readonly t: T.Effect<R, E, A>) {}

  done: () => T.Effect<R, E, A> = () => this.t;

  chain: <R2, E2, A2>(
    f: (s: A) => T.Effect<R2, E2, A2>
  ) => Fluent<R & R2, E | E2, A2> = f => new Fluent(T.effect.chain(this.t, f));

  chainEnv: <R2, E2, A2>(
    f: (s: A, r: R) => T.Effect<R2, E2, A2>
  ) => Fluent<R & R2, E | E2, A2> = <R2, E2, A2>(
    f: (s: A, r: R) => T.Effect<R2, E2, A2>
  ) =>
    new Fluent(
      T.effect.chain(this.t, x =>
        T.effect.chain(T.accessEnvironment<R>(), r => f(x, r))
      )
    );

  chainAccess: <R3, R2, E2, A2>(
    f: (s: A, r: R3) => T.Effect<R2, E2, A2>
  ) => Fluent<R & R3 & R2, E | E2, A2> = <R3, R2, E2, A2>(
    f: (s: A, r: R3) => T.Effect<R2, E2, A2>
  ) =>
    new Fluent(
      T.effect.chain(this.t, x =>
        T.effect.chain(T.accessEnvironment<R3>(), r => f(x, r))
      )
    );

  chainError: <R2, E2, A2>(
    f: (r: E) => T.Effect<R2, E2, A2>
  ) => Fluent<R & R2, E2, A | A2> = f =>
    new Fluent(T.effect.chainError(this.t, f));

  tap: <R2, E2, A2>(
    f: (s: A) => T.Effect<R2, E2, A2>
  ) => Fluent<R & R2, E | E2, A> = f =>
    new Fluent(T.effect.chainTap(this.t, f));

  provideS: <R2 extends Partial<R>>(r: R2) => Fluent<Strip<R, R2>, E, A> = <
    R2 extends Partial<R>
  >(
    r: R2
  ) =>
    new Fluent(
      T.provideR((k: Strip<R, R2>) => ({ ...r, ...k } as any))(this.t)
    );

  provide: (r: R) => Fluent<unknown, E, A> = r =>
    new Fluent(pipe(this.t, T.provideAll(r)));

  foldExit: <R2, E2, A2, A3, R3, E3>(
    failure: FunctionN<[Cause<E>], T.Effect<R2, E2, A2>>,
    success: FunctionN<[A], T.Effect<R3, E3, A3>>
  ) => Fluent<R & R2 & R3, E2 | E3, A2 | A3> = (f, s) =>
    new Fluent(T.effect.foldExit(this.t, f, s));

  result: () => Fluent<R, T.NoErr, Exit<E, A>> = () =>
    new Fluent(T.result(this.t));

  as: <B>(b: B) => Fluent<R, E, B> = b =>
    new Fluent(T.effect.map(this.t, () => b));

  asM: <R2, E2, B>(b: T.Effect<R2, E2, B>) => Fluent<R & R2, E | E2, B> = b =>
    new Fluent(T.effect.chain(this.t, () => b));

  map: <B>(f: (a: A) => B) => Fluent<R, E, B> = f =>
    new Fluent(T.effect.map(this.t, f));

  bimap: <E2, B>(
    leftMap: FunctionN<[E], E2>,
    rightMap: FunctionN<[A], B>
  ) => Fluent<R, E2, B> = (l, r) => new Fluent(T.effect.bimap(this.t, l, r));

  mapError: <E2, B>(f: FunctionN<[E], E2>) => Fluent<R, E2, A> = l =>
    new Fluent(T.effect.mapError(this.t, l));

  asUnit: () => Fluent<R, E, void> = () => new Fluent(T.asUnit(this.t));

  runToPromiseExit: (r: OrVoid<R>) => Promise<Exit<E, A>> = r =>
    T.runToPromiseExit((r ? T.provideAll(r as any)(this.t) : this.t) as any);

  runToPromise: (r: OrVoid<R>) => Promise<A> = r =>
    T.runToPromise((r ? T.provideAll(r as any)(this.t) : this.t) as any);

  run: (cb: (ex: Exit<E, A>) => void, r: OrVoid<R>) => void = (cb, r) =>
    T.run((r ? T.provideAll(r as any)(this.t) : this.t) as any, cb);
}

type OrVoid<R> = R extends {} & infer A ? A : void;

export function fluent<R, E, A>(eff: T.Effect<R, E, A>): Fluent<R, E, A> {
  return new Fluent<R, E, A>(eff);
}
