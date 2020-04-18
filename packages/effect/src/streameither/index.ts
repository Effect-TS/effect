import * as T from "../effect";
import * as M from "../managed";
import * as S from "../stream";
import {
  option as O,
  either as Ei,
  function as F,
  bifunctor as B,
  pipeable as P,
  array as A,
  tree as TR
} from "fp-ts";
import { Do as DoG } from "fp-ts-contrib/lib/Do";
import { sequenceS as SS, sequenceT as ST } from "fp-ts/lib/Apply";
import { Separated } from "fp-ts/lib/Compactable";
import { Monad4EP, MonadThrow4EP } from "../overloadEff";

// alpha version exposed for exeperimentation purposes
/* istanbul ignore file */

type StreamEitherT<S, R, E, A> = S.Stream<S, R, never, Ei.Either<E, A>>;

export interface StreamEither<S, R, E, A> {
  _TAG: () => "StreamEither";
  _E: () => E;
  _A: () => A;
  _S: () => S;
  _R: (_: R) => void;
}

export type Async<A> = StreamEither<unknown, unknown, never, A>;
export type AsyncE<E, A> = StreamEither<unknown, unknown, E, A>;
export type AsyncR<R, A> = StreamEither<unknown, R, never, A>;
export type AsyncRE<R, E, A> = StreamEither<unknown, R, E, A>;

export type Sync<A> = StreamEither<never, unknown, never, A>;
export type SyncE<E, A> = StreamEither<never, unknown, E, A>;
export type SyncR<R, A> = StreamEither<never, R, never, A>;
export type SyncRE<R, E, A> = StreamEither<never, R, E, A>;

const toS = <S, R, E, A>(_: StreamEitherT<S, R, E, A>): StreamEither<S, R, E, A> => _ as any;
const fromS = <S, R, E, A>(_: StreamEither<S, R, E, A>): StreamEitherT<S, R, E, A> => _ as any;

export function encaseEffect<S, R, E, A>(eff: T.Effect<S, R, E, A>): StreamEither<S, R, E, A> {
  return toS(
    S.encaseEffect(T.effect.chainError(T.effect.map(eff, Ei.right), (e) => T.pure(Ei.left(e))))
  );
}

export function encaseStream<S, R, E, A>(
  _: S.Stream<S, R, never, Ei.Either<E, A>>
): StreamEither<S, R, E, A> {
  return toS(_);
}

export function toStream<S, R, E, A>(
  _: StreamEither<S, R, E, A>
): S.Stream<S, R, never, Ei.Either<E, A>> {
  return fromS(_);
}

export function toStreamError<S, R, E, A>(_: StreamEither<S, R, E, A>): S.Stream<S, R, E, A> {
  return S.stream.chain(fromS(_), (e) => {
    if (Ei.isLeft(e)) {
      return S.encaseEffect<S, R, E, A>(T.raiseError(e.left));
    } else {
      return S.stream.of<S, R, E, A>(e.right);
    }
  });
}

function chain_<S, R, E, A, S2, R2, E2, B>(
  str: StreamEither<S, R, E, A>,
  f: (a: A) => StreamEither<S2, R2, E2, B>
): StreamEither<S | S2, R & R2, E | E2, B> {
  return toS(
    S.stream.chain(fromS(str), (ea) =>
      fromS(Ei.isLeft(ea) ? (S.stream.of(ea) as any) : f(ea.right))
    )
  );
}

function chainError_<S, R, E, A, S2, R2, E2>(
  str: StreamEither<S, R, E, A>,
  f: (a: E) => StreamEither<S2, R2, E2, A>
): StreamEither<S | S2, R & R2, E2, A> {
  return toS(
    S.stream.chain(fromS(str), (ea) =>
      fromS(Ei.isRight(ea) ? S.stream.of(ea) : (f(ea.left) as any))
    )
  );
}

