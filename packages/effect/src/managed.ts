import { function as F, semigroup as Sem, monoid as Mon } from "fp-ts";
import { Exit, done } from "./original/exit";
import * as T from "./effect";
import { Do as DoG } from "fp-ts-contrib/lib/Do";
import { sequenceS as SS, sequenceT as ST } from "fp-ts/lib/Apply";
import * as Ar from "fp-ts/lib/Array";
import * as Op from "fp-ts/lib/Option";
import * as Ei from "fp-ts/lib/Either";
import * as TR from "fp-ts/lib/Tree";
import * as RE from "fp-ts/lib/Record";
import { Separated } from "fp-ts/lib/Compactable";
import { pipe, pipeable } from "fp-ts/lib/pipeable";
import { Monad4E, Monad4EP, MonadThrow4E } from "./overloadEff";
import { ForM } from "./for";

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
  | BracketExit<S, S, E, A>;

export interface Managed<S, R, E, A> {
  _TAG: () => "Managed";
  _E: () => E;
  _A: () => A;
  _S: () => S;
  _R: (_: R) => void;
}

export type Async<A> = Managed<unknown, unknown, never, A>;
export type AsyncE<E, A> = Managed<unknown, unknown, E, A>;
export type AsyncR<R, A> = Managed<unknown, R, never, A>;
export type AsyncRE<R, E, A> = Managed<unknown, R, E, A>;

export type Sync<A> = Managed<never, unknown, never, A>;
export type SyncE<E, A> = Managed<never, unknown, E, A>;
export type SyncR<R, A> = Managed<never, R, never, A>;
export type SyncRE<R, E, A> = Managed<never, R, E, A>;

const toM = <S, R, E, A>(_: ManagedT<S, R, E, A>): Managed<S, R, E, A> => _ as any;
const fromM = <S, R, E, A>(_: Managed<S, R, E, A>): ManagedT<S, R, E, A> => _ as any;

export interface Pure<A> {
  readonly _tag: ManagedTag.Pure;
  readonly value: A;
}

/**
 * Lift a pure value into a resource
 * @param value
 */
export function pure<A>(value: A): Sync<A> {
  return toM(() => ({
    _tag: ManagedTag.Pure,
    value
  }));
}

export interface Encase<S, E, A> {
  readonly _tag: ManagedTag.Encase;
  readonly acquire: T.Effect<S, unknown, E, A>;
}

/**
 * Create a Resource by wrapping an IO producing a value that does not need to be disposed
 *
 * @param res
 * @param f
 */
export function encaseEffect<S, R, E, A>(rio: T.Effect<S, R, E, A>): Managed<S, R, E, A> {
  return toM((r) => ({
    _tag: ManagedTag.Encase,
    acquire: T.provide(r)(rio)
  }));
}

export interface Bracket<S, S2, E, A> {
  readonly _tag: ManagedTag.Bracket;
  readonly acquire: T.Effect<S, unknown, E, A>;
  readonly release: F.FunctionN<[A], T.Effect<S2, unknown, E, unknown>>;
}

/**
 * Create a resource from an acquisition and release function
 * @param acquire
 * @param release
 */
export function bracket<S, R, E, A, S2, R2, E2>(
  acquire: T.Effect<S, R, E, A>,
  release: F.FunctionN<[A], T.Effect<S2, R2, E2, unknown>>
): Managed<S | S2, R & R2, E | E2, A> {
  return toM((r) => ({
    _tag: ManagedTag.Bracket,
    acquire: T.provide(r)(acquire as T.Effect<S | S2, R & R2, E | E2, A>),
    release: (a) => T.provide(r)(release(a))
  }));
}

export interface BracketExit<S, S2, E, A> {
  readonly _tag: ManagedTag.BracketExit;

  readonly acquire: T.Effect<S, unknown, E, A>;
  readonly release: F.FunctionN<[A, Exit<E, unknown>], T.Effect<S2, unknown, E, unknown>>;
}

export function bracketExit<S, R, E, A, S2, R2, E2>(
  acquire: T.Effect<S, R, E, A>,
  release: F.FunctionN<[A, Exit<E, unknown>], T.Effect<S2, R2, E2, unknown>>
): Managed<S | S2, R & R2, E | E2, A> {
  return toM((r) => ({
    _tag: ManagedTag.BracketExit,
    acquire: T.provide(r)(acquire as T.Effect<S | S2, R, E, A>),
    release: (a, e) => T.provide(r)(release(a, e as any))
  }));
}

