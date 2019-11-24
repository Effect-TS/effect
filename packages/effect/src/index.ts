import * as Ei from "fp-ts/lib/Either";
import * as Op from "fp-ts/lib/Option";
import * as M from "deepmerge";
import * as W from "waveguide/lib/wave";
import * as Ar from "fp-ts/lib/Array";
import * as S from "waveguide/lib/semaphore";
import * as EX from "waveguide/lib/exit";
import { pipe, pipeable } from "fp-ts/lib/pipeable";
import {
  Monad3E,
  MonadThrow3E,
  Monad3EC,
  MonadThrow3EC,
  Alt3EC
} from "./overload";
import { Bifunctor3 } from "fp-ts/lib/Bifunctor";
import { Kind3, URIS3 } from "fp-ts/lib/HKT";
import { fromNullable, Option } from "fp-ts/lib/Option";
import { Do } from "fp-ts-contrib/lib/Do";
import { IO } from "fp-ts/lib/IO";
import { FunctionN, Lazy, identity } from "fp-ts/lib/function";
import { Cause } from "waveguide/lib/exit";
import { Exit } from "waveguide/lib/exit";
import { Semigroup } from "fp-ts/lib/Semigroup";
import { Alt3 } from "fp-ts/lib/Alt";

export {
  done,
  abort,
  raise,
  ExitTag,
  Exit,
  Cause,
  Abort,
  Done,
  Interrupt,
  interrupt,
  Raise
} from "waveguide/lib/exit";

export { isDone, isAbort, isRaise, isInterrupt, fold, exit } from "./exit";

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

