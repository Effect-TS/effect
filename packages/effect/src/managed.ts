import { FunctionN, constant, identity } from "fp-ts/lib/function";
import { Semigroup } from "fp-ts/lib/Semigroup";
import { Monoid } from "fp-ts/lib/Monoid";
import { ExitTag, Exit, done } from "waveguide/lib/exit";

import * as T from "./";
import { Monad3E } from "./overload";
import { NoEnv } from ".";

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
export type Managed<R, E, A> = (
  _: R
) =>
  | Pure<R, E, A>
  | Encase<R, E, A>
  | Bracket<R, E, A>
  | Suspended<R, E, A>
  | Chain<R, E, any, A> // eslint-disable-line @typescript-eslint/no-explicit-any
  | BracketExit<R, E, A>;

export interface Pure<R, E, A> {
  readonly _tag: ManagedTag.Pure;
  readonly $R: (
    _: R
  ) => {
    readonly value: A;
  };
}

/**
 * Lift a pure value into a resource
 * @param value
 */
export function pure<R = T.NoEnv, E = T.NoErr, A = unknown>(
  value: A
): Managed<R, E, A> {
  return () => ({
    _tag: ManagedTag.Pure,
    $R: () => ({ value })
  });
}

export interface Encase<R, E, A> {
  readonly _tag: ManagedTag.Encase;
  readonly $R: (
    _: R
  ) => {
    readonly acquire: T.Effect<NoEnv, E, A>;
  };
}

/**
 * Create a Resource by wrapping an IO producing a value that does not need to be disposed
 *
 * @param res
 * @param f
 */
export function encaseEffect<R, E, A>(
  rio: T.Effect<R, E, A>
): Managed<R, E, A> {
  return () => ({
    _tag: ManagedTag.Encase,
    $R: r => ({
      acquire: T.provideAll(r)(rio)
    })
  });
}

export interface Bracket<R, E, A> {
  readonly _tag: ManagedTag.Bracket;
  readonly $R: (
    _: R
  ) => {
    readonly acquire: T.Effect<NoEnv, E, A>;
    readonly release: FunctionN<[A], T.Effect<NoEnv, E, unknown>>;
  };
}

/**
 * Create a resource from an acquisition and release function
 * @param acquire
 * @param release
 */
export function bracket<R, E, A, R2, E2>(
  acquire: T.Effect<R, E, A>,
  release: FunctionN<[A], T.Effect<R2, E2, unknown>>
): Managed<R & R2, E | E2, A> {
  return () => ({
    _tag: ManagedTag.Bracket,
    $R: r => ({
      acquire: T.provideAll(r)(acquire),
      release: a => T.provideAll(r)(release(a))
    })
  });
}

export interface BracketExit<R, E, A> {
  readonly _tag: ManagedTag.BracketExit;

  readonly $R: (
    _: R
  ) => {
    readonly acquire: T.Effect<R, E, A>;
    readonly release: FunctionN<[A, Exit<E, unknown>], T.Effect<R, E, unknown>>;
  };
}

export function bracketExit<R, E, A, R2, E2>(
  acquire: T.Effect<R, E, A>,
  release: FunctionN<[A, Exit<E, unknown>], T.Effect<R2, E2, unknown>>
): Managed<R & R2, E | E2, A> {
  return () => ({
    _tag: ManagedTag.BracketExit,
    $R: r => ({
      acquire: T.provideAll(r)(acquire),
      release: (a, e) => T.provideAll(r)(release(a, e as any))
    })
  });
}

export interface Suspended<R, E, A> {
  readonly _tag: ManagedTag.Suspended;

  readonly $R: (
    _: R
  ) => {
    readonly suspended: T.Effect<R, E, Managed<R, E, A>>;
  };
}

/**
 * Lift an IO of a Resource into a resource
 * @param suspended
 */
export function suspend<R, E, R2, E2, A>(
  suspended: T.Effect<R, E, Managed<R2, E2, A>>
): Managed<R & R2, E | E2, A> {
  return () => ({
    _tag: ManagedTag.Suspended,
    $R: r => ({
      suspended: T.provideAll(r)(
        suspended as T.Effect<R, E | E2, Managed<R2, E | E2, A>>
      )
    })
  });
}

export interface Chain<R, E, L, A> {
  readonly _tag: ManagedTag.Chain;
  readonly $R: (
    _: R
  ) => {
    readonly left: Managed<T.NoEnv, E, L>;
    readonly bind: FunctionN<[L], Managed<T.NoEnv, E, A>>;
  };
}

/**
 * Compose dependent resourcess.
 *
 * The scope of left will enclose the scope of the resource produced by bind
 * @param left
 * @param bind
 */
