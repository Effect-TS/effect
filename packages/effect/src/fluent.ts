import * as T from "./effect";
import { pipe } from "fp-ts/lib/pipeable";
import { FunctionN } from "fp-ts/lib/function";
import { Cause, Exit } from "./original/exit";

export type Strip<R, R2 extends Partial<R>> = {
  [k in Exclude<keyof R, keyof R2>]: R[k];
};

export class Fluent<R, E, A> {
  constructor(private readonly t: T.Effect<R, E, A>) {}

  readonly done: () => T.Effect<R, E, A> = () => this.t;

  readonly chain: <R2, E2, A2>(
    f: (s: A) => T.Effect<R2, E2, A2>
  ) => Fluent<R & R2, E | E2, A2> = f => new Fluent(T.effect.chain(this.t, f));

  readonly chainW: <R3, E3, A3>(
    w: T.Effect<R3, E3, A3>
  ) => <R2, E2, A2>(
    f: (wa: A3, s: A) => T.Effect<R2, E2, A2>
  ) => Fluent<R & R2 & R3, E | E2 | E3, A2> = w => f =>
    new Fluent(T.effect.chain(w, wa => T.effect.chain(this.t, s => f(wa, s))));

  readonly chainEnv: <R2, E2, A2>(
    f: (s: A, r: R) => T.Effect<R2, E2, A2>
  ) => Fluent<R & R2, E | E2, A2> = <R2, E2, A2>(
    f: (s: A, r: R) => T.Effect<R2, E2, A2>
  ) =>
    new Fluent(
      T.effect.chain(this.t, x =>
        T.effect.chain(T.accessEnvironment<R>(), r => f(x, r))
      )
    );

  readonly chainAccess: <R3, R2, E2, A2>(
    f: (s: A, r: R3) => T.Effect<R2, E2, A2>
  ) => Fluent<R & R3 & R2, E | E2, A2> = <R3, R2, E2, A2>(
    f: (s: A, r: R3) => T.Effect<R2, E2, A2>
  ) =>
    new Fluent(
      T.effect.chain(this.t, x =>
        T.effect.chain(T.accessEnvironment<R3>(), r => f(x, r))
      )
    );

  readonly chainError: <R2, E2, A2>(
    f: (r: E) => T.Effect<R2, E2, A2>
  ) => Fluent<R & R2, E2, A | A2> = f =>
    new Fluent(T.effect.chainError(this.t, f));

  readonly tap: <R2, E2, A2>(
    f: (s: A) => T.Effect<R2, E2, A2>
  ) => Fluent<R & R2, E | E2, A> = f =>
    new Fluent(T.effect.chainTap(this.t, f));

  readonly provideS: <R2 extends Partial<R>>(
    r: R2
  ) => Fluent<Strip<R, R2>, E, A> = <R2 extends Partial<R>>(r: R2) =>
    new Fluent(
      T.provideR((k: Strip<R, R2>) => ({ ...r, ...k } as any))(this.t)
    );

  readonly provide: (r: R) => Fluent<unknown, E, A> = r =>
    new Fluent(pipe(this.t, T.provideAll(r)));

  readonly foldExit: <R2, E2, A2, A3, R3, E3>(
    failure: FunctionN<[Cause<E>], T.Effect<R2, E2, A2>>,
    success: FunctionN<[A], T.Effect<R3, E3, A3>>
  ) => Fluent<R & R2 & R3, E2 | E3, A2 | A3> = (f, s) =>
    new Fluent(T.effect.foldExit(this.t, f, s));

  readonly result: () => Fluent<R, T.NoErr, Exit<E, A>> = () =>
    new Fluent(T.result(this.t));

  readonly as: <B>(b: B) => Fluent<R, E, B> = b =>
    new Fluent(T.effect.map(this.t, () => b));

  readonly asM: <R2, E2, B>(
    b: T.Effect<R2, E2, B>
  ) => Fluent<R & R2, E | E2, B> = b =>
    new Fluent(T.effect.chain(this.t, () => b));

  readonly map: <B>(f: (a: A) => B) => Fluent<R, E, B> = f =>
    new Fluent(T.effect.map(this.t, f));

  readonly bimap: <E2, B>(
    leftMap: FunctionN<[E], E2>,
    rightMap: FunctionN<[A], B>
  ) => Fluent<R, E2, B> = (l, r) => new Fluent(T.effect.bimap(this.t, l, r));

  readonly mapError: <E2, B>(f: FunctionN<[E], E2>) => Fluent<R, E2, A> = l =>
    new Fluent(T.effect.mapError(this.t, l));

  readonly asUnit: () => Fluent<R, E, void> = () =>
    new Fluent(T.asUnit(this.t));

  readonly runToPromiseExit: (r: OrVoid<R>) => Promise<Exit<E, A>> = r =>
    T.runToPromiseExit((r ? T.provideAll(r as any)(this.t) : this.t) as any);

  readonly runToPromise: (r: OrVoid<R>) => Promise<A> = r =>
    T.runToPromise((r ? T.provideAll(r as any)(this.t) : this.t) as any);

  readonly run: (cb: (ex: Exit<E, A>) => void, r: OrVoid<R>) => void = (
    cb,
    r
  ) => T.run((r ? T.provideAll(r as any)(this.t) : this.t) as any, cb);

  readonly fork: () => Fluent<R, never, T.Fiber<E, A>> = () =>
    new Fluent(T.fork(this.t));

  readonly flow: <R2, E2, A2>(
    f: (e: T.Effect<R, E, A>) => T.Effect<R2, E2, A2>
  ) => Fluent<R2, E2, A2> = f => new Fluent(f(this.t));
}

type OrVoid<R> = R extends {} & infer A ? A : void;

export function fluent<R, E, A>(eff: T.Effect<R, E, A>): Fluent<R, E, A> {
  return new Fluent<R, E, A>(eff);
}