interface MonadEffect<T extends URIS3>
  extends Monad3E<T>,
    MonadThrow3E<T>,
    Bifunctor3<T> {
  chainLeft<R, E, E2, A, R2>(
    ma: Kind3<T, R, E, A>,
    onLeft: (e: E) => Kind3<T, R2, E2, A>
  ): Kind3<T, R & R2, E2, A>;
  fromWave<E, A>(w: W.Wave<E, A>): Kind3<T, NoEnv, E, A>;
  left<E, A = never>(e: E): Kind3<T, NoEnv, E, A>;
  fromIO<A>(io: IO<A>): Kind3<T, NoEnv, NoErr, A>;
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
  fromAsync<A>(
    op: FunctionN<[FunctionN<[A], void>], Lazy<void>>
  ): Kind3<T, NoEnv, NoErr, A>;
  raised<E>(e: Cause<E>): Kind3<T, NoEnv, E, never>;
  completed<E, A>(exit: Exit<E, A>): Kind3<T, NoEnv, E, A>;
  result<R, E, A>(io: Kind3<T, R, E, A>): Kind3<T, R, NoErr, Exit<E, A>>;
  onInterrupted<R, E, A>(
    ioa: Kind3<T, R, E, A>,
    finalizer: Kind3<T, R, E, unknown>
  ): Kind3<T, R, E, A>;
  raiseAbort(u: unknown): Kind3<T, NoEnv, NoErr, never>;
  unit: Kind3<T, NoEnv, NoErr, void>;
  raiseInterrupt: Kind3<T, NoEnv, NoErr, void>;
  uninterruptible<R, E, A>(io: Kind3<T, R, E, A>): Kind3<T, R, E, A>;
  interruptible<R, E, A>(io: Kind3<T, R, E, A>): Kind3<T, R, E, A>;
  bracketExit<R, E, A, B>(
    acquire: Kind3<T, R, E, A>,
    release: FunctionN<[A, Exit<E, B>], Kind3<T, R, E, unknown>>,
    use: FunctionN<[A], Kind3<T, R, E, B>>
  ): Kind3<T, R, E, B>;
  bracket<R, E, A, B>(
    acquire: Kind3<T, R, E, A>,
    release: FunctionN<[A], Kind3<T, R, E, unknown>>,
    use: FunctionN<[A], Kind3<T, R, E, B>>
  ): Kind3<T, R, E, B>;
  as<R, E, A, B>(io: Kind3<T, R, E, A>, b: B): Kind3<T, R, E, B>;
  shiftAfter<R, E, A>(io: Kind3<T, R, E, A>): Kind3<T, R, E, A>;
  delay<R, E, A>(inner: Kind3<T, R, E, A>, ms: number): Kind3<T, R, E, A>;
  never: Kind3<T, NoEnv, NoErr, never>;
  foldExitWith<R, E1, E2, A1, A2>(
    failure: FunctionN<[Cause<E1>], Kind3<T, R, E2, A2>>,
    success: FunctionN<[A1], Kind3<T, R, E2, A2>>
  ): FunctionN<[Kind3<T, R, E1, A1>], Kind3<T, R, E2, A2>>;
  chainTapWith<R, E, A>(
    bind: FunctionN<[A], Kind3<T, R, E, unknown>>
  ): (inner: Kind3<T, R, E, A>) => Kind3<T, R, E, A>;
  raceFirst<R, E, A, R2, E2>(
    io1: Kind3<URI, R, E, A>,
    io2: Kind3<URI, R2, E2, A>
  ): Kind3<URI, R & R2, E | E2, A>;
  zipWith<R, E, A, R2, E2, B, C>(
    first: Kind3<T, R, E, A>,
    second: Kind3<T, R2, E2, B>,
    f: FunctionN<[A, B], C>
  ): Kind3<T, R & R2, E | E2, C>;
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
  },
  fromAsync<A>(
    op: FunctionN<[FunctionN<[A], void>], Lazy<void>>
  ): Kind3<URI, NoEnv, NoErr, A> {
    return _ => W.asyncTotal(op);
  },
  raised<E>(e: Cause<E>): Kind3<URI, NoEnv, E, never> {
    return _ => W.raised(e);
  },
  completed<E, A>(exit: Exit<E, A>): Kind3<URI, NoEnv, E, A> {
    return _ => W.completed(exit);
  },
  result<R, E, A>(io: Kind3<URI, R, E, A>): Kind3<URI, R, NoErr, Exit<E, A>> {
    return r => W.result(io(r));
  },
  onInterrupted<R, E, A>(
    ioa: Kind3<URI, R, E, A>,
    finalizer: Kind3<URI, R, E, unknown>
  ): Kind3<URI, R, E, A> {
    return r => W.onInterrupted(ioa(r), finalizer(r));
  },
  raiseAbort(u: unknown): Kind3<URI, NoEnv, NoErr, never> {
    return _ => W.raiseAbort(u);
  },
  unit: _ => W.unit,
  uninterruptible<R, E, A>(io: Kind3<URI, R, E, A>): Kind3<URI, R, E, A> {
    return r => W.uninterruptible(io(r));
  },
  interruptible<R, E, A>(io: Kind3<URI, R, E, A>): Kind3<URI, R, E, A> {
    return r => W.interruptible(io(r));
  },
  bracketExit<R, E, A, B>(
    acquire: Kind3<URI, R, E, A>,
    release: FunctionN<[A, Exit<E, B>], Kind3<URI, R, E, unknown>>,
    use: FunctionN<[A], Kind3<URI, R, E, B>>
  ): Kind3<URI, R, E, B> {
    return r =>
      W.bracketExit(
        acquire(r),
        (a, e) => release(a, e)(r),
        a => use(a)(r)
      );
  },
  bracket<R, E, A, B>(
    acquire: Kind3<URI, R, E, A>,
    release: FunctionN<[A], Kind3<URI, R, E, unknown>>,
    use: FunctionN<[A], Kind3<URI, R, E, B>>
  ): Kind3<URI, R, E, B> {
    return r =>
      W.bracket(
        acquire(r),
        a => release(a)(r),
        a => use(a)(r)
      );
  },
  raiseInterrupt: _ => W.raiseInterrupt,
  as: (io, b) => r => W.as(io(r), b),
  shiftAfter<R, E, A>(io: Kind3<URI, R, E, A>): Kind3<URI, R, E, A> {
    return r => W.shiftAfter(io(r));
  },
  delay<R, E, A>(inner: Kind3<URI, R, E, A>, ms: number): Kind3<URI, R, E, A> {
    return r => W.delay(inner(r), ms);
  },
  /* istanbul ignore next */
  never: _ => W.never,
  foldExitWith<R, E1, E2, A1, A2>(
    failure: FunctionN<[Cause<E1>], Kind3<URI, R, E2, A2>>,
    success: FunctionN<[A1], Kind3<URI, R, E2, A2>>
  ): FunctionN<[Kind3<URI, R, E1, A1>], Kind3<URI, R, E2, A2>> {
    return ma => r =>
      pipe(
        ma(r),
        W.foldExitWith(
          c => failure(c)(r),
          a => success(a)(r)
        )
      );
  },
  chainTapWith<R, E, A>(
    bind: FunctionN<[A], Kind3<URI, R, E, unknown>>
  ): (inner: Kind3<URI, R, E, A>) => Kind3<URI, R, E, A> {
    return inner => r =>
      pipe(
        inner(r),
        W.chainTapWith(a => bind(a)(r))
      );
  },
  raceFirst<R, E, A, R2, E2>(
    io1: Kind3<URI, R, E, A>,
    io2: Kind3<URI, R2, E2, A>
  ): Kind3<URI, R & R2, E | E2, A> {
    return r => W.raceFirst<E | E2, A>(io1(r), io2(r));
  },
  zipWith<R, E, A, R2, E2, B, C>(
    first: Kind3<URI, R, E, A>,
    second: Kind3<URI, R2, E2, B>,
    f: FunctionN<[A, B], C>
  ): Kind3<URI, R & R2, E | E2, C> {
    return r => W.zipWith<E | E2, A, B, C>(first(r), second(r), f);
  }
};

