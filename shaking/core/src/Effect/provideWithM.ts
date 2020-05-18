import { Effect, Provider } from "../Support/Common/effect"

import { accessM } from "./accessM"
import { provideM } from "./provideM"

export const provideWithM = <R2, S, R, E, A>(
  f: (_: R2) => Effect<S, R, E, A>,
  _: "regular" | "inverted" = "regular"
): Provider<R & R2, A, E, S> => provideM(accessM(f), _)
