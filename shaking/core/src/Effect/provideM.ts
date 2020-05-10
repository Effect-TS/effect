import { Effect, Provider } from "../Support/Common/effect"

import { chain_ } from "./chain"
import { provideR } from "./provideR"

/**
 * Like provide where environment is resolved monadically
 */
export function provideM<S, R, R3, E2>(
  rm: Effect<S, R3, E2, R>,
  inverted: "regular" | "inverted" = "regular"
): Provider<R3, R, E2, S> {
  return <S2, R2, E, A>(
    eff: Effect<S2, R2 & R, E, A>
  ): Effect<S | S2, R2 & R3, E | E2, A> =>
    chain_(rm, (r) =>
      provideR((r2: R2) =>
        inverted === "inverted" ? { ...r, ...r2 } : { ...r2, ...r }
      )(eff)
    )
}
