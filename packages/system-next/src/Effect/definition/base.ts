import { _A, _E, _R, _S1, _S2, _U, _W } from "./commons"

export const EffectURI = "Effect"
export type EffectURI = typeof EffectURI

/**
 * An`Effect<R, E, A>` value is an immutable value that lazily describes a
 * workflow or job. The workflow requires some environment `R`, and may fail
 * with an error of type `E`, or succeed with a value of type `A`.
 *
 * These lazy workflows, referred to as _effects_, can be informally thought of
 * as functions in the form:
 *
 * ```typescript
 * (environment: R) => Either<E, A>
 * ```
 *
 * Effects model resourceful interaction with the outside world, including
 * synchronous, asynchronous, concurrent, and parallel interaction.
 *
 * Effects use a fiber-based concurrency model, with built-in support for
 * scheduling, fine-grained interruption, structured concurrency, and high
 * scalability.
 *
 * To run an effect, you need a `Runtime`, which is capable of executing
 * effects.
 */
export interface Effect<R, E, A> {
  readonly [_U]: EffectURI
  readonly [_E]: () => E
  readonly [_A]: () => A
  readonly [_R]: (_: R) => void

  readonly [_S1]: (_: unknown) => void
  readonly [_S2]: () => unknown
  readonly [_W]: () => unknown
}

export type IO<E, A> = Effect<unknown, E, A>
export type RIO<R, A> = Effect<R, never, A>
export type UIO<A> = Effect<unknown, never, A>

export abstract class Base<R, E, A> implements Effect<R, E, A> {
  readonly [_S1]!: (_: unknown) => void;
  readonly [_S2]!: () => unknown;
  readonly [_W]: () => unknown;

  readonly [_U]: EffectURI;
  readonly [_E]: () => E;
  readonly [_A]: () => A;
  readonly [_R]: (_: R) => void
}
