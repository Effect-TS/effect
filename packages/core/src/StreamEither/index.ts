import * as A from "../Array"
import type { CBifunctor4, CMonad4MA, CApplicative4MAP, Monad4MAP } from "../Base"
import * as AP from "../Base/Apply"
import * as D from "../Do"
import * as T from "../Effect"
import * as E from "../Either"
import * as F from "../Function"
import * as M from "../Managed"
import * as O from "../Option"
import * as RE from "../Record"
import * as Stream from "../Stream"
import { Managed, StreamEither, StreamEitherURI as URI } from "../Support/Common"
import * as TR from "../Tree"

type StreamEitherT<S, R, E, A> = Stream.Stream<S, R, never, E.Either<E, A>>

export type Async<A> = StreamEither<unknown, unknown, never, A>
export type AsyncE<E, A> = StreamEither<unknown, unknown, E, A>
export type AsyncR<R, A> = StreamEither<unknown, R, never, A>
export type AsyncRE<R, E, A> = StreamEither<unknown, R, E, A>

export type Sync<A> = StreamEither<never, unknown, never, A>
export type SyncE<E, A> = StreamEither<never, unknown, E, A>
export type SyncR<R, A> = StreamEither<never, R, never, A>
export type SyncRE<R, E, A> = StreamEither<never, R, E, A>

const toS = <S, R, E, A>(_: StreamEitherT<S, R, E, A>): StreamEither<S, R, E, A> =>
  _ as any
const fromS = <S, R, E, A>(_: StreamEither<S, R, E, A>): StreamEitherT<S, R, E, A> =>
  _ as any

export function encaseEffect<S, R, E, A>(
  eff: T.Effect<S, R, E, A>
): StreamEither<S, R, E, A> {
  return toS(
    Stream.encaseEffect(T.chainError_(T.map_(eff, E.right), (e) => T.pure(E.left(e))))
  )
}

export function encaseStream<S, R, E, A>(
  _: Stream.Stream<S, R, never, E.Either<E, A>>
): StreamEither<S, R, E, A> {
  return toS(_)
}

export function toStream<S, R, E, A>(
  _: StreamEither<S, R, E, A>
): Stream.Stream<S, R, never, E.Either<E, A>> {
  return fromS(_)
}

export function toStreamError<S, R, E, A>(
  _: StreamEither<S, R, E, A>
): Stream.Stream<S, R, E, A> {
  return Stream.chain_(fromS(_), (e) => {
    if (E.isLeft(e)) {
      return Stream.encaseEffect(T.raiseError(e.left))
    } else {
      return Stream.once(e.right)
    }
  })
}

export function chain_<S, R, E, A, S2, R2, E2, B>(
  str: StreamEither<S, R, E, A>,
  f: (a: A) => StreamEither<S2, R2, E2, B>
): StreamEither<S | S2, R & R2, E | E2, B> {
  return toS(
    Stream.chain_(fromS(str), (ea) =>
      fromS(E.isLeft(ea) ? (Stream.once(ea) as any) : f(ea.right))
    )
  )
}

export function chainError_<S, R, E, A, S2, R2, E2>(
  str: StreamEither<S, R, E, A>,
  f: (a: E) => StreamEither<S2, R2, E2, A>
): StreamEither<S | S2, R & R2, E2, A> {
  return toS(
    Stream.chain_(fromS(str), (ea) =>
      fromS(E.isRight(ea) ? Stream.of(ea) : (f(ea.left) as any))
    )
  )
}

export function chainError<S2, E, A, R2, E2>(
  f: (a: E) => StreamEither<S2, R2, E2, A>
): <S, R>(str: StreamEither<S, R, E, A>) => StreamEither<S | S2, R & R2, E2, A> {
  return <S, R>(str: StreamEither<S, R, E, A>) => chainError_(str, f)
}

export function of<S, R, E, A>(a: A): StreamEither<S, R, E, A> {
  return toS(Stream.of(E.right(a)))
}

export function pure<A>(a: A): StreamEither<never, unknown, never, A> {
  return toS(Stream.of(E.right(a)))
}

export function zipWith<S, R, E, A, S2, R2, E2, B, C>(
  as: StreamEither<S, R, E, A>,
  bs: StreamEither<S2, R2, E2, B>,
  f: F.FunctionN<[A, B], C>
): StreamEither<unknown, R & R2, E | E2, C> {
  return toS(
    Stream.zipWith_(
      fromS(as),
      fromS(bs),
      (ea, eb): E.Either<E | E2, C> => {
        if (E.isLeft(ea)) {
          return E.left(ea.left)
        } else if (E.isLeft(eb)) {
          return E.left(eb.left)
        } else {
          return E.right(f(ea.right, eb.right))
        }
      }
    )
  )
}

