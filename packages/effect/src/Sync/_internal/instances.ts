import { constant, identity } from "@effect-ts/system/Function"
import * as X from "@effect-ts/system/Sync"

import type { SyncURI } from "../../Modules"
import * as P from "../../Prelude"

export type V = P.V<"R", "-"> & P.V<"E", "+">

export const Any = P.instance<P.Any<[SyncURI], V>>({
  any: () => X.succeed(constant({}))
})

export const Covariant = P.instance<P.Covariant<[SyncURI], V>>({
  map: X.map
})

export const AssociativeBoth = P.instance<P.AssociativeBoth<[SyncURI], V>>({
  both: X.zip
})

export const AssociativeEither = P.instance<P.AssociativeEither<[SyncURI], V>>({
  orElseEither: X.orElseEither
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<[SyncURI], V>>({
  flatten: (ffa) => X.chain_(ffa, identity)
})

export const Applicative = P.instance<P.Applicative<[SyncURI], V>>({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})

export const Access = P.instance<P.FX.Access<[SyncURI], V>>({
  access: X.access
})

export const Fail = P.instance<P.FX.Fail<[SyncURI], V>>({
  fail: X.fail
})

export const Run = P.instance<P.FX.Run<[SyncURI], V>>({
  either: X.either
})

export const Provide = P.instance<P.FX.Provide<[SyncURI], V>>({
  provide: X.provideAll
})

export const Monad = P.instance<P.Monad<[SyncURI], V>>({
  ...Any,
  ...AssociativeFlatten,
  ...Covariant
})
