// ets_tracing: off

import { constant, identity } from "@effect-ts/system/Function"
import * as X from "@effect-ts/system/Sync"

import * as P from "../../PreludeV2/index.js"

export interface SyncF extends P.HKT {
  readonly type: X.Sync<this["R"], this["E"], this["A"]>
}
export const Any = P.instance<P.Any<SyncF>>({
  any: () => X.succeed(constant({}))
})

export const Covariant = P.instance<P.Covariant<SyncF>>({
  map: X.map
})

export const AssociativeBoth = P.instance<P.AssociativeBoth<SyncF>>({
  both: X.zip
})

export const AssociativeEither = P.instance<P.AssociativeEither<SyncF>>({
  orElseEither: X.orElseEither
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<SyncF>>({
  flatten: (ffa) => X.chain_(ffa, identity)
})

export const Applicative = P.instance<P.Applicative<SyncF>>({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})

export const Access = P.instance<P.FX.Access<SyncF>>({
  access: X.access
})

export const Fail = P.instance<P.FX.Fail<SyncF>>({
  fail: X.fail
})

export const Run = P.instance<P.FX.Run<SyncF>>({
  either: X.either
})

export const Provide = P.instance<P.FX.Provide<SyncF>>({
  provide: X.provideAll
})

export const Monad = P.instance<P.Monad<SyncF>>({
  ...Any,
  ...AssociativeFlatten,
  ...Covariant
})
