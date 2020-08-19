//
// Experiment
//

// list of parameters
export type Par = "I" | "R" | "E" | "X"

// covariant flags
export interface Cov<F extends Par> {
  Covariant: {
    F: () => F
  }
}

// contravariant flags
export interface Con<F extends Par> {
  Contravariant: {
    F: () => F
  }
}

// composes 2 types according to variance specified in C
export type Mix<C, P extends Par, X, Y> = C extends Cov<P>
  ? X | Y
  : C extends Con<P>
  ? X & Y
  : X

// composes 3 types according to variance specified in C
export type Mix2<C, P extends Par, X, Y, Z> = C extends Cov<P>
  ? X | Y | Z
  : C extends Con<P>
  ? X & Y & Z
  : X

// composes 4 types according to variance specified in C
export type Mix3<C, P extends Par, X, Y, Z, K> = C extends Cov<P>
  ? X | Y | Z | K
  : C extends Con<P>
  ? X & Y & Z & K
  : X

// used in subsequent definitions to either vary a paramter or keep it fixed to "First"
export type Def<C, P extends Par, First, Current> = C extends Cov<P>
  ? Current
  : C extends Con<P>
  ? Current
  : First
