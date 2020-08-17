import { AnyK } from "../_abstract/Any"
import { ApplicativeK } from "../_abstract/Applicative"
import { AssociativeBothK } from "../_abstract/AssociativeBoth"
import { CovariantK } from "../_abstract/Covariant"
import { instance } from "../_abstract/HKT"
import * as T from "../_system/Effect"
import * as L from "../_system/Layer"
import * as M from "../_system/Managed"

export const LayerURI = "Layer"
export type LayerURI = typeof LayerURI

declare module "../_abstract/HKT" {
  interface URItoKind<
    TL0,
    TL1,
    TL2,
    TL3,
    K,
    NK extends string,
    SI,
    SO,
    X,
    I,
    S,
    Env,
    Err,
    Out
  > {
    [LayerURI]: L.Layer<X, Env, Err, Out>
  }
}

export const AssociativeBoth = instance<AssociativeBothK<LayerURI>>({
  both: L.zip
})

export const Any = instance<AnyK<LayerURI>>({
  any: () => L.fromEffectEnv(T.succeed({}))
})

export const Covariant = instance<CovariantK<LayerURI>>({
  map: <A, B>(f: (a: A) => B) => <X, Env, Err>(
    fa: L.Layer<X, Env, Err, A>
  ): L.Layer<X, Env, Err, B> => new L.Layer(M.map_(fa.build, f))
})

export const Applicative = instance<ApplicativeK<LayerURI>>({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})
