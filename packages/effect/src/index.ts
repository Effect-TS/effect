import * as Ei from "fp-ts/lib/Either";
import * as Op from "fp-ts/lib/Option";
import * as M from "deepmerge";
import * as W from "waveguide/lib/wave";
import * as Ar from "fp-ts/lib/Array";
import * as S from "waveguide/lib/semaphore";
import * as EX from "waveguide/lib/exit";
import { pipe, pipeable } from "fp-ts/lib/pipeable";
import { Monad3E, MonadThrow3E } from "./overload";
import { Bifunctor3 } from "fp-ts/lib/Bifunctor";
import { Kind3, URIS3 } from "fp-ts/lib/HKT";
import { fromNullable, Option } from "fp-ts/lib/Option";
import { Do } from "fp-ts-contrib/lib/Do";
import { IO } from "fp-ts/lib/IO";

export { done, abort, raise } from "waveguide/lib/exit";

export const URI = "matechs/Effect";

export type URI = typeof URI;

export type NoEnv = unknown;
export type NoErr = never;

export type Effect<R, E, A> = (r: R) => W.Wave<E, A>;

declare module "fp-ts/lib/HKT" {
  interface URItoKind3<R, E, A> {
    [URI]: Effect<R, E, A>;
  }
}

// prettier-ignore
interface MonadEffect<T extends URIS3> extends Monad3E<T>, MonadThrow3E<T>, Bifunctor3<T> {
  chainLeft<R, E, E2, A, R2>(
    ma: Kind3<T, R, E, A>,
    onLeft: (e: E) => Kind3<T, R2, E2, A>
  ): Kind3<T, R & R2, E2, A>;
  fromWave<E, A>(w: W.Wave<E, A>): Kind3<T, NoEnv, E, A>;
  left<E, A = never>(e: E): Kind3<T, NoEnv, E, A>;
  fromIO<A>(io: IO<A>): Kind3<T, NoEnv, never, A>;
  tryIO<E, A>(io: IO<A>, onLeft: (e: any) => E): Kind3<T, NoEnv, E, A>;
  tryPromise<E, A>(
    ioPromise: IO<Promise<A>>,
    onLeft: (e: any) => E
  ): Kind3<T, NoEnv, E, A>;
  provide<R, R2, E, A>(ma: Kind3<T, R2 & R, E, A>, r: R): Kind3<T, R2, E, A>;
  accessM<R, R2, E, A>(f: (r: R) => Kind3<T, R2, E, A>): Kind3<T, R & R2, E, A>;
  sequenceP<R, E, A>(
    ops: Array<Kind3<T, R, E, A>>,
    n: number
  ): Kind3<T, R, E, Array<A>>;
  run<E, A>(ma: Kind3<T, NoEnv, E, A>): IO<Promise<EX.Exit<E, A>>>;
  promise<A>(ma: Kind3<T, NoEnv, any, A>): Promise<A>;
}

