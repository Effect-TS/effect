import { XPureBase } from "@effect-ts/core/io-light/XPure/definition/base";

export type XPureInstruction =
  | Succeed<any>
  | Fail<any>
  | Log<any>
  | Modify<any, any, any, any>
  | FlatMap<any, any, any, any, any, any, any, any, any, any, any>
  | Fold<any, any, any, any, any, any, any, any, any, any, any>
  | Access<any, any, any, any, any, any>
  | Provide<any, any, any, any, any, any>
  | Suspend<any, any, any, any, any, any>;

export class Succeed<A> extends XPureBase<never, unknown, never, unknown, never, A> {
  readonly _xptag = "Succeed";

  constructor(readonly value: Lazy<A>, readonly trace?: string) {
    super();
  }
}

export class Log<W> extends XPureBase<W, unknown, never, unknown, never, never> {
  readonly _xptag = "Log";

  constructor(readonly w: Lazy<W>, readonly trace?: string) {
    super();
  }
}

export class Suspend<W, S1, S2, R, E, A> extends XPureBase<W, S1, S2, R, E, A> {
  readonly _xptag = "Suspend";

  constructor(readonly f: Lazy<XPure<W, S1, S2, R, E, A>>, readonly trace?: string) {
    super();
  }
}

export class Fail<E> extends XPureBase<never, unknown, never, unknown, E, never> {
  readonly _xptag = "Fail";

  constructor(readonly e: Lazy<E>, readonly trace?: string) {
    super();
  }
}

export class Modify<S1, S2, E, A> extends XPureBase<never, S1, S2, unknown, E, A> {
  readonly _xptag = "Modify";

  constructor(readonly run: (s1: S1) => Tuple<[S2, A]>, readonly trace?: string) {
    super();
  }
}

export class FlatMap<W, W2, S1, S2, S3, R, R1, E, E1, A, B> extends XPureBase<
  W | W2,
  S1,
  S3,
  R & R1,
  E1 | E,
  B
> {
  readonly _xptag = "FlatMap";

  constructor(
    readonly xpure: XPure<W, S1, S2, R, E, A>,
    readonly cont: (a: A) => XPure<W2, S2, S3, R1, E1, B>,
    readonly trace?: string
  ) {
    super();
  }
}

export class Fold<W, W1, W2, S1, S2, S3, R, E1, E2, A, B> extends XPureBase<
  W | W1 | W2,
  S1,
  S3,
  R,
  E2,
  B
> {
  readonly _xptag = "Fold";

  constructor(
    readonly xpure: XPure<W, S1, S2, R, E1, A>,
    readonly failure: (e: E1) => XPure<W1, S1, S3, R, E2, B>,
    readonly success: (a: A) => XPure<W2, S2, S3, R, E2, B>,
    readonly trace?: string
  ) {
    super();
  }
}

export class Access<W, S1, S2, R, E, A> extends XPureBase<W, S1, S2, R, E, A> {
  readonly _xptag = "Access";

  constructor(
    readonly access: (r: R) => XPure<W, S1, S2, R, E, A>,
    readonly trace?: string
  ) {
    super();
  }
}

export class Provide<W, S1, S2, R, E, A> extends XPureBase<W, S1, S2, unknown, E, A> {
  readonly _xptag = "Provide";

  constructor(
    readonly xpure: XPure<W, S1, S2, R, E, A>,
    readonly r: Lazy<R>,
    readonly trace?: string
  ) {
    super();
  }
}

/**
 * @tsplus macro remove
 */
export function concreteXPure<W, S1, S2, R, E, A>(
  _: XPure<W, S1, S2, R, E, A>
): asserts _ is
  | Succeed<A>
  | Fail<E>
  | Log<W>
  | Modify<S1, S2, E, A>
  | FlatMap<W, W, S1, unknown, S2, R, R, E, E, unknown, A>
  | Fold<W, W, W, S1, unknown, S2, R, unknown, E, unknown, A>
  | Access<W, S1, S2, R, E, A>
  | Provide<W, S1, S2, R, E, A>
  | Suspend<W, S1, S2, R, E, A>
{
  //
}
