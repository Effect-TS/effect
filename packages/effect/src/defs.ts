export enum EffectTag {
  Pure,
  PureOption,
  PureEither,
  Raised,
  Completed,
  Suspended,
  Async,
  Chain,
  Collapse,
  InterruptibleRegion,
  AccessInterruptible,
  AccessRuntime,
  AccessEnv,
  ProvideEnv,
  Map
}

export interface Effect<S, R, E, A> {
  _TAG: () => "Effect";
  _E: () => E;
  _A: () => A;
  _S: () => S;
  _R: (_: R) => void;
}

export interface Provider<Environment, Module, E2 = never, S2 = never> {
  <S, R, E, A>(e: Effect<S, Module & R, E, A>): Effect<S | S2, Environment & R, E | E2, A>;
}