export function map_<S, R, E, A, B>(
  ma: StreamEither<S, R, E, A>,
  f: (a: A) => B
): StreamEither<S, R, E, B> {
  return toS(
    Stream.map_(fromS(ma), (ea) => {
      if (E.isLeft(ea)) {
        return E.left(ea.left)
      } else {
        return E.right(f(ea.right))
      }
    })
  )
}

export function collectArray<S, R, E, A>(
  stream: StreamEither<S, R, E, A>
): T.Effect<S, R, E, A[]> {
  return Stream.collectArray(toStreamError(stream))
}

export function take<S, R, E, A>(
  stream: StreamEither<S, R, E, A>,
  n: number
): StreamEither<S, R, E, A> {
  return toS(Stream.take_(fromS(stream), n))
}

export function drain<S, R, E, A>(
  stream: StreamEither<S, R, E, A>
): T.Effect<S, R, E, void> {
  return Stream.drain(toStreamError(stream))
}

export function fromSource<S, R, E, S2, R2, E2, A>(
  r: Managed<S, R, never, T.Effect<S2, R2, E2, O.Option<A>>>
): StreamEither<S | S2, R & R2, E | E2, A> {
  return toS(
    Stream.fromSource(
      M.map_(r, (e) =>
        T.chainError_(
          T.map_(e, (oa) => O.map_(oa, E.rightW)),
          (e) => T.pure(O.some(E.leftW(e)))
        )
      )
    )
  )
}

export function fromArray<A>(as: readonly A[]): StreamEither<never, unknown, never, A> {
  return toS(Stream.map_(Stream.fromArray(as), (a) => E.right(a)))
}

export function fromIterator<A>(
  iter: F.Lazy<Iterator<A>>
): StreamEither<never, unknown, never, A> {
  return toS(Stream.map_(Stream.fromIterator(iter), (a) => E.right(a)))
}

export function fromRange(
  start: number,
  interval?: number,
  end?: number
): StreamEither<never, unknown, never, number> {
  return toS(Stream.map_(Stream.fromRange(start, interval, end), (a) => E.right(a)))
}

export function fromIteratorUnsafe<A>(
  iter: Iterator<A>
): StreamEither<never, unknown, never, A> {
  return toS(Stream.map_(Stream.fromIteratorUnsafe(iter), (a) => E.right(a)))
}

export function once<A>(a: A): StreamEither<never, unknown, never, A> {
  return toS(Stream.map_(Stream.once(a), (a) => E.right(a)))
}

export function repeatedly<A>(a: A): StreamEither<unknown, unknown, never, A> {
  return toS(Stream.map_(Stream.repeatedly(a), (a) => E.right(a)))
}

export function periodically(
  ms: number
): StreamEither<unknown, unknown, never, number> {
  return toS(Stream.map_(Stream.periodically(ms), (a) => E.right(a)))
}

export const empty: StreamEither<never, unknown, never, never> = Stream.empty as any

export function raised<E>(e: E): StreamEither<never, unknown, E, never> {
  return toS(Stream.once(E.left(e)))
}

export function aborted(e: unknown): StreamEither<never, unknown, never, never> {
  return toS(Stream.map_(Stream.aborted(e), (a) => E.right(a)))
}

export function fromOption<A>(
  opt: O.Option<A>
): StreamEither<never, unknown, never, A> {
  return toS(Stream.map_(Stream.fromOption(opt), (a) => E.right(a)))
}

export function zipWithIndex<S, R, E, A>(
  stream: StreamEither<S, R, E, A>
): StreamEither<unknown, R, E, readonly [A, number]> {
  return toS(
    Stream.map_(Stream.zipWithIndex(fromS(stream)), (a) => {
      if (E.isLeft(a[0])) {
        return E.left(a[0].left)
      } else {
        return E.right([a[0].right, a[1]])
      }
    })
  )
}

export function concatL<S, R, E, A, S2, R2, E2>(
  stream1: StreamEither<S, R, E, A>,
  stream2: F.Lazy<StreamEither<S2, R2, E2, A>>
): StreamEither<S | S2, R & R2, E | E2, A> {
  return toS(Stream.concatL_(fromS(stream1), () => fromS(stream2()) as any))
}

export function concat<S, R, E, A, S2, R2, E2>(
  stream1: StreamEither<S, R, E, A>,
  stream2: StreamEither<S2, R2, E2, A>
): StreamEither<S | S2, R & R2, E | E2, A> {
  return concatL(stream1, () => stream2)
}

export function repeat<S, R, E, A>(
  stream: StreamEither<S, R, E, A>
): StreamEither<S, R, E, A> {
  return toS(Stream.repeat(fromS(stream)))
}

export function as<S, R, E, A, B>(
  stream: StreamEither<S, R, E, A>,
  b: B
): StreamEither<S, R, E, B> {
  return map_(stream, (_) => b)
}

