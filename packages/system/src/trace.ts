// trace :: T -> Effect

import * as T from "./Effect"
import { pipe } from "./Function"

pipe(
  T.succeed(0),
  T.chain((n) => T.succeed(n + 1)),
  T.chain((n) => T.succeed(n + 1)),
  T.chain((n) => T.succeed(n + 1)),
  T.map((n) => n + 1),
  T.chain(() => T.tuple(T.succeed(0), T.succeed(1)))
)
