import type { EffectURI } from "@effect/core/io/Effect/definition/base";
import { _A, _E, _R, _S1, _S2, _U, _W } from "@effect/core/io/Effect/definition/base";

/**
 * `XPure<W, S1, S2, R, E, A>` is a purely functional description of a
 * computation that requires an environment `R` and an initial state `S1` and
 * may either fail with an `E` or succeed with an updated state `S2` and an `A`
 * along with in either case a log with entries of type `W`. Because of its
 * polymorphism `XPure` can be used to model a variety of effects including
 * context, state, failure, and logging.
 *
 * @tsplus type ets/XPure
 */
export interface XPure<W, S1, S2, R, E, A> {
  readonly _tag: "XPure";

  readonly [_S1]: (_: S1) => void;
  readonly [_S2]: () => S2;

  readonly [_U]: EffectURI;
  readonly [_W]: () => W;
  readonly [_R]: (_: R) => void;
  readonly [_E]: () => E;
  readonly [_A]: () => A;
}

/**
 * @tsplus unify ets/XPure
 */
export function unifyXPure<X extends XPure<any, any, any, any, any, any>>(
  self: X
): XPure<
  [X] extends [{ [k in typeof _W]: () => infer W; }] ? W : never,
  [X] extends [{ [k in typeof _S1]: (_: infer S1) => void; }] ? S1 : never,
  [X] extends [{ [k in typeof _S2]: () => infer S2; }] ? S2 : never,
  [X] extends [{ [k in typeof _R]: (_: infer R) => void; }] ? R : never,
  [X] extends [{ [k in typeof _E]: () => infer E; }] ? E : never,
  [X] extends [{ [k in typeof _A]: () => infer A; }] ? A : never
> {
  return self;
}

export abstract class XPureBase<W, S1, S2, R, E, A> implements XPure<W, S1, S2, R, E, A> {
  readonly _tag = "XPure";

  readonly [_S1]!: (_: S1) => void;
  readonly [_S2]!: () => S2;

  readonly [_U]!: EffectURI;
  readonly [_W]!: () => W;
  readonly [_R]!: (_: R) => void;
  readonly [_E]!: () => E;
  readonly [_A]!: () => A;
}

/**
 * @tsplus type ets/XPure/Ops
 */
export interface XPureOps {
  $: XPureAspects;
}
export const XPure: XPureOps = {
  $: {}
};

/**
 * @tsplus type ets/XPure/Aspects
 */
export interface XPureAspects {}
