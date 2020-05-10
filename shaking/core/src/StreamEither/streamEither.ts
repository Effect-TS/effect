import { Do as DoG } from "fp-ts-contrib/lib/Do"
import { sequenceS as SS, sequenceT as ST } from "fp-ts/lib/Apply"
import { Bifunctor4 } from "fp-ts/lib/Bifunctor"
import { Separated } from "fp-ts/lib/Compactable"

import { array } from "../Array"
import {
  Effect,
  pure as pureEffect,
  raiseError,
  chainError_ as chainErrorEffect_,
  map_ as mapEffect_
} from "../Effect"
import {
  Either,
  right,
  left,
  isLeft,
  isRight,
  fold,
  either,
  rightW,
  leftW
} from "../Either"
import { FunctionN, Lazy, Predicate, Refinement } from "../Function"
import { managed } from "../Managed"
import { Option, option, some } from "../Option"
import { pipeable } from "../Pipe"
import { record } from "../Record"
import {
  Stream,
  encaseEffect as encaseEffectS,
  stream as streamS,
  collectArray as collectArrayS,
  drain as drainS,
  fromSource as fromSourceS,
  fromArray as fromArrayS,
  fromIterator as fromIteratorS,
  fromRange as fromRangeS,
  fromIteratorUnsafe as fromIteratorUnsafeS,
  once as onceS,
  repeatedly as repeatedlyS,
  periodically as periodicallyS,
  empty as emptyS,
  aborted as abortedS,
  fromOption as fromOptionS,
  zipWithIndex as zipWithIndexS,
  repeat as repeatS
} from "../Stream"
import { StreamEither, StreamEitherURI as URI, Managed } from "../Support/Common"
import { ForM } from "../Support/For"
import { Monad4EP, MonadThrow4EP } from "../Support/Overloads"
import { Tree, tree } from "../Tree"

type StreamEitherT<S, R, E, A> = Stream<S, R, never, Either<E, A>>

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
  eff: Effect<S, R, E, A>
): StreamEither<S, R, E, A> {
  return toS(
    encaseEffectS(chainErrorEffect_(mapEffect_(eff, right), (e) => pureEffect(left(e))))
  )
}

export function encaseStream<S, R, E, A>(
  _: Stream<S, R, never, Either<E, A>>
): StreamEither<S, R, E, A> {
  return toS(_)
}

export function toStream<S, R, E, A>(
  _: StreamEither<S, R, E, A>
): Stream<S, R, never, Either<E, A>> {
  return fromS(_)
}

export function toStreamError<S, R, E, A>(
  _: StreamEither<S, R, E, A>
): Stream<S, R, E, A> {
  return streamS.chain(fromS(_), (e) => {
    if (isLeft(e)) {
      return encaseEffectS(raiseError(e.left))
    } else {
      return streamS.of(e.right)
    }
  })
}

function chain_<S, R, E, A, S2, R2, E2, B>(
  str: StreamEither<S, R, E, A>,
  f: (a: A) => StreamEither<S2, R2, E2, B>
): StreamEither<S | S2, R & R2, E | E2, B> {
  return toS(
    streamS.chain(fromS(str), (ea) =>
      fromS(isLeft(ea) ? (streamS.of(ea) as any) : f(ea.right))
    )
  )
}

function chainError_<S, R, E, A, S2, R2, E2>(
  str: StreamEither<S, R, E, A>,
  f: (a: E) => StreamEither<S2, R2, E2, A>
): StreamEither<S | S2, R & R2, E2, A> {
  return toS(
    streamS.chain(fromS(str), (ea) =>
      fromS(isRight(ea) ? streamS.of(ea) : (f(ea.left) as any))
    )
  )
}

export function chainError<S2, E, A, R2, E2>(
  f: (a: E) => StreamEither<S2, R2, E2, A>
): <S, R>(str: StreamEither<S, R, E, A>) => StreamEither<S | S2, R & R2, E2, A> {
  return <S, R>(str: StreamEither<S, R, E, A>) => chainError_(str, f)
}

export function of<S, R, E, A>(a: A): StreamEither<S, R, E, A> {
  return toS(streamS.of(right(a)))
}