export const concurrentEffectMonad: MonadEffect<URI> = {
  ...effectMonad,
  ap: (fab, fa) => r => W.parWave.ap(fab(r), fa(r))
};

export function getCauseSemigroup<E>(S: Semigroup<E>): Semigroup<EX.Cause<E>> {
  return {
    concat: (ca, cb): EX.Cause<E> => {
      if (
        ca._tag === EX.ExitTag.Interrupt ||
        cb._tag === EX.ExitTag.Interrupt
      ) {
        return ca;
      }
      if (ca._tag === EX.ExitTag.Abort) {
        return ca;
      }
      if (cb._tag === EX.ExitTag.Abort) {
        return cb;
      }
      return EX.raise(S.concat(ca.error, cb.error));
    }
  };
}

export function getValidationM<E>(S: Semigroup<E>) {
  return getCauseValidationM(getCauseSemigroup(S));
}

export function getCauseValidationM<E>(
  S: Semigroup<Cause<E>>
): Monad3EC<URI, E> & MonadThrow3EC<URI, E> & Alt3EC<URI, E> {
  return {
    URI,
    of: effectMonad.of,
    map: effectMonad.map,
    chain: effectMonad.chain,
    ap: <R, R2, A, B>(fab: Effect<R, E, (a: A) => B>, fa: Effect<R2, E, A>) => (
      r: R & R2
    ) =>
      W.foldExit(
        fab(r),
        fabe =>
          W.foldExit(
            fa(r),
            fae => W.raised(S.concat(fabe, fae)),
            _ => W.raised(fabe)
          ),
        f => W.map(fa(r), f)
      ),
    throwError: <R, A>(e: E): Effect<R, E, A> => _ => W.raiseError(e),
    alt: <R, R2, A>(
      fa: Effect<R, E, A>,
      fb: () => Effect<R2, E, A>
    ): Effect<R & R2, E, A> => r =>
      W.foldExit(
        fa(r),
        e => W.foldExit(fb()(r), fbe => W.raised(S.concat(e, fbe)), W.pure),
        W.pure
      )
  };
}

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

export const unit: Effect<NoEnv, NoErr, void> = effectMonad.unit;

export const never: Effect<NoEnv, NoErr, never> = effectMonad.never;