export const effectMonad: MonadEffect<URI> = {
  URI,
  of: a => _ => W.wave.of(a),
  map: (fa, f) => r => W.wave.map(fa(r), f),
  ap: (fab, fa) => r => W.wave.ap(fab(r), fa(r)),
  chain: <R, E, A, R2, E2, B>(
    fa: Effect<R, E, A>,
    f: (a: A) => Effect<R2, E2, B>
  ): Effect<R & R2, E | E2, B> => r =>
    W.wave.chain<E | E2, A, B>(fa(r), x => f(x)(r)),
  throwError: e => _ => W.raiseError(e),
  bimap: (fea, f, g) => r => W.bimap(fea(r), f, g),
  mapLeft: (fea, f) => r => W.mapError(fea(r), f),
  chainLeft<R, E, E2, A, R2>(
    ma: Kind3<URI, R, E, A>,
    onLeft: (e: E) => Kind3<URI, R2, E2, A>
  ): Kind3<URI, R & R2, E2, A> {
    return r => W.chainError(ma(r), e => onLeft(e)(r));
  },
  fromWave<E, A>(w: W.Wave<E, A>): Kind3<URI, NoEnv, E, A> {
    return _ => w;
  },
  left<E, A = never>(e: E): Kind3<URI, NoEnv, E, A> {
    return _ => W.raiseError(e);
  },
  fromIO<A>(io: IO<A>): Kind3<URI, NoEnv, never, A> {
    return _ => W.sync(io);
  },
  tryIO<E, A>(io: IO<A>, onLeft: (e: any) => E): Kind3<URI, NoEnv, E, A> {
    return _ =>
      W.async(op => {
        try {
          op(Ei.right(io()));
        } catch (e) {
          op(Ei.left(onLeft(e)));
        }

        /* istanbul ignore next */
        return () => {};
      });
  },
  tryPromise<E, A>(
    ioPromise: IO<Promise<A>>,
    onLeft: (e: any) => E
  ): Kind3<URI, NoEnv, E, A> {
    return _ => W.mapError(W.fromPromise(ioPromise), onLeft);
  },
  provide<R, R2, E, A>(
    ma: Kind3<URI, R2 & R, E, A>,
    r: R
  ): Kind3<URI, R2, E, A> {
    return r2 => ma(M.all([r, r2], { clone: false }));
  },
  accessM<R, R2, E, A>(
    f: (r: R) => Kind3<URI, R2, E, A>
  ): Kind3<URI, R & R2, E, A> {
    return r => f(r)(r);
  },
  sequenceP<R, E, A>(
    ops: Array<Kind3<URI, R, E, A>>,
    n: number
  ): Kind3<URI, R, E, Array<A>> {
    return r =>
      Do(W.wave)
        .bind("sem", S.makeSemaphore(n) as W.Wave<any, S.Semaphore>)
        .bindL("r", ({ sem }) =>
          Ar.array.traverse(W.parWave)(ops, op => sem.withPermit(op(r)))
        )
        .return(s => s.r);
  },
  run<E, A>(ma: Kind3<URI, NoEnv, E, A>): IO<Promise<EX.Exit<E, A>>> {
    return () => W.runToPromiseExit(ma(noEnv));
  },
  promise<A>(ma: Kind3<URI, NoEnv, any, A>): Promise<A> {
    return W.runToPromise(ma(noEnv));
  }
};

export const concurrentEffectMonad: MonadEffect<URI> = {
  ...effectMonad,
  ap: (fab, fa) => r => W.parWave.ap(fab(r), fa(r))
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
  mapLeft
} = pipeable(effectMonad);

export const {
  ap: parAp,
  apFirst: parApFirst,
  apSecond: parApSecond
} = pipeable(concurrentEffectMonad);

/* utils */
export function error(message: string) {
  return new Error(message);
}

/* lift functions */

export function fromWave<E, A>(w: W.Wave<E, A>): Effect<NoEnv, E, A> {
  return effectMonad.fromWave(w);
}

export function right<A>(a: A): Effect<NoEnv, NoErr, A> {
  return effectMonad.of(a);
}

export function left<E, A = never>(e: E): Effect<NoEnv, E, A> {
  return effectMonad.left(e);
}

export function fromIO<A>(io: IO<A>): Effect<NoEnv, never, A> {
  return effectMonad.fromIO(io);
}

export function tryIO<E, A = never>(
  onLeft: (e: any) => E
): (io: IO<A>) => Effect<NoEnv, E, A> {
  return io => effectMonad.tryIO(io, onLeft);
}

export function tryPromise<E, A>(
  onLeft: (e: any) => E
): (ioPromise: IO<Promise<A>>) => Effect<NoEnv, E, A> {
  return ioPromise => effectMonad.tryPromise(ioPromise, onLeft);
}

export function chainLeft<E, E2, A, R2>(
  onLeft: (e: E) => Effect<R2, E2, A>
): <R>(ma: Effect<R, E, A>) => Effect<R & R2, E2, A> {
  return ma => effectMonad.chainLeft(ma, onLeft);
}

/* conditionals */

