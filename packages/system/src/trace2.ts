// trace :: T -> Effect
import * as T from "./Effect"
import { pipe } from "./Function"

pipe(
  T.succeed("/home/ma/os/matechs-effect/packages/system/src/trace.ts:7:3", 0),
  T.chain("/home/ma/os/matechs-effect/packages/system/src/trace.ts:8:3", (n) =>
    T.succeed("/home/ma/os/matechs-effect/packages/system/src/trace.ts:8:18", n + 1)
  ),
  T.chain("/home/ma/os/matechs-effect/packages/system/src/trace.ts:9:3", (n) =>
    T.succeed("/home/ma/os/matechs-effect/packages/system/src/trace.ts:9:18", n + 1)
  ),
  T.chain("/home/ma/os/matechs-effect/packages/system/src/trace.ts:10:3", (n) =>
    T.succeed("/home/ma/os/matechs-effect/packages/system/src/trace.ts:10:18", n + 1)
  ),
  T.map("/home/ma/os/matechs-effect/packages/system/src/trace.ts:11:3", (n) => n + 1),
  T.chain("/home/ma/os/matechs-effect/packages/system/src/trace.ts:12:3", () =>
    T.tuple(
      T.succeed("/home/ma/os/matechs-effect/packages/system/src/trace.ts:12:25", 0),
      T.succeed("/home/ma/os/matechs-effect/packages/system/src/trace.ts:12:39", 1),
      "/home/ma/os/matechs-effect/packages/system/src/trace.ts:12:17"
    )
  )
)
