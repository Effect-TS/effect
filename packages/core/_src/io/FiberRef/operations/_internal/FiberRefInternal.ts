import { _A, FiberRefSym } from "@effect-ts/core/io/FiberRef/definition";

export class FiberRefInternal<A> implements FiberRef<A> {
  readonly [FiberRefSym]: FiberRefSym = FiberRefSym;
  readonly [_A]!: () => A;

  constructor(
    readonly _initial: A,
    readonly _fork: (a: A) => A,
    readonly _join: (left: A, right: A) => A
  ) {}
}

/**
 * @tsplus macro remove
 */
export function concreteFiberRef<A>(_: FiberRef<A>): asserts _ is FiberRefInternal<A> {
  //
}
