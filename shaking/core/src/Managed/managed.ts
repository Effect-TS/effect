import { Do as DoG } from "fp-ts-contrib/lib/Do"
import { sequenceS as SS, sequenceT as ST } from "fp-ts/lib/Apply"
import { array } from "fp-ts/lib/Array"
import { Separated } from "fp-ts/lib/Compactable"
import { Either, either } from "fp-ts/lib/Either"
import { Monoid } from "fp-ts/lib/Monoid"
import { Option, option } from "fp-ts/lib/Option"
import { record } from "fp-ts/lib/Record"
import { Semigroup } from "fp-ts/lib/Semigroup"
import { tree, Tree } from "fp-ts/lib/Tree"
import { FunctionN, unsafeCoerce, tuple, constant } from "fp-ts/lib/function"
import { pipe, pipeable } from "fp-ts/lib/pipeable"

import {
  Effect,
  provide as provideEffect,
  effect,
  fork,
  completed,
  raised,
  foldExit,
  raceFold,
  unit,
  Fiber,
  Provider,
  raiseError,
  Sync as SyncEffect,
  AsyncRE as AsyncREEffect,
  pure as pureEffect,
  accessM as accessMEffect,
  bracket as bracketEffect,
  bracketExit as bracketExitEffect,
  onComplete_ as onCompleteEffect
} from "../Effect"
import { Exit, withRemaining, done } from "../Exit"
import { ManagedURI as URI } from "../Support/Common"
import { ForM } from "../Support/For"
import { Monad4E, MonadThrow4E, Monad4EP } from "../Support/Overloads"

export enum ManagedTag {
  Pure,
  Encase,
  Bracket,
  Suspended,
  Chain,
  BracketExit
}

/**
 * A Managed<E, A> is a type that encapsulates the safe acquisition and release of a resource.
 *
 * This is a friendly monadic wrapper around bracketExit.
 */
export type ManagedT<S, R, E, A> = (
  _: R
) =>
  | Pure<A>
  | Encase<S, E, A>
  | Bracket<S, S, E, A>
  | Suspended<S, S, E, A>
  | Chain<S, S, E, any, A> // eslint-disable-line @typescript-eslint/no-explicit-any
  | BracketExit<S, S, E, A>

export interface Managed<S, R, E, A> {
  _TAG: () => "Managed"
  _E: () => E
  _A: () => A
  _S: () => S
  _R: (_: R) => void
}

export type Async<A> = Managed<unknown, unknown, never, A>
export type AsyncE<E, A> = Managed<unknown, unknown, E, A>
export type AsyncR<R, A> = Managed<unknown, R, never, A>
export type AsyncRE<R, E, A> = Managed<unknown, R, E, A>

export type Sync<A> = Managed<never, unknown, never, A>
export type SyncE<E, A> = Managed<never, unknown, E, A>
export type SyncR<R, A> = Managed<never, R, never, A>
export type SyncRE<R, E, A> = Managed<never, R, E, A>

const toM = <S, R, E, A>(_: ManagedT<S, R, E, A>): Managed<S, R, E, A> => _ as any
const fromM = <S, R, E, A>(_: Managed<S, R, E, A>): ManagedT<S, R, E, A> => _ as any

export interface Pure<A> {
  readonly _tag: ManagedTag.Pure
  readonly value: A
}

/**
 * Lift a pure value into a resource
 * @param value
 */
export function pure<A>(value: A): Sync<A> {
  return toM(() => ({
    _tag: ManagedTag.Pure,
    value
  }))
}

export interface Encase<S, E, A> {
  readonly _tag: ManagedTag.Encase
  readonly acquire: Effect<S, unknown, E, A>
}

/**
 * Create a Resource by wrapping an IO producing a value that does not need to be disposed
 *
 * @param res
 * @param f
 */
export function encaseEffect<S, R, E, A>(rio: Effect<S, R, E, A>): Managed<S, R, E, A> {
  return toM((r) => ({
    _tag: ManagedTag.Encase,
    acquire: provideEffect(r)(rio)
  }))
}

export interface Bracket<S, S2, E, A> {
  readonly _tag: ManagedTag.Bracket
  readonly acquire: Effect<S, unknown, E, A>
  readonly release: FunctionN<[A], Effect<S2, unknown, E, unknown>>
}

/**
 * Create a resource from an acquisition and release function
 * @param acquire
 * @param release
 */
