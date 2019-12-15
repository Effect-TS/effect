import * as T from "../effect";
import * as M from "../managed";
import * as S from "../stream";
import * as Ei from "fp-ts/lib/Either";
import * as O from "fp-ts/lib/Option";
import { FunctionN, Lazy, Predicate, Refinement } from "fp-ts/lib/function";
import { Monad3E } from "../overload";

// alpha version exposed for exeperimentation purposes
/* istanbul ignore file */

export type StreamEither<R, E, A> = S.Stream<R, never, Ei.Either<E, A>>;

export function encaseEffect<R, E, A>(
  eff: T.Effect<R, E, A>
): StreamEither<R, E, A> {
  return S.encaseEffect(
    T.effect.chainError(T.effect.map(eff, Ei.right), e => T.pure(Ei.left(e)))
  );
}

export function chain_<R, E, A, R2, E2, B>(
  str: StreamEither<R, E, A>,
  f: (a: A) => StreamEither<R2, E2, B>
): StreamEither<R & R2, E | E2, B> {
  return S.stream.chain((str as any) as StreamEither<R & R2, E | E2, A>, ea =>
    Ei.isLeft(ea) ? (S.stream.of(ea) as any) : f(ea.right)
  );
}

export function chain<A, R2, E2, B>(
  f: FunctionN<[A], StreamEither<R2, E2, B>>
): <R, E>(stream: StreamEither<R, E, A>) => StreamEither<R & R2, E | E2, B> {
  return s => chain_(s, f);
}

export function chainError_<R, E, A, R2, E2>(
  str: StreamEither<R, E, A>,
  f: (a: E) => StreamEither<R2, E2, A>
): StreamEither<R & R2, E2, A> {
  return S.stream.chain((str as any) as StreamEither<R & R2, E, A>, ea =>
    Ei.isRight(ea)
      ? S.stream.of<R & R2, never, Ei.Either<E | E2, A>>(ea)
      : (f(ea.left) as any)
  );
}

export function chainError<E, A, R2, E2>(
  f: (a: E) => StreamEither<R2, E2, A>
): <R>(str: StreamEither<R, E, A>) => StreamEither<R & R2, E2, A> {
  return <R>(str: StreamEither<R, E, A>) => chainError_(str, f);
}

export function of_<R, E, A>(a: A): StreamEither<R, E, A> {
  return S.stream.of(Ei.right(a));
}

export function zipWith<R, E, A, R2, E2, B, C>(
  as: StreamEither<R, E, A>,
  bs: StreamEither<R2, E2, B>,
  f: FunctionN<[A, B], C>
): StreamEither<R & R2, E | E2, C> {
  return S.zipWith(as, bs, (ea, eb) => {
    if (Ei.isLeft(ea)) {
      return Ei.left(ea.left);
    } else if (Ei.isLeft(eb)) {
      return Ei.left(eb.left);
    } else {
      return Ei.right(f(ea.right, eb.right));
    }
  });
}

export function map_<R, E, A, B>(
  ma: StreamEither<R, E, A>,
  f: (a: A) => B
): StreamEither<R, E, B> {
  return S.stream.map(ma, ea => {
    if (Ei.isLeft(ea)) {
      return Ei.left(ea.left);
    } else {
      return Ei.right(f(ea.right));
    }
  });
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
  return S.take(stream, n);
}