export function pure<A>(a: A): StreamEither<never, unknown, never, A> {
  return toS(streamS.of(right(a)))
}

export function zipWith<S, R, E, A, S2, R2, E2, B, C>(
  as: StreamEither<S, R, E, A>,
  bs: StreamEither<S2, R2, E2, B>,
  f: FunctionN<[A, B], C>
): StreamEither<unknown, R & R2, E | E2, C> {
  return toS(
    streamS.zipWith(
      fromS(as),
      fromS(bs),
      (ea, eb): Either<E | E2, C> => {
        if (isLeft(ea)) {
          return left(ea.left)
        } else if (isLeft(eb)) {
          return left(eb.left)
        } else {
          return right(f(ea.right, eb.right))
        }
      }
    )
  )
}

function map_<S, R, E, A, B>(
  ma: StreamEither<S, R, E, A>,
  f: (a: A) => B
): StreamEither<S, R, E, B> {
  return toS(
    streamS.map(fromS(ma), (ea) => {
      if (isLeft(ea)) {
        return left(ea.left)
      } else {
        return right(f(ea.right))
      }
    })
  )
}

export function collectArray<S, R, E, A>(
  stream: StreamEither<S, R, E, A>
): Effect<S, R, E, A[]> {
  return collectArrayS(toStreamError(stream))
}

export function take<S, R, E, A>(
  stream: StreamEither<S, R, E, A>,
  n: number
): StreamEither<S, R, E, A> {
  return toS(streamS.take(fromS(stream), n))
}

export function drain<S, R, E, A>(
  stream: StreamEither<S, R, E, A>
): Effect<S, R, E, void> {
  return drainS(toStreamError(stream))
}

export function fromSource<S, R, E, S2, R2, E2, A>(
  r: Managed<S, R, never, Effect<S2, R2, E2, Option<A>>>
): StreamEither<S | S2, R & R2, E | E2, A> {
  return toS(
    fromSourceS(
      managed.map(r, (e) =>
        chainErrorEffect_(
          mapEffect_(e, (oa) => option.map(oa, rightW)),
          (e) => pureEffect(some(leftW(e)))
        )
      )
    )
  )
}

export function fromArray<A>(as: readonly A[]): StreamEither<never, unknown, never, A> {
  return toS(streamS.map(fromArrayS(as), (a) => right(a)))
}

export function fromIterator<A>(
  iter: Lazy<Iterator<A>>
): StreamEither<never, unknown, never, A> {
  return toS(streamS.map(fromIteratorS(iter), (a) => right(a)))
}

export function fromRange(
  start: number,
  interval?: number,
  end?: number
): StreamEither<never, unknown, never, number> {
  return toS(streamS.map(fromRangeS(start, interval, end), (a) => right(a)))
}

export function fromIteratorUnsafe<A>(
  iter: Iterator<A>
): StreamEither<never, unknown, never, A> {
  return toS(streamS.map(fromIteratorUnsafeS(iter), (a) => right(a)))
}

export function once<A>(a: A): StreamEither<never, unknown, never, A> {
  return toS(streamS.map(onceS(a), (a) => right(a)))
}

export function repeatedly<A>(a: A): StreamEither<unknown, unknown, never, A> {
  return toS(streamS.map(repeatedlyS(a), (a) => right(a)))
}

export function periodically(
  ms: number
): StreamEither<unknown, unknown, never, number> {
  return toS(streamS.map(periodicallyS(ms), (a) => right(a)))
}

export const empty: StreamEither<never, unknown, never, never> = emptyS as any

export function raised<E>(e: E): StreamEither<never, unknown, E, never> {
  return toS(onceS(left(e)))
}

export function aborted(e: unknown): StreamEither<never, unknown, never, never> {
  return toS(streamS.map(abortedS(e), (a) => right(a)))
}

export function fromOption<A>(opt: Option<A>): StreamEither<never, unknown, never, A> {
  return toS(streamS.map(fromOptionS(opt), (a) => right(a)))
}

export function zipWithIndex<S, R, E, A>(
  stream: StreamEither<S, R, E, A>
): StreamEither<unknown, R, E, readonly [A, number]> {
  return toS(
    streamS.map(zipWithIndexS(fromS(stream)), (a) => {
      if (isLeft(a[0])) {
        return left(a[0].left)
      } else {
        return right([a[0].right, a[1]])
      }
    })
  )
}