export interface Suspended<S, S2, E, A> {
  readonly _tag: ManagedTag.Suspended;

  readonly suspended: T.Effect<S, unknown, E, Managed<S, unknown, E, A>>;
}

/**
 * Lift an IO of a Resource into a resource
 * @param suspended
 */
export function suspend<S, R, E, S2, R2, E2, A>(
  suspended: T.Effect<S, R, E, Managed<S2, R2, E2, A>>
): Managed<S | S2, R & R2, E | E2, A> {
  return toM(
    (r) =>
      ({
        _tag: ManagedTag.Suspended,
        suspended: T.effect.map(T.provide(r)(suspended), (m) => (_: unknown) => fromM(m)(r))
      } as any)
  );
}

export interface Chain<S, S2, E, L, A> {
  readonly _tag: ManagedTag.Chain;
  readonly left: Managed<S, unknown, E, L>;
  readonly bind: F.FunctionN<[L], Managed<S2, unknown, E, A>>;
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
  bind: F.FunctionN<[L], Managed<S2, R2, E2, A>>
): Managed<S | S2, R & R2, E | E2, A> {
  return toM((r) => ({
    _tag: ManagedTag.Chain,
    left: provideAll(r)(left as Managed<S | S2, R, E | E2, L>),
    bind: (l) => provideAll(r)(bind(l))
  }));
}

/**
 * Map a resource
 * @param res
 * @param f
 */
function map_<S, R, E, L, A>(
  res: Managed<S, R, E, L>,
  f: F.FunctionN<[L], A>
): Managed<S, R, E, A> {
  return chain_(res, (r) => pure(f(r)) as Managed<S, R, E, A>);
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
  f: F.FunctionN<[A, B], C>
): Managed<S | S2, R & R2, E | E2, C> {
  return chain_(resa, (a) => map_(resb, (b) => f(a, b)));
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
  return zipWith(resa, resb, (a, b) => [a, b] as const);
}

function foldExitAndFiber<E, A, B, S, S2, R, R2>(
  aExit: Exit<E, A>,
  bFiber: T.Fiber<E, B>,
  onBFail: F.FunctionN<[A], T.Effect<S, R, E, unknown>>,
  onAFail: F.FunctionN<[B], T.Effect<S2, R2, E, unknown>>
): T.AsyncRE<R & R2, E, [A, B]> {
  return T.effect.chain(bFiber.wait, (bExit) =>
    aExit._tag === "Done"
      ? bExit._tag === "Done"
        ? F.unsafeCoerce<T.Sync<[A, B]>, T.AsyncRE<R & R2, E, [A, B]>>(
            T.pure(F.tuple(aExit.value, bExit.value))
          )
        : pipe(
            onBFail(aExit.value),
            T.chain(() => T.raised(bExit)),
            T.chainError(() => T.raised(bExit))
          )
      : bExit._tag === "Done"
      ? pipe(
          onAFail(bExit.value),
          T.chain(() => T.raised(aExit)),
          T.chainError(() => T.raised(aExit))
        )
      : T.raised(aExit)
  );
}

/**
 * Zip two resources together with provided function, while allocating and
 * releasing them in parallel and returning first error that was raised.
 *
 * @param resa
 * @param resb
 * @param f
 */
export function parZipWith<S, S2, R, R2, E, E2, A, B, C>(
  resa: Managed<S, R, E, A>,
  resb: Managed<S2, R2, E2, B>,
  f: F.FunctionN<[A, B], C>
): AsyncRE<R & R2, E | E2, C> {
  const alloc = T.raceFold(
    allocate(resa as Managed<S, R, E | E2, A>),
    allocate(resb),
    (aExit, bFiber) =>
      foldExitAndFiber(
        aExit,
        bFiber,
        (aLeak) => aLeak.release,
        (bLeak) => bLeak.release
      ),
    (bExit, aFiber) =>
      T.effect.map(
        foldExitAndFiber(
          bExit,
          aFiber,
          (bLeak) => bLeak.release,
          (aLeak) => aLeak.release
        ),
        ([b, a]) => F.tuple(a, b)
      )
  );

  return map_(
    bracket(alloc, ([aLeak, bLeak]) =>
      T.raceFold(
        aLeak.release,
        bLeak.release,
        (aExit, bFiber) =>
          foldExitAndFiber(
            aExit,
            bFiber,
            () => T.unit,
            () => T.unit
          ),
        (bExit, aFiber) =>
          foldExitAndFiber(
            bExit,
            aFiber,
            () => T.unit,
            () => T.unit
          )
      )
    ),
    ([aLeak, bLeak]) => f(aLeak.a, bLeak.a)
  );
}

