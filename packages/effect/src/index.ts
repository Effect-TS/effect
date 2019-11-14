import * as F from "fluture";
import * as Ei from "fp-ts/lib/Either";
import * as Op from "fp-ts/lib/Option";
import * as M from "deepmerge";
import { pipe, pipeable } from "fp-ts/lib/pipeable";
import { Monad3E } from "./overload";
import { Cancel, ConcurrentFutureInstance, Par } from "fluture";
import { MonadThrow3 } from "fp-ts/lib/MonadThrow";
import { Bifunctor3 } from "fp-ts/lib/Bifunctor";
import { URIS3 } from "fp-ts/lib/HKT";

export const URI = "matechs/Effect";
export const URIC = "matechs/ConcurrentEffect";

export type URI = typeof URI;
export type URIC = typeof URIC;

export type NoEnv = unknown;
export type NoErr = never;

export type Effect<R, E, A> = (r: R) => F.FutureInstance<E, A>;
export type ConcurrentEffect<R, E, A> = (
  r: R
) => ConcurrentFutureInstance<E, A>;

declare module "fp-ts/lib/HKT" {
  interface URItoKind3<R, E, A> {
    [URI]: Effect<R, E, A>;
    [URIC]: ConcurrentEffect<R, E, A>;
  }
}

export type EffectMonad<T extends URIS3> = Monad3E<T> &
  MonadThrow3<T> &
  Bifunctor3<T>;

export const effectMonad: EffectMonad<URI> = {
  URI,
  of: a => _ => F.of(a),
  map: (fa, f) => r => F.map(f, fa(r)),
  ap: (fab, fa) => r => F.ap(fab(r), fa(r)),
  chain: <R, E, A, R2, E2, B>(
    fa: Effect<R, E, A>,
    f: (a: A) => Effect<R2, E2, B>
  ): Effect<R & R2, E | E2, B> => r =>
    F.chain<E | E2, A, B>(x => f(x)(r), fa(r)),
  throwError: e => _ => F.reject(e),
  bimap: (fea, f, g) => r => F.bimap(f, g, fea(r)),
  mapLeft: (fea, f) => r => F.mapRej(f, fea(r))
};

export const concurrentEffectMonad: EffectMonad<URIC> = {
  URI: URIC,
  of: a => _ => Par(F.of(a)),
  map: (fa, f) => r => F.map(f, fa(r)),
  ap: (fab, fa) => r => F.ap(fab(r), fa(r)),
  chain: <R, E, A, R2, E2, B>(
    fa: ConcurrentEffect<R, E, A>,
    f: (a: A) => ConcurrentEffect<R2, E2, B>
  ): ConcurrentEffect<R & R2, E | E2, B> => r =>
    Par(F.chain<E | E2, A, B>(x => f(x)(r).sequential, fa(r).sequential)),
  throwError: e => _ => Par(F.reject(e)),
  bimap: (fea, f, g) => r => Par(F.bimap(f, g, fea(r).sequential)),
  mapLeft: (fea, f) => r => Par(F.mapRej(f, fea(r).sequential))
};

export const {
  ap,
  apFirst,
  apSecond,
  chain,
  chainFirst,
  flatten,
  map,
  bimap,
  filterOrElse,
  fromEither,
  fromOption,
  fromPredicate,
  mapLeft,
  pipeablePar
} = {
  ...pipeable(effectMonad),
  pipeablePar: pipeable(concurrentEffectMonad)
};

/* utils */
export function error(message: string) {
  return new Error(message);
}

/* lift functions */

export function fromFuture<E, A>(
  f: F.FutureInstance<E, A>
): Effect<NoEnv, E, A> {
  return _ => f;
}

export function right<A>(a: A): Effect<NoEnv, NoErr, A> {
  return effectMonad.of(a);
}

export function left<E>(e: E): Effect<NoEnv, E, never> {
  return _ => F.reject(e);
}

export function liftPromise<A, E>(
  f: () => Promise<A>
): Effect<NoEnv, never, A> {
  return _ => F.tryP(f);
}

export function liftIO<A>(f: () => A): Effect<NoEnv, never, A> {
  return _ => F.encase<never, A, NoEnv>(f)(noEnv);
}

export function tryCatch<A, E>(
  f: () => Promise<A>,
  onLeft: (e: any) => E
): Effect<NoEnv, E, A> {
  return _ => F.tryP(f).mapRej(onLeft);
}

