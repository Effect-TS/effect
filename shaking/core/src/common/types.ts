export interface Effect<S, R, E, A> {
  _TAG: () => "Effect"
  _E: () => E
  _A: () => A
  _S: () => S
  _R: (_: R) => void
}

export interface Managed<S, R, E, A> {
  _TAG: () => "Managed"
  _E: () => E
  _A: () => A
  _S: () => S
  _R: (_: R) => void
}

export interface Stream<S, R, E, A> {
  _TAG: () => "Stream"
  _E: () => E
  _A: () => A
  _S: () => S
  _R: (_: R) => void
}

export interface StreamEither<S, R, E, A> {
  _TAG: () => "StreamEither"
  _E: () => E
  _A: () => A
  _S: () => S
  _R: (_: R) => void
}

export interface StreamEither<S, R, E, A> {
  _TAG: () => "StreamEither"
  _E: () => E
  _A: () => A
  _S: () => S
  _R: (_: R) => void
}