/**
 * Zip two resources together into tuple, while allocating and releasing them
 * in parallel and returning first error that was raised.
 *
 * @param resa
 * @param resb
 */
export function parZip<S, S2, R, R2, E, A, B>(
  resa: Managed<S, R, E, A>,
  resb: Managed<S2, R2, E, B>
): AsyncRE<R & R2, E, [A, B]> {
  return parZipWith(resa, resb, F.tuple);
}

/**
 * Parallel form of ap_
 * @param iof
 * @param ioa
 */
export function parAp_<S, S2, R, R2, E, E2, A, B>(
  iof: Managed<S, R, E, F.FunctionN<[A], B>>,
  ioa: Managed<S2, R2, E2, A>
): AsyncRE<R & R2, E | E2, B> {
  return parZipWith(iof, ioa, (f, a) => f(a));
}

/**
 * Flipped version of ap
 * @param resfab
 * @param resa
 */
function ap_<S, R, E, A, B, S2, R2, E2>(
  resfab: Managed<S, R, E, F.FunctionN<[A], B>>,
  resa: Managed<S2, R2, E2, A>
): Managed<S | S2, R & R2, E | E2, B> {
  return zipWith(resfab, resa, (f, a) => f(a));
}

/**
 * Map a resource to a static value
 *
 * This creates a resource of the provided constant b where the produced A has the same lifetime internally
 * @param fa
 * @param b
 */
export function as<S, R, E, A, B>(fa: Managed<S, R, E, A>, b: B): Managed<S, R, E, B> {
  return map_(fa, F.constant(b));
}

/**
 * Curried form of as
 * @param b
 */
export function to<B>(b: B): <S, R, E, A>(fa: Managed<S, R, E, A>) => Managed<S, R, E, B> {
  return (fa) => as(fa, b);
}

/**
 * Construct a new 'hidden' resource using the produced A with a nested lifetime
 * Useful for performing initialization and cleanup that clients don't need to see
 * @param left
 * @param bind
 */
export function chainTap<S, R, E, A, S2, R2, E2>(
  left: Managed<S, R, E, A>,
  bind: F.FunctionN<[A], Managed<S2, R2, E2, unknown>>
): Managed<S | S2, R & R2, E | E2, A> {
  return chain_(left, (a) => as(bind(a), a));
}

/**
 * Curried form of chainTap
 * @param bind
 */
export function chainTapWith<S, R, E, A>(
  bind: F.FunctionN<[A], Managed<S, R, E, unknown>>
): <S2, R2, E2>(_: Managed<S2, R2, E2, A>) => Managed<S | S2, R & R2, E | E2, A> {
  return (inner) => chainTap(inner, bind);
}

/**
 * Curried data last form of use
 * @param f
 */
export function consume<S, R, E, A, B>(
  f: F.FunctionN<[A], T.Effect<S, R, E, B>>
): <S2, R2, E2>(ma: Managed<S2, R2, E2, A>) => T.Effect<S | S2, R & R2, E | E2, B> {
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  return (r) => use(r, f);
}

/**
 * Create a Resource from the fiber of an IO.
 * The acquisition of this resource corresponds to forking rio into a fiber.
 * The destruction of the resource is interrupting said fiber.
 * @param rio
 */
export function fiber<S, R, E, A>(rio: T.Effect<S, R, E, A>): AsyncRE<R, never, T.Fiber<E, A>> {
  return bracket(T.fork(rio), (fiber) => fiber.interrupt);
}

/**
 * Use a resource to produce a program that can be run.s
 * @param res
 * @param f
 */
