export interface Auto {}

export interface Base<F, C = Auto> {
  F: F
  C: C
}

export interface CompositionBase2<F, G, CF = Auto, CG = Auto> {
  F: F
  G: G
  CF: CF
  CG: CG
}
