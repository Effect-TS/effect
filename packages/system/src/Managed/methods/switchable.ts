import { sequential } from "../../Effect/ExecutionStrategy"
import { pipe } from "../../Function"
import { fold } from "../../Option"
import { map } from "../core"
import * as T from "../deps"
import * as Do from "../do"
import type { AsyncR, Managed } from "../managed"
import { makeReleaseMap } from "../releaseMap"
import { releaseMap } from "./releaseMap"

export const switchable = <S, R, E, A>(): AsyncR<
  R,
  (x: Managed<S, R, E, A>) => T.AsyncRE<R, E, A>
> =>
  pipe(
    Do.of,
    Do.bind("releaseMap", () => releaseMap),
    Do.bind("key", ({ releaseMap }) =>
      pipe(
        releaseMap.addIfOpen((_) => T.unit),
        T.chain(fold(() => T.interrupt, T.succeedNow)),
        T.toManaged()
      )
    ),
    map(({ key, releaseMap }) => (newResource) =>
      T.uninterruptibleMask(({ restore }) =>
        pipe(
          releaseMap.replace(key, (_) => T.unit),
          T.chain(
            fold(
              () => T.unit,
              (fin) => fin(T.exitUnit)
            )
          ),
          T.zipSecond(T.of),
          T.bind("r", () => T.environment<R>()),
          T.bind("inner", () => makeReleaseMap),
          T.bind("a", ({ inner, r }) =>
            restore(T.provideAll_(newResource.effect, [r, inner]))
          ),
          T.tap(({ inner }) =>
            releaseMap.replace(key, (exit) => inner.releaseAll(exit, sequential))
          ),
          T.map(({ a }) => a[1])
        )
      )
    )
  )
