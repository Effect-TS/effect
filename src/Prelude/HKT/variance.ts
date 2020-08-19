//
// Experiment
//

export type Par = "I" | "R" | "E"

export interface Cov<F extends Par> {
  Covariant: {
    F: () => F
  }
}

export interface Con<F extends Par> {
  Contravariant: {
    F: () => F
  }
}

export type Mix<C, P extends Par, Params extends [any, any]> = C extends Cov<P>
  ? Params[0] | Params[1]
  : C extends Con<P>
  ? Params[0] & Params[1]
  : Params[0]

export type Mix2<C, P extends Par, Params extends [any, any, any]> = C extends Cov<P>
  ? Params[0] | Params[1] | Params[2]
  : C extends Con<P>
  ? Params[0] & Params[1] & Params[2]
  : Params[0]

export type Mix3<C, P extends Par, Params extends [any, any, any, any]> = C extends Cov<
  P
>
  ? Params[0] | Params[1] | Params[2] | Params[3]
  : C extends Con<P>
  ? Params[0] & Params[1] & Params[2] & Params[3]
  : Params[0]

export type Def<C, P extends Par, First, Current> = C extends Cov<P>
  ? Current
  : C extends Con<P>
  ? Current
  : First