export function tryCatchIO<A, E>(
  f: () => A,
  onLeft: (e: any) => E
): Effect<NoEnv, E, A> {
  return _ => F.encase(f)({}).mapRej(onLeft);
}

export function chainLeft<R, E, E2, A, R2>(
  ma: Effect<R, E, A>,
  onLeft: (e: E) => Effect<R2, E2, A>
): Effect<R & R2, E2, A> {
  return r => ma(r).chainRej(e => onLeft(e)(r));
}

/* conditionals */

export function when(
  predicate: boolean
): <R, E, A>(ma: Effect<R, E, A>) => Effect<R, E, Op.Option<A>> {
  return ma =>
    predicate ? effectMonad.map(ma, Op.some) : effectMonad.of(Op.none);
}

export function or(
  predicate: boolean
): <R, E, A>(
  ma: Effect<R, E, A>
) => <R2, E2, B>(
  mb: Effect<R2, E2, B>
) => Effect<R & R2, E | E2, Ei.Either<A, B>> {
  return ma => mb =>
    predicate ? effectMonad.map(ma, Ei.left) : effectMonad.map(mb, Ei.right);
}

export function alt(
  predicate: boolean
): <R, E, A>(ma: Effect<R, E, A>) => (mb: Effect<R, E, A>) => Effect<R, E, A> {
  return ma => mb => (predicate ? ma : mb);
}

/* manipulate environment */

export function mergeEnv<A, B>(a: A): (b: B) => A & B {
  return b => M.all([a, b], { clone: false });
}

export const noEnv = {};

export const provide = <R>(r: R) => <R2, E, A>(
  ma: Effect<R2 & R, E, A>
): Effect<R2, E, A> => r2 => ma(M.all([r, r2], { clone: false }));

/* use environment */

export function accessM<R, R2, E, A>(
  f: (r: R) => Effect<R2, E, A>
): Effect<R & R2, E, A> {
  return r => f(r)(r);
}

export function access<R, A>(f: (r: R) => A): Effect<R, NoErr, A> {
  return r => F.of(f(r));
}

/* convert par/seq */
export function par<R, E, A>(ma: Effect<R, E, A>): ConcurrentEffect<R, E, A> {
  return r => Par(ma(r));
}

export function seq<R, E, A>(ma: ConcurrentEffect<R, E, A>): Effect<R, E, A> {
  return r => ma(r).sequential;
}

/* parallel */

export function sequenceP<R, E, A>(
  n: number,
  ops: Array<Effect<R, E, A>>
): Effect<R, E, Array<A>> {
  return r =>
    F.parallel(
      n,
      ops.map(op => op(r))
    );
}

/* execution */

export function run<E, A>(
  ma: Effect<NoEnv, E, A>
): () => Promise<Ei.Either<E, A>> {
  return () =>
    ma(noEnv)
      .map(r => Ei.right<E, A>(r))
      .chainRej(e => F.of(Ei.left(e)))
      .promise();
}

export function promise<A>(ma: Effect<NoEnv, any, A>): Promise<A> {
  return ma(noEnv).promise();
}

export function fork<A, E>(
  res: (a: A) => void,
  rej: (e: E) => void
): (ma: Effect<NoEnv, E, A>) => Cancel {
  return ma => F.fork(rej, res)(ma(noEnv));
}

/* bracket */

export function bracket<R, E, A, B, E2>(
  acquire: Effect<R, E, A>,
  use: (a: A) => Effect<R, E2, B>,
  release: (a: A, e: Ei.Either<E | E2, B>) => Effect<R, E, void>
): Effect<R, E | E2, B> {
  return effectMonad.chain(acquire, a =>
    effectMonad.chain(toTaskLike(use(a)), e =>
      effectMonad.chain(release(a, e), () =>
        Ei.isLeft(e) ? left(e.left) : right(e.right)
      )
    )
  );
}

/* Task-like converters, convert operations that can fail into non failing and vice versa */

export function toTaskLike<R, E, A>(
  ma: Effect<R, E, A>
): Effect<R, NoErr, Ei.Either<E, A>> {
  return r =>
    ma(r)
      .map(a => Ei.right<E, A>(a))
      .chainRej(e => F.of(Ei.left(e)));
}

export function fromTaskLike<R, E, A>(
  ma: Effect<R, never, Ei.Either<E, A>>
): Effect<R, E, A> {
  return effectMonad.chain(ma, r =>
    Ei.isLeft(r) ? left(r.left) : right(r.right)
  );
}
