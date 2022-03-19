// ets_tracing: off

import type * as HKT from "../HKT/index.js"

export function conditionalF<F extends HKT.HKT>() {
  return <
      X extends HKT.Kind<F, any, any, any, any, any>,
      Y extends HKT.Kind<F, any, any, any, any, any>
    >(
      onTrue: () => X,
      onFalse: () => Y
    ): ((
      predicate: boolean
    ) => HKT.Kind<
      F,
      HKT.Infer<F, "X", X | Y>,
      HKT.Infer<F, "I", X | Y>,
      HKT.Infer<F, "R", X | Y>,
      HKT.Infer<F, "E", X | Y>,
      HKT.Infer<F, "A", X | Y>
    >) =>
    (b) =>
      b ? onTrue() : onFalse()
}

export function conditionalF_<F extends HKT.HKT>() {
  return <
    X extends HKT.Kind<F, any, any, any, any, any>,
    Y extends HKT.Kind<F, any, any, any, any, any>
  >(
    predicate: boolean,
    onTrue: () => X,
    onFalse: () => Y
  ): HKT.Kind<
    F,
    HKT.Infer<F, "X", X | Y>,
    HKT.Infer<F, "I", X | Y>,
    HKT.Infer<F, "R", X | Y>,
    HKT.Infer<F, "E", X | Y>,
    HKT.Infer<F, "A", X | Y>
  > => (predicate ? onTrue() : onFalse())
}