export function bracket<S, R, E, A, S2, R2, E2>(
  acquire: Effect<S, R, E, A>,
  release: FunctionN<[A], Effect<S2, R2, E2, unknown>>
): Managed<S | S2, R & R2, E | E2, A> {
  return toM((r) => ({
    _tag: ManagedTag.Bracket,
    acquire: provideEffect(r)(acquire as Effect<S | S2, R & R2, E | E2, A>),
    release: (a) => provideEffect(r)(release(a))
  }))
}

export interface BracketExit<S, S2, E, A> {
  readonly _tag: ManagedTag.BracketExit

  readonly acquire: Effect<S, unknown, E, A>
  readonly release: FunctionN<[A, Exit<E, unknown>], Effect<S2, unknown, E, unknown>>
}

export function bracketExit<S, R, E, A, S2, R2, E2>(
  acquire: Effect<S, R, E, A>,
  release: FunctionN<[A, Exit<E, unknown>], Effect<S2, R2, E2, unknown>>
): Managed<S | S2, R & R2, E | E2, A> {
  return toM((r) => ({
    _tag: ManagedTag.BracketExit,
    acquire: provideEffect(r)(acquire as Effect<S | S2, R, E, A>),
    release: (a, e) => provideEffect(r)(release(a, e as any))
  }))
}

export interface Suspended<S, S2, E, A> {
  readonly _tag: ManagedTag.Suspended

  readonly suspended: Effect<S, unknown, E, Managed<S, unknown, E, A>>
}

/**
 * Lift an IO of a Resource into a resource
 * @param suspended
 */
export function suspend<S, R, E, S2, R2, E2, A>(
  suspended: Effect<S, R, E, Managed<S2, R2, E2, A>>
): Managed<S | S2, R & R2, E | E2, A> {
  return toM(
    (r) =>
      ({
        _tag: ManagedTag.Suspended,
        suspended: effect.map(provideEffect(r)(suspended), (m) => (_: unknown) =>
          fromM(m)(r)
        )
      } as any)
  )
}

export interface Chain<S, S2, E, L, A> {
  readonly _tag: ManagedTag.Chain
  readonly left: Managed<S, unknown, E, L>
  readonly bind: FunctionN<[L], Managed<S2, unknown, E, A>>
}

/**
 * Compose dependent resourcess.
 *
 * The scope of left will enclose the scope of the resource produced by bind
 * @param left
 * @param bind
 */
function chain_<S, R, E, L, S2, R2, E2, A>(
  left: Managed<S, R, E, L>,
  bind: FunctionN<[L], Managed<S2, R2, E2, A>>
): Managed<S | S2, R & R2, E | E2, A> {
  return toM((r) => ({
    _tag: ManagedTag.Chain,
    left: provideAll(r)(left as Managed<S | S2, R, E | E2, L>),
    bind: (l) => provideAll(r)(bind(l))
  }))
}

/**
 * Map a resource
 * @param res
 * @param f
 */
function map_<S, R, E, L, A>(
  res: Managed<S, R, E, L>,
  f: FunctionN<[L], A>
): Managed<S, R, E, A> {
  return chain_(res, (r) => pure(f(r)) as Managed<S, R, E, A>)
}

/**
 * Zip two resources together with the given function.
 *
 * The scope of resa will enclose the scope of resb
 * @param resa
 * @param resb
 * @param f
 */
export function zipWith<S, R, E, A, S2, R2, E2, B, C>(
  resa: Managed<S, R, E, A>,
  resb: Managed<S2, R2, E2, B>,
  f: FunctionN<[A, B], C>
): Managed<S | S2, R & R2, E | E2, C> {
  return chain_(resa, (a) => map_(resb, (b) => f(a, b)))
}

/**
 * Zip two resources together as a tuple.
 *
 * The scope of resa will enclose the scope of resb
 * @param resa
 * @param resb
 */
export function zip<S, R, E, A, S2, R2, E2, B>(
  resa: Managed<S, R, E, A>,
  resb: Managed<S2, R2, E2, B>
): Managed<S | S2, R & R2, E | E2, readonly [A, B]> {
  return zipWith(resa, resb, (a, b) => [a, b] as const)
}

/**
 * Fold two exits, while running functions when one succeeds but other one
 * fails. Gives error priority to first passed exit (aExit).
 *
 * @param aExit
 * @param bExit
 * @param onBFail - run when a succeeds, but b fails
 * @param onAFail - run when b succeeds, but a fails
 */
