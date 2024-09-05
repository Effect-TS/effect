import { flow, identity, pipe } from "effect/Function"

// We should only have one error for the missing definition.
const _x = (): number =>
  pipe(
    1,
    // @ts-expect-error
    add(1),
    identity
  )

// We should only have one error for the missing definition.
const _y = (): (n: number) => number =>
  flow(
    // @ts-expect-error
    add(1),
    identity
  )
