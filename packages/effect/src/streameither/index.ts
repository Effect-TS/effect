import * as T from "../effect";
import * as M from "../managed";
import * as S from "../stream";
import {
  option as O,
  either as Ei,
  function as F,
  bifunctor as B,
  pipeable as P,
} from "fp-ts";
import { Monad3E, MonadThrow3E, Alt3E } from "../overload";

// alpha version exposed for exeperimentation purposes
/* istanbul ignore file */

export type StreamEitherT<R, E, A> = S.Stream<R, never, Ei.Either<E, A>>;

export interface StreamEither<R, E, A> {
  _TAG: "StreamEither";
  _E: E;
  _A: A;
  _R: (_: R) => void;
}

export const toS = <R, E, A>(
  _: StreamEitherT<R, E, A>
): StreamEither<R, E, A> => _ as any;
export const fromS = <R, E, A>(
  _: StreamEither<R, E, A>
): StreamEitherT<R, E, A> => _ as any;

export function encaseEffect<R, E, A>(
  eff: T.Effect<R, E, A>
): StreamEither<R, E, A> {
  return toS(
    S.encaseEffect(
      T.effect.chainError(T.effect.map(eff, Ei.right), (e) =>
        T.pure(Ei.left(e))
      )
    )
  );
}

function chain_<R, E, A, R2, E2, B>(
  str: StreamEither<R, E, A>,
  f: (a: A) => StreamEither<R2, E2, B>
): StreamEither<R & R2, E | E2, B> {
  return toS(
    S.stream.chain(
      fromS((str as any) as StreamEither<R & R2, E | E2, A>),
      (ea) => fromS(Ei.isLeft(ea) ? (S.stream.of(ea) as any) : f(ea.right))
    )
  );
}

function chainError_<R, E, A, R2, E2>(
  str: StreamEither<R, E, A>,
  f: (a: E) => StreamEither<R2, E2, A>
): StreamEither<R & R2, E2, A> {
  return toS(
    S.stream.chain(fromS((str as any) as StreamEither<R & R2, E, A>), (ea) =>
      fromS(
        Ei.isRight(ea)
          ? S.stream.of<R & R2, never, Ei.Either<E | E2, A>>(ea)
          : (f(ea.left) as any)
      )
    )
  );
}

export function chainError<E, A, R2, E2>(
  f: (a: E) => StreamEither<R2, E2, A>
): <R>(str: StreamEither<R, E, A>) => StreamEither<R & R2, E2, A> {
  return <R>(str: StreamEither<R, E, A>) => chainError_(str, f);
}

export function of<R, E, A>(a: A): StreamEither<R, E, A> {
  return toS(S.stream.of(Ei.right(a)));
}

export function pure<A>(a: A): StreamEither<T.NoEnv, T.NoErr, A> {
  return toS(S.stream.of(Ei.right(a)));
}

export function zipWith<R, E, A, R2, E2, B, C>(
  as: StreamEither<R, E, A>,
  bs: StreamEither<R2, E2, B>,
  f: F.FunctionN<[A, B], C>
): StreamEither<R & R2, E | E2, C> {
  return toS(
    S.stream.zipWith(fromS(as), fromS(bs), (ea, eb) => {
      if (Ei.isLeft(ea)) {
        return Ei.left(ea.left);
      } else if (Ei.isLeft(eb)) {
        return Ei.left(eb.left);
      } else {
        return Ei.right(f(ea.right, eb.right));
      }
    })
  );
}

function map_<R, E, A, B>(
  ma: StreamEither<R, E, A>,
  f: (a: A) => B
): StreamEither<R, E, B> {
  return toS(
    S.stream.map(fromS(ma), (ea) => {
      if (Ei.isLeft(ea)) {
        return Ei.left(ea.left);
      } else {
        return Ei.right(f(ea.right));
      }
    })
  );
}