function foldExitsWithFallback<E, A, B, S, S2, R, R2>(
  aExit: Exit<E, A>,
  bExit: Exit<E, B>,
  onBFail: FunctionN<[A], Effect<S, R, E, unknown>>,
  onAFail: FunctionN<[B], Effect<S2, R2, E, unknown>>
): AsyncREEffect<R & R2, E, [A, B]> {
  return aExit._tag === "Done"
    ? bExit._tag === "Done"
      ? unsafeCoerce<SyncEffect<[A, B]>, AsyncREEffect<R & R2, E, [A, B]>>(
          pureEffect(tuple(aExit.value, bExit.value))
        )
      : pipe(
          onBFail(aExit.value),
          foldExit(
            (_) => completed(withRemaining(bExit, _)),
            () => raised(bExit)
          )
        )
    : bExit._tag === "Done"
    ? pipe(
        onAFail(bExit.value),
        foldExit(
          (_) => completed(withRemaining(aExit, _)),
          () => raised(aExit)
        )
      )
    : completed(withRemaining(aExit, bExit))
}

/**
 * Zip two resources together with provided function, while allocating and
 * releasing them in parallel and always prioritizing error of first passed
 * resource.
 *
 * @param resa
 * @param resb
 * @param f
 */
export function parZipWith<S, S2, R, R2, E, E2, A, B, C>(
  resa: Managed<S, R, E, A>,
  resb: Managed<S2, R2, E2, B>,
  f: FunctionN<[A, B], C>
): AsyncRE<R & R2, E | E2, C> {
  const alloc = raceFold(
    allocate(resa as Managed<S, R, E | E2, A>),
    allocate(resb),
    (aExit, bFiber) =>
      effect.chain(bFiber.wait, (bExit) =>
        foldExitsWithFallback(
          aExit,
          bExit,
          (aLeak) => aLeak.release,
          (bLeak) => bLeak.release
        )
      ),
    (bExit, aFiber) =>
      effect.chain(aFiber.wait, (aExit) =>
        foldExitsWithFallback(
          aExit,
          bExit,
          (aLeak) => aLeak.release,
          (bLeak) => bLeak.release
        )
      )
  )

  return map_(
    bracket(alloc, ([aLeak, bLeak]) =>
      raceFold(
        aLeak.release,
        bLeak.release,
        (aExit, bFiber) =>
          effect.chain(bFiber.wait, (bExit) =>
            foldExitsWithFallback(
              aExit,
              bExit,
              () => unit,
              () => unit
            )
          ),
        (bExit, aFiber) =>
          effect.chain(aFiber.wait, (aExit) =>
            foldExitsWithFallback(
              aExit,
              bExit,
              () => unit,
              () => unit
            )
          )
      )
    ),
    ([aLeak, bLeak]) => f(aLeak.a, bLeak.a)
  )
}

/**
 * Zip two resources together into tuple, while allocating and releasing them
 * in parallel and always prioritizing error of resa.
 *
 * @param resa
 * @param resb
 */
export function parZip<S, S2, R, R2, E, A, B>(
  resa: Managed<S, R, E, A>,
  resb: Managed<S2, R2, E, B>
): AsyncRE<R & R2, E, [A, B]> {
  return parZipWith(resa, resb, tuple)
}

/**
 * Parallel form of ap_
 * @param iof
 * @param ioa
 */
export function parAp_<S, S2, R, R2, E, E2, A, B>(
  iof: Managed<S, R, E, FunctionN<[A], B>>,
  ioa: Managed<S2, R2, E2, A>
): AsyncRE<R & R2, E | E2, B> {
  return parZipWith(iof, ioa, (f, a) => f(a))
}

/**
 * Flipped version of ap
 * @param resfab
 * @param resa
 */
function ap_<S, R, E, A, B, S2, R2, E2>(
  resfab: Managed<S, R, E, FunctionN<[A], B>>,
  resa: Managed<S2, R2, E2, A>
): Managed<S | S2, R & R2, E | E2, B> {
  return zipWith(resfab, resa, (f, a) => f(a))
}

/**
 * Map a resource to a static value
 *
 * This creates a resource of the provided constant b where the produced A has the same lifetime internally
 * @param fa
 * @param b
 */
export function as<S, R, E, A, B>(fa: Managed<S, R, E, A>, b: B): Managed<S, R, E, B> {
  return map_(fa, constant(b))
}

/**
 * Curried form of as
 * @param b
 */
export function to<B>(
  b: B
): <S, R, E, A>(fa: Managed<S, R, E, A>) => Managed<S, R, E, B> {
  return (fa) => as(fa, b)
}

