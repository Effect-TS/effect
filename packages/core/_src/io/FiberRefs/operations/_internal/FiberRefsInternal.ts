import { FiberRefsSym } from "@effect/core/io/FiberRefs/definition"

export class FiberRefsInternal implements FiberRefs {
  readonly [FiberRefsSym]: FiberRefsSym = FiberRefsSym

  constructor(
    readonly fiberRefLocals: ImmutableMap<
      FiberRef<any>,
      List.NonEmpty<Tuple<[FiberId.Runtime, unknown]>>
    >
  ) {}
}

/**
 * @tsplus macro remove
 */
export function concreteFiberRefs(_: FiberRefs): asserts _ is FiberRefsInternal {
  //
}