export function concatL<S, R, E, A, S2, R2, E2>(
  stream1: StreamEither<S, R, E, A>,
  stream2: Lazy<StreamEither<S2, R2, E2, A>>
): StreamEither<S | S2, R & R2, E | E2, A> {
  return toS(streamS.concatL(fromS(stream1), () => fromS(stream2()) as any))
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
  return toS(repeatS(fromS(stream)))
}

export function as<S, R, E, A, B>(
  stream: StreamEither<S, R, E, A>,
  b: B
): StreamEither<S, R, E, B> {
  return map_(stream, (_) => b)
}

export function filter<S, R, E, A, B extends A>(
  stream: StreamEither<S, R, E, A>,
  f: Refinement<A, B>,
  propagate?: boolean
): StreamEither<S, R, E, B>
export function filter<S, R, E, A>(
  stream: StreamEither<S, R, E, A>,
  f: Predicate<A>,
  propagate?: boolean
): StreamEither<S, R, E, A>
export function filter<S, R, E, A>(
  stream: StreamEither<S, R, E, A>,
  f: Predicate<A>,
  propagate = true
) {
  return toS(streamS.filter(fromS(stream), getEitherP(f, propagate)))
}

export const getEitherP = <E, A>(
  p: Predicate<A>,
  propagate = true
): Predicate<Either<E, A>> => fold(() => propagate, p)

export function filterWith<A, B extends A>(
  f: Refinement<A, B>,
  propagate?: boolean
): <S, R, E>(stream: StreamEither<S, R, E, A>) => StreamEither<S, R, E, A>
export function filterWith<A>(
  f: Predicate<A>,
  propagate?: boolean
): <S, R, E>(stream: StreamEither<S, R, E, A>) => StreamEither<S, R, E, A>
export function filterWith<A>(
  f: Predicate<A>,
  propagate = false
): <S, R, E>(stream: StreamEither<S, R, E, A>) => StreamEither<S, R, E, A> {
  return (stream) => filter(stream, f, propagate)
}

export function filteRefineWith<A, B extends A>(
  f: Refinement<A, B>,
  propagate = false
): <S, R, E>(stream: StreamEither<S, R, E, A>) => StreamEither<S, R, E, B> {
  return (stream) => filter(stream, f, propagate) as any
}

export function takeWhile<S, R, E, A>(
  stream: StreamEither<S, R, E, A>,
  pred: Predicate<A>
): StreamEither<S, R, E, A> {
  return toS(streamS.takeWhile(fromS(stream), (x) => isRight(x) && pred(x.right)))
}

const mapLeft_ = <S, R, E, A, G>(fea: StreamEither<S, R, E, A>, f: (e: E) => G) =>
  chainError_(fea, (x) => encaseEffect(raiseError(f(x))))

export const streamEither: Monad4EP<URI> & MonadThrow4EP<URI> & Bifunctor4<URI> = {
  URI,
  _CTX: "async",
  map: map_,
  of: <S, R, E, A>(a: A): StreamEither<S, R, E, A> =>
    (onceS(right(a)) as any) as StreamEither<S, R, E, A>,
  ap: <S1, S2, R, R2, E, E2, A, B>(
    sfab: StreamEither<S1, R, E, FunctionN<[A], B>>,
    sa: StreamEither<S2, R2, E2, A>
  ) => zipWith(sfab, sa, (f, a) => f(a)),
  chain: chain_,
  throwError: <E>(e: E) => encaseEffect(raiseError(e)),
  mapLeft: mapLeft_,
  bimap: <S, R, E, A, G, B>(
    fea: StreamEither<S, R, E, A>,
    f: (e: E) => G,
    g: (a: A) => B
  ) => map_(mapLeft_(fea, f), g)
}

export const {
  ap,
  apFirst,
  apSecond,
  bimap,
  chain,
  chainFirst,
  flatten,
  map,
  mapLeft
} = pipeable(streamEither)