export const raiseInterrupt: Effect<NoEnv, NoErr, void> =
  effectMonad.raiseInterrupt;

export function as<R, E, A, B>(io: Effect<R, E, A>, b: B): Effect<R, E, B> {
  return effectMonad.as(io, b);
}

export function shiftAfter<R, E, A>(io: Effect<R, E, A>): Effect<R, E, A> {
  return effectMonad.shiftAfter(io);
}

export function foldExitWith<R, E1, E2, A1, A2>(
  failure: FunctionN<[Cause<E1>], Kind3<URI, R, E2, A2>>,
  success: FunctionN<[A1], Kind3<URI, R, E2, A2>>
): FunctionN<[Effect<R, E1, A1>], Effect<R, E2, A2>> {
  return effectMonad.foldExitWith(failure, success);
}

export function chainTapWith<R, E, A>(
  bind: FunctionN<[A], Effect<R, E, unknown>>
): (inner: Effect<R, E, A>) => Effect<R, E, A> {
  return effectMonad.chainTapWith(bind);
}

/* lift functions */

export function fromAsync<A>(
  op: FunctionN<[FunctionN<[A], void>], Lazy<void>>
): Effect<NoEnv, NoErr, A> {
  return effectMonad.fromAsync(op);
}

export function fromWave<E, A>(w: W.Wave<E, A>): Effect<NoEnv, E, A> {
  return effectMonad.fromWave(w);
}

export function raised<E>(e: Cause<E>): Effect<NoEnv, E, never> {
  return effectMonad.raised(e);
}

export function completed<E, A>(exit: Exit<E, A>): Effect<NoEnv, E, A> {
  return effectMonad.completed(exit);
}

export function raiseAbort(u: unknown): Effect<NoEnv, NoErr, never> {
  return effectMonad.raiseAbort(u);
}

export function result<R, E, A>(
  io: Effect<R, E, A>
): Effect<R, NoErr, Exit<E, A>> {
  return effectMonad.result(io);
}
export function onInterrupted<R, E, A>(
  ioa: Effect<R, E, A>,
  finalizer: Effect<R, E, unknown>
): Effect<R, E, A> {
  return effectMonad.onInterrupted(ioa, finalizer);
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

export function uninterruptible<R, E, A>(io: Effect<R, E, A>): Effect<R, E, A> {
  return effectMonad.uninterruptible(io);
}

export function interruptible<R, E, A>(io: Effect<R, E, A>): Effect<R, E, A> {
  return effectMonad.interruptible(io);
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

export function delay<R, E, A>(
  inner: Effect<R, E, A>,
  ms: number
): Effect<R, E, A> {
  return effectMonad.delay(inner, ms);
}

export function raceFirst<R, E, A, R2, E2>(
  io1: Effect<R, E, A>,
  io2: Effect<R2, E | E2, A>
): Kind3<URI, R & R2, E | E2, A> {
  return effectMonad.raceFirst(io1, io2);
}

export function zipWith<R, E, A, R2, E2, B, C>(
  first: Effect<R, E, A>,
  second: Effect<R2, E2, B>,
  f: FunctionN<[A, B], C>
): Effect<R & R2, E | E2, C> {
  return effectMonad.zipWith(first, second, f);
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

export function bracketExit<R, E, A, B>(
  acquire: Effect<R, E, A>,
  release: FunctionN<[A, Exit<E, B>], Effect<R, E, unknown>>,
  use: FunctionN<[A], Effect<R, E, B>>
): Effect<R, E, B> {
  return effectMonad.bracketExit(acquire, release, use);
}

export function bracket<R, R2, R3, E, E2, E3, A, B>(
  acquire: Effect<R, E, A>,
  release: FunctionN<[A], Effect<R2, E2, unknown>>,
  use: FunctionN<[A], Effect<R3, E3, B>>
): Effect<R & R2 & R3, E | E2 | E3, B> {
  return effectMonad.bracket(
    acquire,
    release as FunctionN<[A], Effect<R & R2 & R3, E | E2 | E3, unknown>>,
    use
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