export function use<S, R, E, A, S2, R2, E2, B>(
  res: Managed<S, R, E, A>,
  f: F.FunctionN<[A], T.Effect<S2, R2, E2, B>>
): T.Effect<S | S2, R & R2, E | E2, B> {
  return T.accessM((r: R & R2) => {
    const c = fromM(res)(r);
    switch (c._tag) {
      case ManagedTag.Pure:
        return f(c.value);
      case ManagedTag.Encase:
        return T.effect.chain(c.acquire, f);
      case ManagedTag.Bracket:
        return T.bracket(c.acquire, c.release, f);
      case ManagedTag.BracketExit:
        return T.bracketExit(c.acquire, (a, e) => c.release(a, e as any), f);
      case ManagedTag.Suspended:
        return T.effect.chain(c.suspended, consume(f));
      case ManagedTag.Chain:
        return use(c.left, (a) => use(c.bind(a), f));
    }
  });
}

export interface Leak<S, R, E, A> {
  a: A;
  release: T.Effect<S, R, E, unknown>;
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
): T.Effect<S, R, E, Leak<S, R, E, A>> {
  return T.accessM((r: R) => {
    const c = fromM(res)(r);

    switch (c._tag) {
      case ManagedTag.Pure:
        return T.pure({ a: c.value, release: T.unit });
      case ManagedTag.Encase:
        return T.effect.map(c.acquire, (a) => ({ a, release: T.unit }));
      case ManagedTag.Bracket:
        return T.effect.map(c.acquire, (a) => ({ a, release: c.release(a) }));
      case ManagedTag.BracketExit:
        // best effort, because we cannot know what the exit status here
        return T.effect.map(c.acquire, (a) => ({
          a,
          release: c.release(a, done(undefined))
        }));
      case ManagedTag.Suspended:
        return T.effect.chain(c.suspended, allocate);
      case ManagedTag.Chain:
        return T.bracketExit(
          allocate(c.left),
          (leak, exit) => (exit._tag === "Done" ? T.unit : leak.release),
          (leak) =>
            T.effect.map(
              allocate(c.bind(leak.a)),
              // Combine the finalizer actions of the outer and inner resource
              (innerLeak) => ({
                a: innerLeak.a,
                release: T.effect.onComplete(innerLeak.release, leak.release)
              })
            )
        );
    }
  });
}

/**
 * Use a resource to provide part of the environment to an effect
 * @param man
 * @param ma
 */
export function provide<S2, R3, E2, R2>(
  man: Managed<S2, R3, E2, R2>,
  inverted: "regular" | "inverted" = "regular"
): T.Provider<R3, R2, E2, S2> {
  return (ma) => use(man, (r) => T.provide(r, inverted)(ma));
}

export const URI = "matechs/Managed";
export type URI = typeof URI;

declare module "fp-ts/lib/HKT" {
  interface URItoKind4<S, R, E, A> {
    [URI]: Managed<S, R, E, A>;
  }
}

export const managed: Monad4E<URI> & MonadThrow4E<URI> = {
  URI,
  of: pure,
  map: map_,
  ap: ap_,
  chain: chain_,
  throwError: (e) => encaseEffect(T.raiseError(e))
};

export const parManaged: Monad4EP<URI> = {
  URI,
  _CTX: "async",
  of: pure,
  map: map_,
  ap: parAp_,
  chain: chain_
};

export function getSemigroup<S, R, E, A>(
  Semigroup: Sem.Semigroup<A>
): Sem.Semigroup<Managed<S, R, E, A>> {
  return {
    concat(x: Managed<S, R, E, A>, y: Managed<S, R, E, A>): Managed<S, R, E, A> {
      return zipWith(x, y, Semigroup.concat);
    }
  };
}

export function getMonoid<S, R, E, A>(Monoid: Mon.Monoid<A>): Mon.Monoid<Managed<S, R, E, A>> {
  return {
    ...getSemigroup(Monoid),
    empty: pure(Monoid.empty) as Managed<S, R, E, A>
  };
}

function provideAll<R>(r: R) {
  return <S, E, A>(ma: Managed<S, R, E, A>): Managed<S, unknown, E, A> =>
    toM<S, unknown, E, A>(() => fromM(ma)(r));
}

export const Do = () => DoG(managed);
export const For = () => ForM(managed);
export const sequenceS = SS(managed);
export const sequenceT = ST(managed);

export const parDo = () => DoG(parManaged);
export const parFor = () => ForM(parManaged);
export const parSequenceS = SS(parManaged);
export const parSequenceT = ST(parManaged);

export const sequenceOption = Op.option.sequence(managed);

