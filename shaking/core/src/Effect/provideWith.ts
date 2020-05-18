import { Provider } from "../Support/Common/effect"

import { access } from "./access"
import { provideM } from "./provideM"

export const provideWith = <R, A>(
  f: (_: R) => A,
  _: "regular" | "inverted" = "regular"
): Provider<R, A, never, never> => provideM(access(f), _)
