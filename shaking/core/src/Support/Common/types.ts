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

export const EffectURI = "@matechs/core/EffectURI"
export const ManagedURI = "@matechs/core/ManagedURI"
export const StreamURI = "@matechs/core/StreamURI"
export const StreamEitherURI = "@matechs/core/StreamEitherURI"

export type EffectURI = typeof EffectURI
export type ManagedURI = typeof ManagedURI
export type StreamURI = typeof StreamURI
export type StreamEitherURI = typeof StreamEitherURI