export const traverseOption: <S, A, R, E, B>(
  f: (a: A) => Managed<S, R, E, B>
) => (ta: Op.Option<A>) => Managed<S, R, E, Op.Option<B>> = (f) => (ta) =>
  Op.option.traverse(managed)(ta, f);

export const wiltOption: <S, A, R, E, B, C>(
  f: (a: A) => Managed<S, R, E, Ei.Either<B, C>>
) => (wa: Op.Option<A>) => Managed<S, R, E, Separated<Op.Option<B>, Op.Option<C>>> = (f) => (wa) =>
  Op.option.wilt(managed)(wa, f);

export const witherOption: <S, A, R, E, B>(
  f: (a: A) => Managed<S, R, E, Op.Option<B>>
) => (ta: Op.Option<A>) => Managed<S, R, E, Op.Option<B>> = (f) => (ta) =>
  Op.option.wither(managed)(ta, f);

export const parSequenceOption = Op.option.sequence(parManaged);

export const parTraverseOption: <S, A, R, E, B>(
  f: (a: A) => Managed<S, R, E, B>
) => (ta: Op.Option<A>) => Managed<unknown, R, E, Op.Option<B>> = (f) => (ta) =>
  Op.option.traverse(parManaged)(ta, f);

export const parWiltOption: <S, A, R, E, B, C>(
  f: (a: A) => Managed<S, R, E, Ei.Either<B, C>>
) => (wa: Op.Option<A>) => Managed<unknown, R, E, Separated<Op.Option<B>, Op.Option<C>>> = (f) => (
  wa
) => Op.option.wilt(parManaged)(wa, f);

export const parWitherOption: <S, A, R, E, B>(
  f: (a: A) => Managed<S, R, E, Op.Option<B>>
) => (ta: Op.Option<A>) => Managed<unknown, R, E, Op.Option<B>> = (f) => (ta) =>
  Op.option.wither(parManaged)(ta, f);

export const sequenceEither = Ei.either.sequence(managed);

export const traverseEither: <S, A, R, FE, B>(
  f: (a: A) => Managed<S, R, FE, B>
) => <TE>(ta: Ei.Either<TE, A>) => Managed<S, R, FE, Ei.Either<TE, B>> = (f) => (ta) =>
  Ei.either.traverse(managed)(ta, f);

export const sequenceTree = TR.tree.sequence(managed);

export const traverseTree: <S, A, R, E, B>(
  f: (a: A) => Managed<S, R, E, B>
) => (ta: TR.Tree<A>) => Managed<S, R, E, TR.Tree<B>> = (f) => (ta) =>
  TR.tree.traverse(managed)(ta, f);

export const parSequenceEither = Ei.either.sequence(parManaged);

export const parTraverseEither: <S, A, R, FE, B>(
  f: (a: A) => Managed<S, R, FE, B>
) => <TE>(ta: Ei.Either<TE, A>) => Managed<unknown, R, FE, Ei.Either<TE, B>> = (f) => (ta) =>
  Ei.either.traverse(parManaged)(ta, f);

export const parSequenceTree = TR.tree.sequence(managed);

export const parTraverseTree: <S, A, R, E, B>(
  f: (a: A) => Managed<S, R, E, B>
) => (ta: TR.Tree<A>) => Managed<unknown, R, E, TR.Tree<B>> = (f) => (ta) =>
  TR.tree.traverse(parManaged)(ta, f);

export const sequenceArray = Ar.array.sequence(managed);

export const traverseArray: <S, A, R, E, B>(
  f: (a: A) => Managed<S, R, E, B>
) => (ta: Array<A>) => Managed<S, R, E, Array<B>> = (f) => (ta) =>
  Ar.array.traverse(managed)(ta, f);

export const traverseArrayWithIndex: <S, A, R, E, B>(
  f: (i: number, a: A) => Managed<S, R, E, B>
) => (ta: Array<A>) => Managed<S, R, E, Array<B>> = (f) => (ta) =>
  Ar.array.traverseWithIndex(managed)(ta, f);

export const wiltArray: <S, A, R, E, B, C>(
  f: (a: A) => Managed<S, R, E, Ei.Either<B, C>>
) => (wa: Array<A>) => Managed<S, R, E, Separated<Array<B>, Array<C>>> = (f) => (wa) =>
  Ar.array.wilt(managed)(wa, f);

export const witherArray: <S, A, R, E, B>(
  f: (a: A) => Managed<S, R, E, Op.Option<B>>
) => (ta: Array<A>) => Managed<S, R, E, Array<B>> = (f) => (ta) => Ar.array.wither(managed)(ta, f);