export function collectArray<R, E, A>(
  stream: StreamEither<R, E, A>
): T.Effect<R, E, A[]> {
  return S.collectArray(toStream(stream));
}

export function take<R, E, A>(
  stream: StreamEither<R, E, A>,
  n: number
): StreamEither<R, E, A> {
  return toS(S.stream.take(fromS(stream), n));
}

export function toStream<R, E, A>(
  stream: StreamEither<R, E, A>
): S.Stream<R, E, A> {
  return S.stream.chain(fromS(stream), (e) => {
    if (Ei.isLeft(e)) {
      return S.encaseEffect<R, E, A>(T.raiseError(e.left));
    } else {
      return S.stream.of<R, E, A>(e.right);
    }
  });
}

export function drain<R, E, A>(
  stream: StreamEither<R, E, A>
): T.Effect<R, E, void> {
  return S.drain(toStream(stream));
}

export function fromSource<R, E, A>(
  r: M.Managed<R, never, T.Effect<R, E, O.Option<A>>>
): StreamEither<R, E, A> {
  return toS(
    S.fromSource(
      M.managed.map(r, (e) =>
        T.effect.chainError(
          T.effect.map(e, (oa) => O.option.map(oa, Ei.right)),
          (e) => T.pure(O.some(Ei.left(e)))
        )
      )
    )
  );
}

export function fromArray<A>(
  as: readonly A[]
): StreamEither<T.NoEnv, T.NoErr, A> {
  return toS(S.stream.map(S.fromArray(as), (a) => Ei.right(a)));
}

export function fromIterator<A>(
  iter: F.Lazy<Iterator<A>>
): StreamEither<T.NoEnv, T.NoErr, A> {
  return toS(S.stream.map(S.fromIterator(iter), (a) => Ei.right(a)));
}

export function fromRange(
  start: number,
  interval?: number,
  end?: number
): StreamEither<T.NoEnv, T.NoErr, number> {
  return toS(
    S.stream.map(S.fromRange(start, interval, end), (a) => Ei.right(a))
  );
}

export function fromIteratorUnsafe<A>(
  iter: Iterator<A>
): StreamEither<T.NoEnv, T.NoErr, A> {
  return toS(S.stream.map(S.fromIteratorUnsafe(iter), (a) => Ei.right(a)));
}

export function once<A>(a: A): StreamEither<T.NoEnv, T.NoErr, A> {
  return toS(S.stream.map(S.once(a), (a) => Ei.right(a)));
}

export function repeatedly<A>(a: A): StreamEither<T.NoEnv, T.NoErr, A> {
  return toS(S.stream.map(S.repeatedly(a), (a) => Ei.right(a)));
}

export function periodically(
  ms: number
): StreamEither<T.NoEnv, T.NoErr, number> {
  return toS(S.stream.map(S.periodically(ms), (a) => Ei.right(a)));
}

export const empty: StreamEither<T.NoEnv, T.NoErr, never> = S.empty as any;

export function raised<E>(e: E): StreamEither<T.NoEnv, E, never> {
  return toS(S.once(Ei.left(e)));
}

export function aborted(e: unknown): StreamEither<T.NoEnv, T.NoErr, never> {
  return toS(S.stream.map(S.aborted(e), (a) => Ei.right(a)));
}

export function fromOption<A>(
  opt: O.Option<A>
): StreamEither<T.NoEnv, T.NoErr, A> {
  return toS(S.stream.map(S.fromOption(opt), (a) => Ei.right(a)));
}

export function zipWithIndex<R, E, A>(
  stream: StreamEither<R, E, A>
): StreamEither<R, E, readonly [A, number]> {
  return toS(
    S.stream.map(S.zipWithIndex(fromS(stream)), (a) => {
      if (Ei.isLeft(a[0])) {
        return Ei.left(a[0].left);
      } else {
        return Ei.right([a[0].right, a[1]]);
      }
    })
  );
}