export function chain<R, E, L, R2, E2, A>(
  left: Managed<R, E, L>,
  bind: FunctionN<[L], Managed<R2, E2, A>>
): Managed<R & R2, E | E2, A> {
  return () => ({
    _tag: ManagedTag.Chain,
    $R: r => ({
      left: () => ({
        _tag: left({} as any)._tag,
        $R: _ => left({} as any).$R(r) as any
      }),
      bind: l => {
        const b = bind(l)({} as any);

        return () => ({
          _tag: b._tag,
          $R: _ => b.$R(r) as any
        });
      }
    })
  });
}

/**
 * Curried form of chain
 * @param bind
 */
export function chainWith<R, E, L, A>(
  bind: FunctionN<[L], Managed<R, E, A>>
): <R2, E2>(ma: Managed<R2, E2, L>) => Managed<R & R2, E | E2, A> {
  return left => chain(left, bind);
}

/**
 * Map a resource
 * @param res
 * @param f
 */
export function map<R, E, L, A>(
  res: Managed<R, E, L>,
  f: FunctionN<[L], A>
): Managed<R, E, A> {
  return chain(res, r => pure(f(r)) as Managed<R, E, A>);
}

/**
 * Curried form of mapWith
 * @param f
 */
export function mapWith<L, A>(
  f: FunctionN<[L], A>
): <R, E>(res: Managed<R, E, L>) => Managed<R, E, A> {
  return <R, E>(res: Managed<R, E, L>) => map(res, f);
}

/**
 * Zip two resources together with the given function.
 *
 * The scope of resa will enclose the scope of resb
 * @param resa
 * @param resb
 * @param f
 */
export function zipWith<R, E, A, R2, E2, B, C>(
  resa: Managed<R, E, A>,
  resb: Managed<R2, E2, B>,
  f: FunctionN<[A, B], C>
): Managed<R & R2, E | E2, C> {
  return chain(resa, a => map(resb, b => f(a, b)));
}

/**
 * Zip two resources together as a tuple.
 *
 * The scope of resa will enclose the scope of resb
 * @param resa
 * @param resb
 */
export function zip<R, E, A, R2, E2, B>(
  resa: Managed<R, E, A>,
  resb: Managed<R2, E2, B>
): Managed<R & R2, E | E2, readonly [A, B]> {
  return zipWith(resa, resb, (a, b) => [a, b] as const);
}

/**
 * Apply the function produced by resfab to the value produced by resa to produce a new resource.
 * @param resa
 * @param resfab
 */
export function ap<R, E, A, R2, E2, B>(
  resa: Managed<R, E, A>,
  resfab: Managed<R2, E2, FunctionN<[A], B>>
): Managed<R & R2, E | E2, B> {
  return zipWith(resa, resfab, (a, f) => f(a));
}

/**
 * Flipped version of ap
 * @param resfab
 * @param resa
 */
export function ap_<R, E, A, B, R2, E2>(
  resfab: Managed<R, E, FunctionN<[A], B>>,
  resa: Managed<R2, E2, A>
): Managed<R & R2, E | E2, B> {
  return zipWith(resfab, resa, (f, a) => f(a));
}

/**
 * Map a resource to a static value
 *
 * This creates a resource of the provided constant b where the produced A has the same lifetime internally
 * @param fa
 * @param b
 */
export function as<R, E, A, B>(fa: Managed<R, E, A>, b: B): Managed<R, E, B> {
  return map(fa, constant(b));
}

/**
 * Curried form of as
 * @param b
 */
export function to<B>(
  b: B
): <R, E, A>(fa: Managed<R, E, A>) => Managed<R, E, B> {
  return fa => as(fa, b);
}

/**
 * Construct a new 'hidden' resource using the produced A with a nested lifetime
 * Useful for performing initialization and cleanup that clients don't need to see
 * @param left
 * @param bind
 */
export function chainTap<R, E, A, R2, E2>(
  left: Managed<R, E, A>,
  bind: FunctionN<[A], Managed<R2, E2, unknown>>
): Managed<R & R2, E | E2, A> {
  return chain(left, a => as(bind(a), a));
}

/**
 * Curried form of chainTap
 * @param bind
 */
export function chainTapWith<R, E, A>(
  bind: FunctionN<[A], Managed<R, E, unknown>>
): FunctionN<[Managed<R, E, A>], Managed<R, E, A>> {
  return inner => chainTap(inner, bind);
}

/**
 * Curried data last form of use
 * @param f
 */
export function consume<R, E, A, B>(
  f: FunctionN<[A], T.Effect<R, E, B>>
): <R2, E2>(ma: Managed<R2, E2, A>) => T.Effect<R & R2, E | E2, B> {
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  return r => use(r, f);
}

/**
 * Create a Resource from the fiber of an IO.
 * The acquisition of this resource corresponds to forking rio into a fiber.
 * The destruction of the resource is interrupting said fiber.
 * @param rio
 */
export function fiber<R, E, A>(
  rio: T.Effect<R, E, A>
): Managed<R, never, T.Fiber<E, A>> {
  return bracket(T.fork(rio), fiber => fiber.interrupt);
}

