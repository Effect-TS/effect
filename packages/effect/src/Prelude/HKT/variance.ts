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
export type Mix<C, P extends Par, Params extends [any, any]> = C extends Cov<P>
  ? Params[0] | Params[1]
  : C extends Con<P>
  ? Params[0] & Params[1]
  : Params[0]

// composes 3 types according to variance specified in C
export type Mix2<C, P extends Par, Params extends [any, any, any]> = C extends Cov<P>
  ? Params[0] | Params[1] | Params[2]
  : C extends Con<P>
  ? Params[0] & Params[1] & Params[2]
  : Params[0]

// composes 4 types according to variance specified in C
export type Mix3<C, P extends Par, Params extends [any, any, any, any]> = C extends Cov<
  P
>
  ? Params[0] | Params[1] | Params[2] | Params[3]
  : C extends Con<P>
  ? Params[0] & Params[1] & Params[2] & Params[3]
  : Params[0]

// used in subsequent definitions to either vary a paramter or keep it fixed to "First"
export type Def<C, P extends Par, First, Current> = C extends Cov<P>
  ? Current
  : C extends Con<P>
  ? Current
  : First
