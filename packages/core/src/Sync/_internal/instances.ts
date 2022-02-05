// ets_tracing: off

import { constant, identity } from "@effect-ts/system/Function"
import * as X from "@effect-ts/system/Sync"

import type { SyncURI } from "../../Modules/index.js"
import type { URI } from "../../Prelude/index.js"
import * as P from "../../Prelude/index.js"

export type V = P.V<"R", "-"> & P.V<"E", "+">

export const Any = P.instance<P.Any<[URI<SyncURI>], V>>({
  any: () => X.succeed(constant({}))
})

export const Covariant = P.instance<P.Covariant<[URI<SyncURI>], V>>({
  map: X.map
})

export const AssociativeBoth = P.instance<P.AssociativeBoth<[URI<SyncURI>], V>>({
  both: X.zip
})

export const AssociativeEither = P.instance<P.AssociativeEither<[URI<SyncURI>], V>>({
  orElseEither: X.orElseEither
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<[URI<SyncURI>], V>>({
  flatten: (ffa) => X.chain_(ffa, identity)
})

export const Applicative = P.instance<P.Applicative<[URI<SyncURI>], V>>({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})

export const Access = P.instance<P.FX.Access<[URI<SyncURI>], V>>({
  access: X.access
})

export const Fail = P.instance<P.FX.Fail<[URI<SyncURI>], V>>({
  fail: X.fail
})

export const Run = P.instance<P.FX.Run<[URI<SyncURI>], V>>({
  either: X.either
})

export const Provide = P.instance<P.FX.Provide<[URI<SyncURI>], V>>({
  provide: X.provideAll
})

export const Monad = P.instance<P.Monad<[URI<SyncURI>], V>>({
  ...Any,
  ...AssociativeFlatten,
  ...Covariant
})