export const Do = () => DoG(streamEither)
export const For = () => ForM(streamEither)
export const sequenceS = SS(streamEither)
export const sequenceT = ST(streamEither)

export const sequenceOption = option.sequence(streamEither)

export const traverseOption: <S, A, R, E, B>(
  f: (a: A) => StreamEither<S, R, E, B>
) => (ta: Option<A>) => AsyncRE<R, E, Option<B>> = (f) => (ta) =>
  option.traverse(streamEither)(ta, f)

export const wiltOption: <S, A, R, E, B, C>(
  f: (a: A) => StreamEither<S, R, E, Either<B, C>>
) => (wa: Option<A>) => AsyncRE<R, E, Separated<Option<B>, Option<C>>> = (f) => (wa) =>
  option.wilt(streamEither)(wa, f)

export const witherOption: <S, A, R, E, B>(
  f: (a: A) => StreamEither<S, R, E, Option<B>>
) => (ta: Option<A>) => AsyncRE<R, E, Option<B>> = (f) => (ta) =>
  option.wither(streamEither)(ta, f)

export const sequenceEither = either.sequence(streamEither)

export const traverseEither: <S, A, R, FE, B>(
  f: (a: A) => StreamEither<S, R, FE, B>
) => <TE>(ta: Either<TE, A>) => AsyncRE<R, FE, Either<TE, B>> = (f) => (ta) =>
  either.traverse(streamEither)(ta, f)

export const sequenceTree = tree.sequence(streamEither)

export const traverseTree: <S, A, R, E, B>(
  f: (a: A) => StreamEither<S, R, E, B>
) => (ta: Tree<A>) => AsyncRE<R, E, Tree<B>> = (f) => (ta) =>
  tree.traverse(streamEither)(ta, f)

export const sequenceArray = array.sequence(streamEither)

export const traverseArray: <S, A, R, E, B>(
  f: (a: A) => StreamEither<S, R, E, B>
) => (ta: Array<A>) => AsyncRE<R, E, Array<B>> = (f) => (ta) =>
  array.traverse(streamEither)(ta, f)

export const traverseArrayWithIndex: <S, A, R, E, B>(
  f: (i: number, a: A) => StreamEither<S, R, E, B>
) => (ta: Array<A>) => AsyncRE<R, E, Array<B>> = (f) => (ta) =>
  array.traverseWithIndex(streamEither)(ta, f)

export const wiltArray: <S, A, R, E, B, C>(
  f: (a: A) => StreamEither<S, R, E, Either<B, C>>
) => (wa: Array<A>) => AsyncRE<R, E, Separated<Array<B>, Array<C>>> = (f) => (wa) =>
  array.wilt(streamEither)(wa, f)

export const witherArray: <S, A, R, E, B>(
  f: (a: A) => StreamEither<S, R, E, Option<B>>
) => (ta: Array<A>) => AsyncRE<R, E, Array<B>> = (f) => (ta) =>
  array.wither(streamEither)(ta, f)

export const sequenceRecord = record.sequence(streamEither)

export const traverseRecord: <A, S, R, E, B>(
  f: (a: A) => StreamEither<S, R, E, B>
) => (ta: Record<string, A>) => AsyncRE<R, E, Record<string, B>> = (f) => (ta) =>
  record.traverse(streamEither)(ta, f)

export const traverseRecordWithIndex: <A, S, R, E, B>(
  f: (k: string, a: A) => StreamEither<S, R, E, B>
) => (ta: Record<string, A>) => AsyncRE<R, E, Record<string, B>> = (f) => (ta) =>
  record.traverseWithIndex(streamEither)(ta, f)

export const wiltRecord: <A, S, R, E, B, C>(
  f: (a: A) => StreamEither<S, R, E, Either<B, C>>
) => (
  wa: Record<string, A>
) => AsyncRE<R, E, Separated<Record<string, B>, Record<string, C>>> = (f) => (wa) =>
  record.wilt(streamEither)(wa, f)

export const witherRecord: <A, S, R, E, B>(
  f: (a: A) => StreamEither<S, R, E, Option<B>>
) => (ta: Record<string, A>) => AsyncRE<R, E, Record<string, B>> = (f) => (ta) =>
  record.wither(streamEither)(ta, f)