export function concatL<R, E, A, R2, E2>(
  stream1: StreamEither<R, E, A>,
  stream2: F.Lazy<StreamEither<R2, E2, A>>
): StreamEither<R & R2, E | E2, A> {
  return toS(S.stream.concatL(fromS(stream1), () => fromS(stream2()) as any));
}

export function concat<R, E, A, R2, E2>(
  stream1: StreamEither<R, E, A>,
  stream2: StreamEither<R2, E2, A>
): StreamEither<R & R2, E | E2, A> {
  return concatL(stream1, () => stream2);
}

export function repeat<R, E, A>(
  stream: StreamEither<R, E, A>
): StreamEither<R, E, A> {
  return toS(S.repeat(fromS(stream)));
}

export function as<R, E, A, B>(
  stream: StreamEither<R, E, A>,
  b: B
): StreamEither<R, E, B> {
  return map_(stream, (_) => b);
}

export function filter<R, E, A>(
  stream: StreamEither<R, E, A>,
  f: F.Predicate<A>,
  propagate = true
): StreamEither<R, E, A> {
  return toS(S.stream.filter(fromS(stream), getEitherP(f, propagate)));
}

export const getEitherP = <E, A>(
  p: F.Predicate<A>,
  propagate = true
): F.Predicate<Ei.Either<E, A>> => Ei.fold(() => propagate, p);

export function filterWith<A>(
  f: F.Predicate<A>,
  propagate = false
): <R, E>(stream: StreamEither<R, E, A>) => StreamEither<R, E, A> {
  return (stream) => filter(stream, f, propagate);
}

export function filterRefineWith<A, B extends A>(
  f: F.Refinement<A, B>,
  propagate = false
): <R, E>(stream: StreamEither<R, E, A>) => StreamEither<R, E, B> {
  return (stream) => filter(stream, f, propagate) as any;
}

export function takeWhile<R, E, A>(
  stream: StreamEither<R, E, A>,
  pred: F.Predicate<A>
): StreamEither<R, E, A> {
  return toS(
    S.stream.takeWhile(fromS(stream), (x) => Ei.isRight(x) && pred(x.right))
  );
}

export const URI = "matechs/StreamEither";
export type URI = typeof URI;
declare module "fp-ts/lib/HKT" {
  interface URItoKind3<R, E, A> {
    [URI]: StreamEither<R, E, A>;
  }
}

const mapLeft_ = <R, E, A, G>(fea: StreamEither<R, E, A>, f: (e: E) => G) =>
  chainError_(fea, (x) => encaseEffect(T.raiseError(f(x))));

export const streamEither: Monad3E<URI> &
  MonadThrow3E<URI> &
  B.Bifunctor3<URI> &
  Alt3E<URI> = {
  URI,
  map: map_,
  of: <R, E, A>(a: A): StreamEither<R, E, A> =>
    (S.once(Ei.right(a)) as any) as StreamEither<R, E, A>,
  ap: <R, R2, E, E2, A, B>(
    sfab: StreamEither<R, E, F.FunctionN<[A], B>>,
    sa: StreamEither<R2, E2, A>
  ) => zipWith(sfab, sa, (f, a) => f(a)),
  chain: chain_,
  throwError: <E>(e: E) => encaseEffect(T.raiseError(e)),
  mapLeft: mapLeft_,
  bimap: <R, E, A, G, B>(
    fea: StreamEither<R, E, A>,
    f: (e: E) => G,
    g: (a: A) => B
  ) => map_(mapLeft_(fea, f), g),
  alt: <R, R2, E, E2, A>(
    fx: StreamEither<R, E, A>,
    fy: () => StreamEither<R2, E2, A>
  ) => chainError_(fx, (_) => fy()),
} as const;

export const {
  ap,
  apFirst,
  apSecond,
  bimap,
  chainFirst,
  filterOrElse,
  flatten,
  fromEither,
  fromPredicate,
  mapLeft,
  chain,
  fromOption: fromOptionError,
  map,
  alt,
} = P.pipeable(streamEither);
