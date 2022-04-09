/**
 * @tsplus type ets/Exit
 */
export type Exit<E, A> = Success<A> | Failure<E>;

/**
 * @tsplus type ets/Exit/Ops
 */
export interface ExitOps {
  $: ExitAspects;
}
export const Exit: ExitOps = {
  $: {}
};

/**
 * @tsplus type ets/Exit/Aspects
 */
export interface ExitAspects {}

/**
 * @tsplus type ets/Exit/Success
 */
export class Success<A> implements Equals {
  readonly _tag = "Success";

  constructor(readonly value: A) {}

  [Hash.sym](): number {
    return Hash.unknown(this.value);
  }

  [Equals.sym](that: unknown): boolean {
    return that instanceof Success && Equals.equals(this.value, that.value);
  }
}

/**
 * @tsplus type ets/Exit/Failure
 */
export class Failure<E> implements Equals {
  readonly _tag = "Failure";

  constructor(readonly cause: Cause<E>) {}

  [Hash.sym](): number {
    return Hash.unknown(this.cause);
  }

  [Equals.sym](that: unknown): boolean {
    return that instanceof Failure && Equals.equals(this.cause, that.cause);
  }
}

/**
 * @tsplus unify ets/Exit
 * @tsplus unify ets/Exit/Success
 * @tsplus unify ets/Exit/Failure
 */
export function unifyExit<X extends Exit<any, any>>(
  self: X
): Exit<
  [X] extends [Exit<infer EX, any>] ? EX : never,
  [X] extends [Exit<any, infer AX>] ? AX : never
> {
  return self;
}
