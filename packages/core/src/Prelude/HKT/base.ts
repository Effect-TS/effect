// ets_tracing: off

export interface Auto {}

export interface Base<F, C = Auto> {
  _F: F
  _C: C
}

export interface CompositionBase2<F, G, CF = Auto, CG = Auto> {
  _F: F
  _G: G
  _CF: CF
  _CG: CG
}