/**
 * Use a resource to produce a program that can be run.s
 * @param res
 * @param f
 */
export function use<R, E, A, R2, E2, B>(
  res: Managed<R, E, A>,
  f: FunctionN<[A], T.Effect<R2, E2, B>>
): T.Effect<R & R2, E | E2, B> {
  const c = res({} as any);

  switch (c._tag) {
    case ManagedTag.Pure:
      return T.accessM((r: R & R2) => f(c.$R(r).value));
    case ManagedTag.Encase:
      return T.accessM((r: R & R2) => T.chain(c.$R(r).acquire, f));
    case ManagedTag.Bracket:
      return T.accessM((r: R & R2) => {
        const p = c.$R(r);
        return T.bracket(p.acquire, p.release, f);
      });
    case ManagedTag.BracketExit:
      return T.accessM((r: R & R2) => {
        const p = c.$R(r);

        return T.bracketExit(p.acquire, (a, e) => p.release(a, e as any), f);
      });
    case ManagedTag.Suspended:
      return T.accessM((r: R & R2) => {
        const p = c.$R(r);

        return T.chain(p.suspended, consume(f));
      });
    case ManagedTag.Chain:
      return T.accessM((r: R & R2) => {
        const p = c.$R(r);

        return use(p.left, a => use(p.bind(a), f));
      });
  }
}

export interface Leak<R, E, A> {
  a: A;
  release: T.Effect<R, E, unknown>;
}

/**
 * Create an IO action that will produce the resource for this managed along with its finalizer
 * action seperately.
 *
 * If an error occurs during allocation then any allocated resources should be cleaned up, but once the
 * Leak object is produced it is the callers responsibility to ensure release is invoked.
 * @param res
 */
export function allocate<R, E, A>(
  res: Managed<R, E, A>
): T.Effect<R, E, Leak<R, E, A>> {
  const c = res({} as any);

  switch (c._tag) {
    case ManagedTag.Pure:
      return T.accessM((r: R) => {
        const p = c.$R(r);

        return T.pure({ a: p.value, release: T.unit });
      });
    case ManagedTag.Encase:
      return T.accessM((r: R) => {
        const p = c.$R(r);

        return T.map(p.acquire, a => ({ a, release: T.unit }));
      });
    case ManagedTag.Bracket:
      return T.accessM((r: R) => {
        const p = c.$R(r);

        return T.map(p.acquire, a => ({ a, release: p.release(a) }));
      });
    case ManagedTag.BracketExit:
      // best effort, because we cannot know what the exit status here
      return T.accessM((r: R) => {
        const p = c.$R(r);

        return T.map(p.acquire, a => ({
          a,
          release: p.release(a, done(undefined))
        }));
      });
    case ManagedTag.Suspended:
      return T.accessM((r: R) => {
        const p = c.$R(r);

        return T.chain(p.suspended, wm => allocate(wm));
      });
    case ManagedTag.Chain:
      return T.accessM((r: R) => {
        const p = c.$R(r);

        return T.bracketExit(
          allocate(p.left),
          (leak, exit) => (exit._tag === ExitTag.Done ? T.unit : leak.release),
          leak =>
            T.map(
              allocate(p.bind(leak.a)),
              // Combine the finalizer actions of the outer and inner resource
              innerLeak => ({
                a: innerLeak.a,
                release: T.onComplete(innerLeak.release, leak.release)
              })
            )
        );
      });
  }
}

/**
 * Use a resource to provide the environment to a WaveR
 * @param man
 * @param ma
 */
export function provideTo<R, E, R2 extends T.Env, A, E2>(
  man: Managed<R, E, R2>,
  ma: T.Effect<R2, E2, A>
): T.Effect<R, E | E2, A> {
  return use(man, r => T.provideAll(r)(ma));
}

export const URI = "matechs/Managed";
export type URI = typeof URI;

declare module "fp-ts/lib/HKT" {
  interface URItoKind3<R, E, A> {
    [URI]: Managed<R, E, A>;
  }
}

export const managedMonad: Monad3E<URI> = {
  URI,
  of: pure,
  map,
  ap: ap_,
  chain
} as const;

export function getSemigroup<R, E, A>(
  Semigroup: Semigroup<A>
): Semigroup<Managed<R, E, A>> {
  return {
    concat(x: Managed<R, E, A>, y: Managed<R, E, A>): Managed<R, E, A> {
      return zipWith(x, y, Semigroup.concat);
    }
  };
}

export function getMonoid<R, E, A>(
  Monoid: Monoid<A>
): Monoid<Managed<R, E, A>> {
  return {
    ...getSemigroup(Monoid),
    empty: pure(Monoid.empty) as Managed<R, E, A>
  };
}

export function provideAll<R>(
  r: R
): <E, A>(ma: Managed<R, E, A>) => Managed<T.NoEnv, E, A> {
  return ma =>
    ({
      ...ma,
      env: r
    } as any);
}