/**
 * Construct a new 'hidden' resource using the produced A with a nested lifetime
 * Useful for performing initialization and cleanup that clients don't need to see
 * @param left
 * @param bind
 */
export function chainTap<S, R, E, A, S2, R2, E2>(
  left: Managed<S, R, E, A>,
  bind: FunctionN<[A], Managed<S2, R2, E2, unknown>>
): Managed<S | S2, R & R2, E | E2, A> {
  return chain_(left, (a) => as(bind(a), a))
}

/**
 * Curried form of chainTap
 * @param bind
 */
export function chainTapWith<S, R, E, A>(
  bind: FunctionN<[A], Managed<S, R, E, unknown>>
): <S2, R2, E2>(_: Managed<S2, R2, E2, A>) => Managed<S | S2, R & R2, E | E2, A> {
  return (inner) => chainTap(inner, bind)
}

/**
 * Curried data last form of use
 * @param f
 */
export function consume<S, R, E, A, B>(
  f: FunctionN<[A], Effect<S, R, E, B>>
): <S2, R2, E2>(ma: Managed<S2, R2, E2, A>) => Effect<S | S2, R & R2, E | E2, B> {
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  return (r) => use(r, f)
}

/**
 * Create a Resource from the fiber of an IO.
 * The acquisition of this resource corresponds to forking rio into a fiber.
 * The destruction of the resource is interrupting said fiber.
 * @param rio
 */
export function fiber<S, R, E, A>(
  rio: Effect<S, R, E, A>
): AsyncRE<R, never, Fiber<E, A>> {
  return bracket(fork(rio), (fiber) => fiber.interrupt)
}

/**
 * Use a resource to produce a program that can be run.s
 * @param res
 * @param f
 */
export function use<S, R, E, A, S2, R2, E2, B>(
  res: Managed<S, R, E, A>,
  f: FunctionN<[A], Effect<S2, R2, E2, B>>
): Effect<S | S2, R & R2, E | E2, B> {
  return accessMEffect((r: R & R2) => {
    const c = fromM(res)(r)
    switch (c._tag) {
      case ManagedTag.Pure:
        return f(c.value)
      case ManagedTag.Encase:
        return effect.chain(c.acquire, f)
      case ManagedTag.Bracket:
        return bracketEffect(c.acquire, c.release, f)
      case ManagedTag.BracketExit:
        return bracketExitEffect(c.acquire, (a, e) => c.release(a, e as any), f)
      case ManagedTag.Suspended:
        return effect.chain(c.suspended, consume(f))
      case ManagedTag.Chain:
        return use(c.left, (a) => use(c.bind(a), f))
    }
  })
}

export interface Leak<S, R, E, A> {
  a: A
  release: Effect<S, R, E, unknown>
}

/**
 * Create an IO action that will produce the resource for this managed along with its finalizer
 * action seperately.
 *
 * If an error occurs during allocation then any allocated resources should be cleaned up, but once the
 * Leak object is produced it is the callers responsibility to ensure release is invoked.
 * @param res
 */
export function allocate<S, R, E, A>(
  res: Managed<S, R, E, A>
): Effect<S, R, E, Leak<S, R, E, A>> {
  return accessMEffect((r: R) => {
    const c = fromM(res)(r)

    switch (c._tag) {
      case ManagedTag.Pure:
        return pureEffect({ a: c.value, release: unit })
      case ManagedTag.Encase:
        return effect.map(c.acquire, (a) => ({ a, release: unit }))
      case ManagedTag.Bracket:
        return effect.map(c.acquire, (a) => ({ a, release: c.release(a) }))
      case ManagedTag.BracketExit:
        // best effort, because we cannot know what the exit status here
        return effect.map(c.acquire, (a) => ({
          a,
          release: c.release(a, done(undefined))
        }))
      case ManagedTag.Suspended:
        return effect.chain(c.suspended, allocate)
      case ManagedTag.Chain:
        return bracketExitEffect(
          allocate(c.left),
          (leak, exit) => (exit._tag === "Done" ? unit : leak.release),
          (leak) =>
            effect.map(
              allocate(c.bind(leak.a)),
              // Combine the finalizer actions of the outer and inner resource
              (innerLeak) => ({
                a: innerLeak.a,
                release: onCompleteEffect(innerLeak.release, leak.release)
              })
            )
        )
    }
  })
}

/**
 * Use a resource to provide part of the environment to an effect
 * @param man
 * @param ma
 */
