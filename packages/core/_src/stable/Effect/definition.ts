/**
 * @tsplus type Effectect/core/stable/Effect.Ops
 */
export interface EffectOps {
  readonly TypeIdentifier: unique symbol
}

export const Effect2: EffectOps = {
  TypeIdentifier: Symbol.for("@Effectect/core/stable/Effectect.Identifier") as EffectOps["TypeIdentifier"]
}

export namespace Effect2 {
  export type TypeIdentifier = typeof Effect2.TypeIdentifier
}

export interface EffectMarker<out R, out E, out A> {
  _R(_: never): R
  _E(_: never): E
  _A(_: never): A
}

export const EffectMarker: EffectMarker<never, never, never> = {
  _R: (_) => _,
  _E: (_) => _,
  _A: (_) => _
}

export const enum EffectOpCode {
  Sync,
  Async,
  OnSuccessAndFailure,
  OnSuccess,
  OnFailure
}
/**
 * @tsplus type Effectect/core/stable/Effect
 */

export interface Effect2<out R, out E, out A> {
  get OpCode(): EffectOpCode
  get [Effect2.TypeIdentifier](): EffectMarker<R, E, A>
}

export class OpSync<A> implements Effect2<never, never, A> {
  get OpCode() {
    return EffectOpCode.Sync
  }
  get [Effect2.TypeIdentifier]() {
    return EffectMarker
  }
  constructor(
    readonly evaluate: () => A
  ) {}
}

export class OpAsync<R, E, A> implements Effect2<R, E, A> {
  get OpCode() {
    return EffectOpCode.Async
  }
  get [Effect2.TypeIdentifier]() {
    return EffectMarker
  }
  constructor(
    readonly registerCallback: (resume: (Effectect: Effect2<R, E, A>) => void) => void,
    readonly blockingOn: FiberId
  ) {}
}

export class OpOnSuccessAndFailure<R, E, A, R1, E1, A1, R2, E2, A2> implements Effect2<R | R1 | R2, E1 | E2, A1 | A2> {
  get OpCode() {
    return EffectOpCode.OnSuccessAndFailure
  }
  get [Effect2.TypeIdentifier]() {
    return EffectMarker
  }
  constructor(
    readonly first: Effect2<R, E, A>,
    readonly failureK: (e: Cause<E>) => Effect2<R1, E1, A1>,
    readonly successK: (a: A) => Effect2<R2, E2, A2>
  ) {}
}

export class OpOnSuccess<R, E, A, R1, E1, A1> implements Effect2<R | R1, E | E1, A1> {
  get OpCode() {
    return EffectOpCode.OnSuccess
  }
  get [Effect2.TypeIdentifier]() {
    return EffectMarker
  }
  constructor(
    readonly first: Effect2<R, E, A>,
    readonly successK: (a: A) => Effect2<R1, E1, A1>
  ) {}
}

export class OpOnFailure<R, E, A, R1, E1, A1> implements Effect2<R | R1, E1, A | A1> {
  get OpCode() {
    return EffectOpCode.OnSuccessAndFailure
  }
  get [Effect2.TypeIdentifier]() {
    return EffectMarker
  }
  constructor(
    readonly first: Effect2<R, E, A>,
    readonly failureK: (e: Cause<E>) => Effect2<R1, E1, A1>
  ) {}
}
