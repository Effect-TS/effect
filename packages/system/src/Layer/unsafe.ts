// ets_tracing: off

import * as Tp from "../Collections/Immutable/Tuple/index.js"
import * as Ex from "../Exit/index.js"
import * as F from "../Fiber/index.js"
import type { State } from "../Managed/ReleaseMap/index.js"
import { releaseAll, ReleaseMap, Running } from "../Managed/ReleaseMap/index.js"
import * as P from "../Promise/index.js"
import * as Ref from "../Ref/index.js"
import * as L from "./core.js"
import type { Layer } from "./definitions.js"
import * as T from "./deps-effect.js"

export class MainProvider<R1, E, R> {
  constructor(
    readonly allocate: T.Effect<R1 & T.DefaultEnv, E, boolean>,
    readonly release: T.UIO<void>,
    readonly provide: <R2, E1, A1>(
      self: T.Effect<R & R2 & T.DefaultEnv, E1, A1>
    ) => T.Effect<R2, E | E1, A1>
  ) {}
}

/**
 * Unsafely returns a `MainProvider` to be used in frontend-like
 * contexts where initialization needs to be global and sync
 */
export function unsafeMainProvider<R1, E, R>(self: Layer<R1, E, R>) {
  const promise = P.unsafeMake<E, R & T.DefaultEnv>(F.None)
  const relMap = new ReleaseMap(Ref.unsafeMakeRef<State>(new Running(0, new Map())))

  return new MainProvider<R1, E, R>(
    T.map_(
      T.provideSome_(
        L.build(self["+++"](L.identity<T.DefaultEnv>())).effect,
        (r: R1 & T.DefaultEnv) => Tp.tuple(r, relMap)
      ),
      (_) => _.get(1)
    )["|>"](
      T.foldCauseM(
        (cause) => P.halt_(promise, cause)["|>"](T.chain(() => T.halt(cause))),
        (r) => P.succeed(r)(promise)
      )
    ),
    T.descriptorWith((d) =>
      releaseAll(Ex.interrupt(d.id), T.sequential)(relMap)["|>"](T.asUnit)
    ),
    (self) => T.chain_(P.await(promise), (env) => T.provide(env)(self))
  )
}