export const parSequenceArray = Ar.array.sequence(parManaged);

export const parTraverseArray: <S, A, R, E, B>(
  f: (a: A) => Managed<S, R, E, B>
) => (ta: Array<A>) => Managed<unknown, R, E, Array<B>> = (f) => (ta) =>
  Ar.array.traverse(parManaged)(ta, f);

export const parTraverseArrayWithIndex: <S, A, R, E, B>(
  f: (i: number, a: A) => Managed<S, R, E, B>
) => (ta: Array<A>) => Managed<unknown, R, E, Array<B>> = (f) => (ta) =>
  Ar.array.traverseWithIndex(parManaged)(ta, f);

export const parWiltArray: <S, A, R, E, B, C>(
  f: (a: A) => Managed<S, R, E, Ei.Either<B, C>>
) => (wa: Array<A>) => Managed<unknown, R, E, Separated<Array<B>, Array<C>>> = (f) => (wa) =>
  Ar.array.wilt(parManaged)(wa, f);

export const parWitherArray: <S, A, R, E, B>(
  f: (a: A) => Managed<S, R, E, Op.Option<B>>
) => (ta: Array<A>) => Managed<unknown, R, E, Array<B>> = (f) => (ta) =>
  Ar.array.wither(parManaged)(ta, f);

export const sequenceRecord = RE.record.sequence(managed);

export const traverseRecord: <A, S, R, E, B>(
  f: (a: A) => Managed<S, R, E, B>
) => (ta: Record<string, A>) => Managed<S, R, E, Record<string, B>> = (f) => (ta) =>
  RE.record.traverse(managed)(ta, f);

export const traverseRecordWithIndex: <A, S, R, E, B>(
  f: (k: string, a: A) => Managed<S, R, E, B>
) => (ta: Record<string, A>) => Managed<S, R, E, Record<string, B>> = (f) => (ta) =>
  RE.record.traverseWithIndex(managed)(ta, f);

export const wiltRecord: <A, S, R, E, B, C>(
  f: (a: A) => Managed<S, R, E, Ei.Either<B, C>>
) => (
  wa: Record<string, A>
) => Managed<S, R, E, Separated<Record<string, B>, Record<string, C>>> = (f) => (wa) =>
  RE.record.wilt(managed)(wa, f);

export const witherRecord: <A, S, R, E, B>(
  f: (a: A) => Managed<S, R, E, Op.Option<B>>
) => (ta: Record<string, A>) => Managed<S, R, E, Record<string, B>> = (f) => (ta) =>
  RE.record.wither(managed)(ta, f);

export const parSequenceRecord = RE.record.sequence(parManaged);

export const parTraverseRecord: <A, S, R, E, B>(
  f: (a: A) => Managed<S, R, E, B>
) => (ta: Record<string, A>) => Managed<unknown, R, E, Record<string, B>> = (f) => (ta) =>
  RE.record.traverse(parManaged)(ta, f);

export const parTraverseRecordWithIndex: <A, S, R, E, B>(
  f: (k: string, a: A) => Managed<S, R, E, B>
) => (ta: Record<string, A>) => Managed<unknown, R, E, Record<string, B>> = (f) => (ta) =>
  RE.record.traverseWithIndex(parManaged)(ta, f);

export const parWiltRecord: <A, S, R, E, B, C>(
  f: (a: A) => Managed<S, R, E, Ei.Either<B, C>>
) => (
  wa: Record<string, A>
) => Managed<unknown, R, E, Separated<Record<string, B>, Record<string, C>>> = (f) => (wa) =>
  RE.record.wilt(parManaged)(wa, f);

export const parWitherRecord: <A, S, R, E, B>(
  f: (a: A) => Managed<S, R, E, Op.Option<B>>
) => (ta: Record<string, A>) => Managed<unknown, R, E, Record<string, B>> = (f) => (ta) =>
  RE.record.wither(parManaged)(ta, f);

export const {
  ap,
  apFirst,
  apSecond,
  chain,
  chainFirst,
  flatten,
  map,
  filterOrElse,
  fromEither,
  fromOption,
  fromPredicate
} = pipeable(managed);

export const { ap: parAp, apFirst: parApFirst, apSecond: parApSecond } = pipeable(parManaged);
