export interface FixE<F> {
  FixE: {
    F: () => F
  }
}

export type OrE<A, B> = A extends FixE<infer X> ? X : B

export interface FixR<F> {
  FixR: {
    F: () => F
  }
}

export type OrR<A, B> = A extends FixR<infer X> ? X : B

export interface FixS<F> {
  FixS: {
    F: () => F
  }
}

export type OrS<A, B> = A extends FixS<infer X> ? X : B

export interface FixX<F> {
  FixX: {
    F: () => F
  }
}

export type OrX<A, B> = A extends FixX<infer X> ? X : B

export interface FixI<F> {
  FixI: {
    F: () => F
  }
}

export type OrI<A, B> = A extends FixI<infer X> ? X : B

export interface FixK<F> {
  FixK: {
    F: () => F
  }
}

export type OrK<A, B> = A extends FixK<infer X> ? X : B

export interface FixN<F extends string> {
  FixN: {
    F: () => F
  }
}

export type OrN<A, B> = A extends FixN<infer X> ? X : B