export function filter<S, R, E, A, B extends A>(
  stream: StreamEither<S, R, E, A>,
  f: F.Refinement<A, B>,
  propagate?: boolean
): StreamEither<S, R, E, B>
export function filter<S, R, E, A>(
  stream: StreamEither<S, R, E, A>,
  f: F.Predicate<A>,
  propagate?: boolean
): StreamEither<S, R, E, A>
export function filter<S, R, E, A>(
  stream: StreamEither<S, R, E, A>,
  f: F.Predicate<A>,
  propagate = true
) {
  return toS(Stream.filter_(fromS(stream), getEitherP(f, propagate)))
}

export const getEitherP = <E, A>(
  p: F.Predicate<A>,
  propagate = true
): F.Predicate<E.Either<E, A>> => E.fold(() => propagate, p)

export function filterWith<A, B extends A>(
  f: F.Refinement<A, B>,
  propagate?: boolean
): <S, R, E>(stream: StreamEither<S, R, E, A>) => StreamEither<S, R, E, A>
export function filterWith<A>(
  f: F.Predicate<A>,
  propagate?: boolean
): <S, R, E>(stream: StreamEither<S, R, E, A>) => StreamEither<S, R, E, A>
export function filterWith<A>(
  f: F.Predicate<A>,
  propagate = false
): <S, R, E>(stream: StreamEither<S, R, E, A>) => StreamEither<S, R, E, A> {
  return (stream) => filter(stream, f, propagate)
}

export function filteRefineWith<A, B extends A>(
  f: F.Refinement<A, B>,
  propagate = false
): <S, R, E>(stream: StreamEither<S, R, E, A>) => StreamEither<S, R, E, B> {
  return (stream) => filter(stream, f, propagate) as any
}

export function takeWhile<S, R, E, A>(
  stream: StreamEither<S, R, E, A>,
  pred: F.Predicate<A>
): StreamEither<S, R, E, A> {
  return toS(Stream.takeWhile_(fromS(stream), (x) => E.isRight(x) && pred(x.right)))
}

export const mapLeft_ = <S, R, E, A, G>(
  fea: StreamEither<S, R, E, A>,
  f: (e: E) => G
) => chainError_(fea, (x) => encaseEffect(T.raiseError(f(x))))

export const ap_ = <S1, S2, R, R2, E, E2, A, B>(
  sfab: StreamEither<S1, R, E, F.FunctionN<[A], B>>,
  sa: StreamEither<S2, R2, E2, A>
) => zipWith(sfab, sa, (f, a) => f(a))

export const throwError = <E>(e: E) => encaseEffect(T.raiseError(e))

export const bimap_ = <S, R, E, A, G, B>(
  fea: StreamEither<S, R, E, A>,
  f: (e: E) => G,
  g: (a: A) => B
) => map_(mapLeft_(fea, f), g)

export const ap: <S1, R, E, A>(
  fa: StreamEither<S1, R, E, A>
) => <S2, R2, E2, B>(
  fab: StreamEither<S2, R2, E2, (a: A) => B>
) => StreamEither<unknown, R & R2, E | E2, B> = (fa) => (fab) => ap_(fab, fa)

export const apFirst: <S1, R, E, B>(
  fb: StreamEither<S1, R, E, B>
) => <A, S2, R2, E2>(
  fa: StreamEither<S2, R2, E2, A>
) => StreamEither<unknown, R & R2, E | E2, A> = (fb) => (fa) =>
  ap_(
    map_(fa, (a) => () => a),
    fb
  )

export const apSecond = <S1, R, E, B>(fb: StreamEither<S1, R, E, B>) => <A, S2, R2, E2>(
  fa: StreamEither<S2, R2, E2, A>
): StreamEither<unknown, R & R2, E | E2, B> =>
  ap_(
    map_(fa, () => (b: B) => b),
    fb
  )

export const bimap: <E, G, A, B>(
  f: (e: E) => G,
  g: (a: A) => B
) => <S, R>(fa: StreamEither<S, R, E, A>) => StreamEither<S, R, G, B> = (f, g) => (
  fa
) => bimap_(fa, f, g)

export const chain: <S1, R, E, A, B>(
  f: (a: A) => StreamEither<S1, R, E, B>
) => <S2, R2, E2>(
  ma: StreamEither<S2, R2, E2, A>
) => StreamEither<S1 | S2, R & R2, E | E2, B> = (f) => (fa) => chain_(fa, f)

export const chainTap: <S1, R, E, A, B>(
  f: (a: A) => StreamEither<S1, R, E, B>
) => <S2, R2, E2>(
  ma: StreamEither<S2, R2, E2, A>
) => StreamEither<S1 | S2, R & R2, E | E2, A> = (f) => (ma) =>
  chain_(ma, (x) => map_(f(x), () => x))