export function provide<S2, R3, E2, R2>(
  man: Managed<S2, R3, E2, R2>,
  inverted: "regular" | "inverted" = "regular"
): Provider<R3, R2, E2, S2> {
  return (ma) => use(man, (r) => provideEffect(r, inverted)(ma))
}

export const managed: Monad4E<URI> & MonadThrow4E<URI> = {
  URI,
  of: pure,
  map: map_,
  ap: ap_,
  chain: chain_,
  throwError: (e) => encaseEffect(raiseError(e))
}

export const parManaged: Monad4EP<URI> = {
  URI,
  _CTX: "async",
  of: pure,
  map: map_,
  ap: parAp_,
  chain: chain_
}

export function getSemigroup<S, R, E, A>(
  Semigroup: Semigroup<A>
): Semigroup<Managed<S, R, E, A>> {
  return {
    concat(x: Managed<S, R, E, A>, y: Managed<S, R, E, A>): Managed<S, R, E, A> {
      return zipWith(x, y, Semigroup.concat)
    }
  }
}

export function getMonoid<S, R, E, A>(Monoid: Monoid<A>): Monoid<Managed<S, R, E, A>> {
  return {
    ...getSemigroup(Monoid),
    empty: pure(Monoid.empty) as Managed<S, R, E, A>
  }
}

function provideAll<R>(r: R) {
  return <S, E, A>(ma: Managed<S, R, E, A>): Managed<S, unknown, E, A> =>
    toM<S, unknown, E, A>(() => fromM(ma)(r))
}

export const Do = () => DoG(managed)
export const For = () => ForM(managed)
export const sequenceS = SS(managed)
export const sequenceT = ST(managed)

export const parDo = () => DoG(parManaged)
export const parFor = () => ForM(parManaged)
export const parSequenceS = SS(parManaged)
export const parSequenceT = ST(parManaged)

export const sequenceOption = option.sequence(managed)

export const traverseOption: <S, A, R, E, B>(
  f: (a: A) => Managed<S, R, E, B>
) => (ta: Option<A>) => Managed<S, R, E, Option<B>> = (f) => (ta) =>
  option.traverse(managed)(ta, f)

export const wiltOption: <S, A, R, E, B, C>(
  f: (a: A) => Managed<S, R, E, Either<B, C>>
) => (wa: Option<A>) => Managed<S, R, E, Separated<Option<B>, Option<C>>> = (f) => (
  wa
) => option.wilt(managed)(wa, f)

export const witherOption: <S, A, R, E, B>(
  f: (a: A) => Managed<S, R, E, Option<B>>
) => (ta: Option<A>) => Managed<S, R, E, Option<B>> = (f) => (ta) =>
  option.wither(managed)(ta, f)

export const sequenceEither = either.sequence(managed)

export const traverseEither: <S, A, R, FE, B>(
  f: (a: A) => Managed<S, R, FE, B>
) => <TE>(ta: Either<TE, A>) => Managed<S, R, FE, Either<TE, B>> = (f) => (ta) =>
  either.traverse(managed)(ta, f)

export const sequenceTree = tree.sequence(managed)

export const traverseTree: <S, A, R, E, B>(
  f: (a: A) => Managed<S, R, E, B>
) => (ta: Tree<A>) => Managed<S, R, E, Tree<B>> = (f) => (ta) =>
  tree.traverse(managed)(ta, f)

export const parSequenceTree = tree.sequence(managed)

export const parTraverseTree: <S, A, R, E, B>(
  f: (a: A) => Managed<S, R, E, B>
) => (ta: Tree<A>) => Managed<unknown, R, E, Tree<B>> = (f) => (ta) =>
  tree.traverse(parManaged)(ta, f)

export const sequenceArray = array.sequence(managed)

export const traverseArray: <S, A, R, E, B>(
  f: (a: A) => Managed<S, R, E, B>
) => (ta: Array<A>) => Managed<S, R, E, Array<B>> = (f) => (ta) =>
  array.traverse(managed)(ta, f)

export const traverseArrayWithIndex: <S, A, R, E, B>(
  f: (i: number, a: A) => Managed<S, R, E, B>
) => (ta: Array<A>) => Managed<S, R, E, Array<B>> = (f) => (ta) =>
  array.traverseWithIndex(managed)(ta, f)

export const wiltArray: <S, A, R, E, B, C>(
  f: (a: A) => Managed<S, R, E, Either<B, C>>
) => (wa: Array<A>) => Managed<S, R, E, Separated<Array<B>, Array<C>>> = (f) => (wa) =>
  array.wilt(managed)(wa, f)