export function chainError<S2, E, A, R2, E2>(
  f: (a: E) => StreamEither<S2, R2, E2, A>
): <S, R>(str: StreamEither<S, R, E, A>) => StreamEither<S | S2, R & R2, E2, A> {
  return <S, R>(str: StreamEither<S, R, E, A>) => chainError_(str, f);
}

export function of<S, R, E, A>(a: A): StreamEither<S, R, E, A> {
  return toS(S.stream.of(Ei.right(a)));
}

export function pure<A>(a: A): StreamEither<never, unknown, never, A> {
  return toS(S.stream.of(Ei.right(a)));
}

export function zipWith<S, R, E, A, S2, R2, E2, B, C>(
  as: StreamEither<S, R, E, A>,
  bs: StreamEither<S2, R2, E2, B>,
  f: F.FunctionN<[A, B], C>
): StreamEither<unknown, R & R2, E | E2, C> {
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

function map_<S, R, E, A, B>(
  ma: StreamEither<S, R, E, A>,
  f: (a: A) => B
): StreamEither<S, R, E, B> {
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

export function collectArray<S, R, E, A>(stream: StreamEither<S, R, E, A>): T.Effect<S, R, E, A[]> {
  return S.collectArray(toStreamError(stream));
}

export function take<S, R, E, A>(
  stream: StreamEither<S, R, E, A>,
  n: number
): StreamEither<S, R, E, A> {
  return toS(S.stream.take(fromS(stream), n));
}

export function drain<S, R, E, A>(stream: StreamEither<S, R, E, A>): T.Effect<S, R, E, void> {
  return S.drain(toStreamError(stream));
}

export function fromSource<S, R, E, S2, R2, E2, A>(
  r: M.Managed<S, R, never, T.Effect<S2, R2, E2, O.Option<A>>>
): StreamEither<S | S2, R & R2, E | E2, A> {
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

export function fromArray<A>(as: readonly A[]): StreamEither<never, unknown, never, A> {
  return toS(S.stream.map(S.fromArray(as), (a) => Ei.right(a)));
}

export function fromIterator<A>(iter: F.Lazy<Iterator<A>>): StreamEither<never, unknown, never, A> {
  return toS(S.stream.map(S.fromIterator(iter), (a) => Ei.right(a)));
}

export function fromRange(
  start: number,
  interval?: number,
  end?: number
): StreamEither<never, unknown, never, number> {
  return toS(S.stream.map(S.fromRange(start, interval, end), (a) => Ei.right(a)));
}

export function fromIteratorUnsafe<A>(iter: Iterator<A>): StreamEither<never, unknown, never, A> {
  return toS(S.stream.map(S.fromIteratorUnsafe(iter), (a) => Ei.right(a)));
}

export function once<A>(a: A): StreamEither<never, unknown, never, A> {
  return toS(S.stream.map(S.once(a), (a) => Ei.right(a)));
}

export function repeatedly<A>(a: A): StreamEither<unknown, unknown, never, A> {
  return toS(S.stream.map(S.repeatedly(a), (a) => Ei.right(a)));
}

export function periodically(ms: number): StreamEither<unknown, unknown, never, number> {
  return toS(S.stream.map(S.periodically(ms), (a) => Ei.right(a)));
}

export const empty: StreamEither<never, unknown, never, never> = S.empty as any;

export function raised<E>(e: E): StreamEither<never, unknown, E, never> {
  return toS(S.once(Ei.left(e)));
}

export function aborted(e: unknown): StreamEither<never, unknown, never, never> {
  return toS(S.stream.map(S.aborted(e), (a) => Ei.right(a)));
}

export function fromOption<A>(opt: O.Option<A>): StreamEither<never, unknown, never, A> {
  return toS(S.stream.map(S.fromOption(opt), (a) => Ei.right(a)));
}

export function zipWithIndex<S, R, E, A>(
  stream: StreamEither<S, R, E, A>
): StreamEither<unknown, R, E, readonly [A, number]> {
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

export function concatL<S, R, E, A, S2, R2, E2>(
  stream1: StreamEither<S, R, E, A>,
  stream2: F.Lazy<StreamEither<S2, R2, E2, A>>
): StreamEither<S | S2, R & R2, E | E2, A> {
  return toS(S.stream.concatL(fromS(stream1), () => fromS(stream2()) as any));
}

export function concat<S, R, E, A, S2, R2, E2>(
  stream1: StreamEither<S, R, E, A>,
  stream2: StreamEither<S2, R2, E2, A>
): StreamEither<S | S2, R & R2, E | E2, A> {
  return concatL(stream1, () => stream2);
}

export function repeat<S, R, E, A>(stream: StreamEither<S, R, E, A>): StreamEither<S, R, E, A> {
  return toS(S.repeat(fromS(stream)));
}

export function as<S, R, E, A, B>(
  stream: StreamEither<S, R, E, A>,
  b: B
): StreamEither<S, R, E, B> {
  return map_(stream, (_) => b);
}

export function filter<S, R, E, A, B extends A>(
  stream: StreamEither<S, R, E, A>,
  f: F.Refinement<A, B>,
  propagate?: boolean
): StreamEither<S, R, E, B>;
export function filter<S, R, E, A>(
  stream: StreamEither<S, R, E, A>,
  f: F.Predicate<A>,
  propagate?: boolean
): StreamEither<S, R, E, A>;
export function filter<S, R, E, A>(
  stream: StreamEither<S, R, E, A>,
  f: F.Predicate<A>,
  propagate = true
) {
  return toS(S.stream.filter(fromS(stream), getEitherP(f, propagate)));
}

export const getEitherP = <E, A>(
  p: F.Predicate<A>,
  propagate = true
): F.Predicate<Ei.Either<E, A>> => Ei.fold(() => propagate, p);

export function filterWith<A, B extends A>(
  f: F.Refinement<A, B>,
  propagate?: boolean
): <S, R, E>(stream: StreamEither<S, R, E, A>) => StreamEither<S, R, E, A>;
export function filterWith<A>(
  f: F.Predicate<A>,
  propagate?: boolean
): <S, R, E>(stream: StreamEither<S, R, E, A>) => StreamEither<S, R, E, A>;
export function filterWith<A>(
  f: F.Predicate<A>,
  propagate = false
): <S, R, E>(stream: StreamEither<S, R, E, A>) => StreamEither<S, R, E, A> {
  return (stream) => filter(stream, f, propagate);
}

export function filteRefineWith<A, B extends A>(
  f: F.Refinement<A, B>,
  propagate = false
): <S, R, E>(stream: StreamEither<S, R, E, A>) => StreamEither<S, R, E, B> {
  return (stream) => filter(stream, f, propagate) as any;
}

export function takeWhile<S, R, E, A>(
  stream: StreamEither<S, R, E, A>,
  pred: F.Predicate<A>
): StreamEither<S, R, E, A> {
  return toS(S.stream.takeWhile(fromS(stream), (x) => Ei.isRight(x) && pred(x.right)));
}

export const URI = "matechs/StreamEither";
export type URI = typeof URI;
declare module "fp-ts/lib/HKT" {
  interface URItoKind4<S, R, E, A> {
    [URI]: StreamEither<S, R, E, A>;
  }
}

const mapLeft_ = <S, R, E, A, G>(fea: StreamEither<S, R, E, A>, f: (e: E) => G) =>
  chainError_(fea, (x) => encaseEffect(T.raiseError(f(x))));

export const streamEither: Monad4EP<URI> & MonadThrow4EP<URI> & B.Bifunctor4<URI> = {
  URI,
  _CTX: "async",
  map: map_,
  of: <S, R, E, A>(a: A): StreamEither<S, R, E, A> =>
    (S.once(Ei.right(a)) as any) as StreamEither<S, R, E, A>,
  ap: <S1, S2, R, R2, E, E2, A, B>(
    sfab: StreamEither<S1, R, E, F.FunctionN<[A], B>>,
    sa: StreamEither<S2, R2, E2, A>
  ) => zipWith(sfab, sa, (f, a) => f(a)),
  chain: chain_,
  throwError: <E>(e: E) => encaseEffect(T.raiseError(e)),
  mapLeft: mapLeft_,
  bimap: <S, R, E, A, G, B>(fea: StreamEither<S, R, E, A>, f: (e: E) => G, g: (a: A) => B) =>
    map_(mapLeft_(fea, f), g)
};

export const {
  ap,
  apFirst,
  apSecond,
  bimap,
  chainFirst,
  flatten,
  mapLeft,
  chain,
  map
} = P.pipeable(streamEither);

export const Do = () => DoG(streamEither);
export const sequenceS = SS(streamEither);
export const sequenceT = ST(streamEither);

export const sequenceOption = O.option.sequence(streamEither);

export const traverseOption: <S, A, R, E, B>(
  f: (a: A) => StreamEither<S, R, E, B>
) => (ta: O.Option<A>) => StreamEither<unknown, R, E, O.Option<B>> = (f) => (ta) =>
  O.option.traverse(streamEither)(ta, f);

export const wiltOption: <S, A, R, E, B, C>(
  f: (a: A) => StreamEither<S, R, E, Ei.Either<B, C>>
) => (wa: O.Option<A>) => StreamEither<unknown, R, E, Separated<O.Option<B>, O.Option<C>>> = (
  f
) => (wa) => O.option.wilt(streamEither)(wa, f);

export const witherOption: <S, A, R, E, B>(
  f: (a: A) => StreamEither<S, R, E, O.Option<B>>
) => (ta: O.Option<A>) => StreamEither<unknown, R, E, O.Option<B>> = (f) => (ta) =>
  O.option.wither(streamEither)(ta, f);

export const sequenceEither = Ei.either.sequence(streamEither);

export const traverseEither: <S, A, R, FE, B>(
  f: (a: A) => StreamEither<S, R, FE, B>
) => <TE>(ta: Ei.Either<TE, A>) => StreamEither<unknown, R, FE, Ei.Either<TE, B>> = (f) => (ta) =>
  Ei.either.traverse(streamEither)(ta, f);

export const sequenceTree = TR.tree.sequence(streamEither);

export const traverseTree: <S, A, R, E, B>(
  f: (a: A) => StreamEither<S, R, E, B>
) => (ta: TR.Tree<A>) => StreamEither<unknown, R, E, TR.Tree<B>> = (f) => (ta) =>
  TR.tree.traverse(streamEither)(ta, f);

export const sequenceArray = A.array.sequence(streamEither);

export const traverseArray: <S, A, R, E, B>(
  f: (a: A) => StreamEither<S, R, E, B>
) => (ta: Array<A>) => StreamEither<unknown, R, E, Array<B>> = (f) => (ta) =>
  A.array.traverse(streamEither)(ta, f);

export const traverseArrayWithIndex: <S, A, R, E, B>(
  f: (i: number, a: A) => StreamEither<S, R, E, B>
) => (ta: Array<A>) => StreamEither<unknown, R, E, Array<B>> = (f) => (ta) =>
  A.array.traverseWithIndex(streamEither)(ta, f);

export const wiltArray: <S, A, R, E, B, C>(
  f: (a: A) => StreamEither<S, R, E, Ei.Either<B, C>>
) => (wa: Array<A>) => StreamEither<unknown, R, E, Separated<Array<B>, Array<C>>> = (f) => (wa) =>
  A.array.wilt(streamEither)(wa, f);

export const witherArray: <S, A, R, E, B>(
  f: (a: A) => StreamEither<S, R, E, O.Option<B>>
) => (ta: Array<A>) => StreamEither<unknown, R, E, Array<B>> = (f) => (ta) =>
  A.array.wither(streamEither)(ta, f);