export const chainTap_: <S1, R, E, A, B, S2, R2, E2>(
  ma: StreamEither<S2, R2, E2, A>,
  f: (a: A) => StreamEither<S1, R, E, B>
) => StreamEither<S1 | S2, R & R2, E | E2, A> = (ma, f) =>
  chain_(ma, (x) => map_(f(x), () => x))

export const flatten: <S1, S2, R, E, R2, E2, A>(
  mma: StreamEither<S1, R, E, StreamEither<S2, R2, E2, A>>
) => StreamEither<S1 | S2, R & R2, E | E2, A> = (mma) => chain_(mma, (x) => x)

export const map: <A, B>(
  f: (a: A) => B
) => <S, R, E>(fa: StreamEither<S, R, E, A>) => StreamEither<S, R, E, B> = (f) => (
  ma
) => map_(ma, f)

export const mapLeft: <E, G>(
  f: (e: E) => G
) => <S, R, A>(fa: StreamEither<S, R, E, A>) => StreamEither<S, R, G, A> = (f) => (
  fa
) => mapLeft_(fa, f)

export const streamEither: CMonad4MA<URI> & CBifunctor4<URI> & CApplicative4MAP<URI> = {
  URI,
  _CTX: "async",
  map,
  of,
  ap,
  chain,
  mapLeft,
  bimap
}

export type Ret<H> = T.Ret<H>
export type Env<H> = T.Env<H>
export type Err<H> = T.Err<H>
export type Op<H> = T.Op<H>
export type Compact<H> = T.Compact<H>

/**
 * Used to merge types of the form StreamEither<S, R, E, A> | StreamEither<S2, R2, E2, A2> into StreamEither<S | S2, R & R2, E | E2, A | A2>
 * @param _
 */
export function compact<H extends StreamEither<any, any, any, any>>(_: H): Compact<H> {
  return _ as any
}

export function compactF<
  ARG extends unknown[],
  H extends StreamEither<any, any, any, any>
>(_: (..._: ARG) => H): (..._: ARG) => Compact<H> {
  return _ as any
}

// region classic
export const Do = () => D.Do(streamEither)

export const sequenceS =
  /*#__PURE__*/
  (() => AP.sequenceS(streamEither))()

export const sequenceT =
  /*#__PURE__*/
  (() => AP.sequenceT(streamEither))()

export const sequenceArray =
  /*#__PURE__*/
  (() => A.sequence(streamEither))()

export const sequenceRecord =
  /*#__PURE__*/
  (() => RE.sequence(streamEither))()

export const sequenceTree =
  /*#__PURE__*/
  (() => TR.sequence(streamEither))()

export const sequenceOption =
  /*#__PURE__*/
  (() => O.sequence(streamEither))()

export const sequenceEither =
  /*#__PURE__*/
  (() => E.sequence(streamEither))()

export const traverseArray =
  /*#__PURE__*/
  (() => A.traverse(streamEither))()

export const traverseRecord =
  /*#__PURE__*/
  (() => RE.traverse(streamEither))()

export const traverseTree =
  /*#__PURE__*/
  (() => TR.traverse(streamEither))()

export const traverseOption =
  /*#__PURE__*/
  (() => O.traverse(streamEither))()

export const traverseEither =
  /*#__PURE__*/
  (() => E.traverse(streamEither))()

export const traverseArrayWI =
  /*#__PURE__*/
  (() => A.traverseWithIndex(streamEither))()

export const traverseRecordWI =
  /*#__PURE__*/
  (() => RE.traverseWithIndex(streamEither))()

export const witherArray =
  /*#__PURE__*/
  (() => A.wither(streamEither))()

export const witherArray_ =
  /*#__PURE__*/
  (() => A.wither_(streamEither))()

export const witherRecord =
  /*#__PURE__*/
  (() => RE.wither(streamEither))()

export const witherRecord_ =
  /*#__PURE__*/
  (() => RE.wither_(streamEither))()

export const witherOption =
  /*#__PURE__*/
  (() => O.wither(streamEither))()

export const witherOption_ =
  /*#__PURE__*/
  (() => O.wither_(streamEither))()

export const wiltArray_ =
  /*#__PURE__*/
  (() => A.wilt_(streamEither))()

export const wiltRecord =
  /*#__PURE__*/
  (() => RE.wilt(streamEither))()

export const wiltRecord_ =
  /*#__PURE__*/
  (() => RE.wilt_(streamEither))()

export const wiltOption =
  /*#__PURE__*/
  (() => O.wilt(streamEither))()

export const wiltOption_ =
  /*#__PURE__*/
  (() => O.wilt_(streamEither))()

//
// Compatibility with fp-ts ecosystem
//

export const streamEither_: Monad4MAP<URI> = {
  URI,
  _CTX: "async",
  map: map_,
  of,
  ap: ap_,
  chain: chain_
}