export function when(
  predicate: boolean
): <R, E, A>(ma: Effect<R, E, A>) => Effect<R, E, Op.Option<A>> {
  return ma =>
    predicate ? effectMonad.map(ma, Op.some) : effectMonad.of(Op.none);
}

export function or_(
  predicate: boolean
): <R, E, A>(
  ma: Effect<R, E, A>
) => <R2, E2, B>(
  mb: Effect<R2, E2, B>
) => Effect<R & R2, E | E2, Ei.Either<A, B>> {
  return ma => mb =>
    predicate ? effectMonad.map(ma, Ei.left) : effectMonad.map(mb, Ei.right);
}

export function or<R, E, A>(
  ma: Effect<R, E, A>
): <R2, E2, B>(
  mb: Effect<R2, E2, B>
) => (predicate: boolean) => Effect<R & R2, E | E2, Ei.Either<A, B>> {
  return mb => predicate =>
    predicate ? effectMonad.map(ma, Ei.left) : effectMonad.map(mb, Ei.right);
}

export function alt_(
  predicate: boolean
): <R, E, A>(ma: Effect<R, E, A>) => (mb: Effect<R, E, A>) => Effect<R, E, A> {
  return ma => mb => (predicate ? ma : mb);
}

export function alt<R, E, A>(
  ma: Effect<R, E, A>
): (mb: Effect<R, E, A>) => (predicate: boolean) => Effect<R, E, A> {
  return mb => predicate => (predicate ? ma : mb);
}

/* manipulate environment */

export function mergeEnv<A, B>(a: A): (b: B) => A & B {
  return b => M.all([a, b], { clone: false });
}

export const noEnv = {};

export const provide = <R>(r: R) => <R2, E, A>(
  ma: Effect<R2 & R, E, A>
): Effect<R2, E, A> => effectMonad.provide(ma, r);

/* use environment */

export function accessM<R, R2, E, A>(
  f: (r: R) => Effect<R2, E, A>
): Effect<R & R2, E, A> {
  return effectMonad.accessM(f);
}

export function access<R, A>(f: (r: R) => A): Effect<R, NoErr, A> {
  return effectMonad.accessM((r: R) => effectMonad.of(f(r)));
}

/* parallel */

export function sequenceP<R, E, A>(
  n: number
): (ops: Array<Effect<R, E, A>>) => Effect<R, E, Array<A>> {
  return ops => effectMonad.sequenceP(ops, n);
}

/* execution */

export function run<E, A>(ma: Effect<NoEnv, E, A>): IO<Promise<EX.Exit<E, A>>> {
  return effectMonad.run(ma);
}

export function promise<A>(ma: Effect<NoEnv, any, A>): Promise<A> {
  return effectMonad.promise(ma);
}

/* bracket */

export function bracket<R, E, A, B, E2>(
  acquire: Effect<R, E, A>,
  use: (a: A) => Effect<R, E2, B>,
  release: (a: A) => Effect<R, E, void>
): Effect<R, E | E2, B> {
  return effectMonad.chain(acquire, a =>
    effectMonad.chain(toTaskLike(use(a)), e =>
      effectMonad.chain(release(a), () =>
        Ei.isLeft(e) ? left(e.left) : right(e.right)
      )
    )
  );
}

/* Task-like converters, convert operations that can fail into non failing and vice versa */

export function toTaskLike<R, E, A>(
  ma: Effect<R, E, A>
): Effect<R, NoErr, Ei.Either<E, A>> {
  return pipe(
    ma,
    map(a => Ei.right(a)),
    chainLeft(e => right(Ei.left(e)))
  );
}

export function fromTaskLike<R, E, A>(
  ma: Effect<R, never, Ei.Either<E, A>>
): Effect<R, E, A> {
  return effectMonad.chain(ma, r =>
    Ei.isLeft(r) ? left(r.left) : right(r.right)
  );
}

/* utilities */

export function fromNullableM<R, E, A>(
  ma: Effect<R, E, A>
): Effect<R, E, Option<A>> {
  return effectMonad.map(ma, fromNullable);
}