export function toStream<R, E, A>(
  stream: StreamEither<R, E, A>
): S.Stream<R, E, A> {
  return S.stream.chain(stream, e => {
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
  return S.fromSource(
    M.managed.map(r, e =>
      T.effect.chainError(
        T.effect.map(e, oa => O.option.map(oa, Ei.right)),
        e => T.pure(O.some(Ei.left(e)))
      )
    )
  );
}

export function fromArray<A>(
  as: readonly A[]
): StreamEither<T.NoEnv, T.NoErr, A> {
  return S.stream.map(S.fromArray(as), a => Ei.right(a));
}

export function fromIterator<A>(
  iter: Lazy<Iterator<A>>
): StreamEither<T.NoEnv, T.NoErr, A> {
  return S.stream.map(S.fromIterator(iter), a => Ei.right(a));
}

export function fromRange(
  start: number,
  interval?: number,
  end?: number
): StreamEither<T.NoEnv, T.NoErr, number> {
  return S.stream.map(S.fromRange(start, interval, end), a => Ei.right(a));
}

export function fromIteratorUnsafe<A>(
  iter: Iterator<A>
): StreamEither<T.NoEnv, T.NoErr, A> {
  return S.stream.map(S.fromIteratorUnsafe(iter), a => Ei.right(a));
}

export function once<A>(a: A): StreamEither<T.NoEnv, T.NoErr, A> {
  return S.stream.map(S.once(a), a => Ei.right(a));
}

export function repeatedly<A>(a: A): StreamEither<T.NoEnv, T.NoErr, A> {
  return S.stream.map(S.repeatedly(a), a => Ei.right(a));
}

export function periodically(
  ms: number
): StreamEither<T.NoEnv, T.NoErr, number> {
  return S.stream.map(S.periodically(ms), a => Ei.right(a));
}

export const empty: StreamEither<T.NoEnv, T.NoErr, never> = S.empty as any;

export function raised<E>(e: E): StreamEither<T.NoEnv, E, never> {
  return S.once(Ei.left(e));
}

export function aborted(e: unknown): StreamEither<T.NoEnv, T.NoErr, never> {
  return S.stream.map(S.aborted(e), a => Ei.right(a));
}

export function fromOption<A>(
  opt: O.Option<A>
): StreamEither<T.NoEnv, T.NoErr, A> {
  return S.stream.map(S.fromOption(opt), a => Ei.right(a));
}

export function zipWithIndex<R, E, A>(
  stream: StreamEither<R, E, A>
): StreamEither<R, E, readonly [A, number]> {
  return S.stream.map(S.zipWithIndex(stream), a => {
    if (Ei.isLeft(a[0])) {
      return Ei.left(a[0].left);
    } else {
      return Ei.right([a[0].right, a[1]]);
    }
  });
}

export function concatL<R, E, A, R2, E2>(
  stream1: StreamEither<R, E, A>,
  stream2: Lazy<StreamEither<R2, E2, A>>
): StreamEither<R & R2, E | E2, A> {
  return S.concatL(stream1, stream2 as any) as any;
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
  return S.repeat(stream);
}

export function map<R, A, B>(
  f: FunctionN<[A], B>
): <E>(stream: StreamEither<R, E, A>) => StreamEither<R, E, B> {
  return stream => map_(stream, f);
}

export function as<R, E, A, B>(
  stream: StreamEither<R, E, A>,
  b: B
): StreamEither<R, E, B> {
  return map_(stream, _ => b);
}

export function filter<R, E, A>(
  stream: StreamEither<R, E, A>,
  f: Predicate<A>,
  propagate = true
): StreamEither<R, E, A> {
  return S.filter(stream, getEitherP(f, propagate));
}

export const getEitherP = <E, A>(
  p: Predicate<A>,
  propagate = true
): Predicate<Ei.Either<E, A>> => Ei.fold(() => propagate, p);

export function filterWith<A>(
  f: Predicate<A>,
  propagate = false
): <R, E>(stream: StreamEither<R, E, A>) => StreamEither<R, E, A> {
  return stream => filter(stream, f, propagate);
}

export function filterRefineWith<A, B extends A>(
  f: Refinement<A, B>,
  propagate = false
): <R, E>(stream: StreamEither<R, E, A>) => StreamEither<R, E, B> {
  return stream => filter(stream, f, propagate) as any;
}

export function takeWhile<R, E, A>(
  stream: StreamEither<R, E, A>,
  pred: Predicate<A>
): StreamEither<R, E, A> {
  return S.takeWhile(stream, x => Ei.isRight(x) && pred(x.right));
}

export const URI = "matechs/StreamEither";
export type URI = typeof URI;
declare module "fp-ts/lib/HKT" {
  interface URItoKind3<R, E, A> {
    [URI]: StreamEither<R, E, A>;
  }
}

export const streamEither: Monad3E<URI> = {
  URI,
  map: map_,
  of: <R, E, A>(a: A): StreamEither<R, E, A> =>
    (S.once(Ei.right(a)) as any) as StreamEither<R, E, A>,
  ap: <R, R2, E, E2, A, B>(
    sfab: StreamEither<R, E, FunctionN<[A], B>>,
    sa: StreamEither<R2, E2, A>
  ) => zipWith(sfab, sa, (f, a) => f(a)),
  chain: chain_
} as const;
