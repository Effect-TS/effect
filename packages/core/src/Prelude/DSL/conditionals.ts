// ets_tracing: off

import type { Base, Infer, Kind, URIS } from "../HKT/index.js"

export function conditionalF<URI extends URIS, C>(_: Base<URI, C>) {
  return <
      X extends Kind<URI, C, any, any, any, any, any, any, any, any, any>,
      Y extends Kind<URI, C, any, any, any, any, any, any, any, any, any>
    >(
      onTrue: () => X,
      onFalse: () => Y
    ): ((
      predicate: boolean
    ) => Kind<
      URI,
      C,
      Infer<URI, C, "K", X | Y>,
      Infer<URI, C, "Q", X | Y>,
      Infer<URI, C, "W", X | Y>,
      Infer<URI, C, "X", X | Y>,
      Infer<URI, C, "I", X | Y>,
      Infer<URI, C, "S", X | Y>,
      Infer<URI, C, "R", X | Y>,
      Infer<URI, C, "E", X | Y>,
      Infer<URI, C, "A", X | Y>
    >) =>
    (b) =>
      b ? onTrue() : onFalse()
}

export function conditionalF_<URI extends URIS, C>(_: Base<URI, C>) {
  return <
    X extends Kind<URI, C, any, any, any, any, any, any, any, any, any>,
    Y extends Kind<URI, C, any, any, any, any, any, any, any, any, any>
  >(
    predicate: boolean,
    onTrue: () => X,
    onFalse: () => Y
  ): Kind<
    URI,
    C,
    Infer<URI, C, "K", X | Y>,
    Infer<URI, C, "Q", X | Y>,
    Infer<URI, C, "W", X | Y>,
    Infer<URI, C, "X", X | Y>,
    Infer<URI, C, "I", X | Y>,
    Infer<URI, C, "S", X | Y>,
    Infer<URI, C, "R", X | Y>,
    Infer<URI, C, "E", X | Y>,
    Infer<URI, C, "A", X | Y>
  > => (predicate ? onTrue() : onFalse())
}