export const witherArray: <S, A, R, E, B>(
  f: (a: A) => Managed<S, R, E, Option<B>>
) => (ta: Array<A>) => Managed<S, R, E, Array<B>> = (f) => (ta) =>
  array.wither(managed)(ta, f)

export const parSequenceArray = array.sequence(parManaged)

export const parTraverseArray: <S, A, R, E, B>(
  f: (a: A) => Managed<S, R, E, B>
) => (ta: Array<A>) => Managed<unknown, R, E, Array<B>> = (f) => (ta) =>
  array.traverse(parManaged)(ta, f)

export const parTraverseArrayWithIndex: <S, A, R, E, B>(
  f: (i: number, a: A) => Managed<S, R, E, B>
) => (ta: Array<A>) => Managed<unknown, R, E, Array<B>> = (f) => (ta) =>
  array.traverseWithIndex(parManaged)(ta, f)

export const parWiltArray: <S, A, R, E, B, C>(
  f: (a: A) => Managed<S, R, E, Either<B, C>>
) => (wa: Array<A>) => Managed<unknown, R, E, Separated<Array<B>, Array<C>>> = (f) => (
  wa
) => array.wilt(parManaged)(wa, f)

export const parWitherArray: <S, A, R, E, B>(
  f: (a: A) => Managed<S, R, E, Option<B>>
) => (ta: Array<A>) => Managed<unknown, R, E, Array<B>> = (f) => (ta) =>
  array.wither(parManaged)(ta, f)

export const sequenceRecord = record.sequence(managed)

export const traverseRecord: <A, S, R, E, B>(
  f: (a: A) => Managed<S, R, E, B>
) => (ta: Record<string, A>) => Managed<S, R, E, Record<string, B>> = (f) => (ta) =>
  record.traverse(managed)(ta, f)

export const traverseRecordWithIndex: <A, S, R, E, B>(
  f: (k: string, a: A) => Managed<S, R, E, B>
) => (ta: Record<string, A>) => Managed<S, R, E, Record<string, B>> = (f) => (ta) =>
  record.traverseWithIndex(managed)(ta, f)

export const wiltRecord: <A, S, R, E, B, C>(
  f: (a: A) => Managed<S, R, E, Either<B, C>>
) => (
  wa: Record<string, A>
) => Managed<S, R, E, Separated<Record<string, B>, Record<string, C>>> = (f) => (wa) =>
  record.wilt(managed)(wa, f)

export const witherRecord: <A, S, R, E, B>(
  f: (a: A) => Managed<S, R, E, Option<B>>
) => (ta: Record<string, A>) => Managed<S, R, E, Record<string, B>> = (f) => (ta) =>
  record.wither(managed)(ta, f)

export const parSequenceRecord = record.sequence(parManaged)

export const parTraverseRecord: <A, S, R, E, B>(
  f: (a: A) => Managed<S, R, E, B>
) => (ta: Record<string, A>) => Managed<unknown, R, E, Record<string, B>> = (f) => (
  ta
) => record.traverse(parManaged)(ta, f)

export const parTraverseRecordWithIndex: <A, S, R, E, B>(
  f: (k: string, a: A) => Managed<S, R, E, B>
) => (ta: Record<string, A>) => Managed<unknown, R, E, Record<string, B>> = (f) => (
  ta
) => record.traverseWithIndex(parManaged)(ta, f)

export const parWiltRecord: <A, S, R, E, B, C>(
  f: (a: A) => Managed<S, R, E, Either<B, C>>
) => (
  wa: Record<string, A>
) => Managed<unknown, R, E, Separated<Record<string, B>, Record<string, C>>> = (f) => (
  wa
) => record.wilt(parManaged)(wa, f)

export const parWitherRecord: <A, S, R, E, B>(
  f: (a: A) => Managed<S, R, E, Option<B>>
) => (ta: Record<string, A>) => Managed<unknown, R, E, Record<string, B>> = (f) => (
  ta
) => record.wither(parManaged)(ta, f)

export const {
  ap,
  apFirst,
  apSecond,
  chain,
  chainFirst,
  filterOrElse,
  flatten,
  fromEither,
  fromOption,
  fromPredicate,
  map
} = pipeable(managed)

export const { ap: parAp, apFirst: parApFirst, apSecond: parApSecond } = pipeable(
  parManaged
)
