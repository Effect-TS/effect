/**
 * @since 2.0.0
 */

/**
 * @since 2.0.0
 * @category models
 */
export interface Pipeable {
  readonly pipe: {
    <A, B>(this: A, ab: (_: A) => B): B
    <A, B, C>(this: A, ab: (_: A) => B, bc: (_: B) => C): C
    <A, B, C, D>(this: A, ab: (_: A) => B, bc: (_: B) => C, cd: (_: C) => D): D
    <A, B, C, D, E>(this: A, ab: (_: A) => B, bc: (_: B) => C, cd: (_: C) => D, de: (_: D) => E): E
    <A, B, C, D, E, F>(
      this: A,
      ab: (_: A) => B,
      bc: (_: B) => C,
      cd: (_: C) => D,
      de: (_: D) => E,
      ef: (_: E) => F
    ): F
    <A, B, C, D, E, F, G>(
      this: A,
      ab: (_: A) => B,
      bc: (_: B) => C,
      cd: (_: C) => D,
      de: (_: D) => E,
      ef: (_: E) => F,
      fg: (_: F) => G
    ): G
    <A, B, C, D, E, F, G, H>(
      this: A,
      ab: (_: A) => B,
      bc: (_: B) => C,
      cd: (_: C) => D,
      de: (_: D) => E,
      ef: (_: E) => F,
      fg: (_: F) => G,
      gh: (_: G) => H
    ): H
    <A, B, C, D, E, F, G, H, I>(
      this: A,
      ab: (_: A) => B,
      bc: (_: B) => C,
      cd: (_: C) => D,
      de: (_: D) => E,
      ef: (_: E) => F,
      fg: (_: F) => G,
      gh: (_: G) => H,
      hi: (_: H) => I
    ): I
    <A, B, C, D, E, F, G, H, I, J>(
      this: A,
      ab: (_: A) => B,
      bc: (_: B) => C,
      cd: (_: C) => D,
      de: (_: D) => E,
      ef: (_: E) => F,
      fg: (_: F) => G,
      gh: (_: G) => H,
      hi: (_: H) => I,
      ij: (_: I) => J
    ): J
    <A, B, C, D, E, F, G, H, I, J, K>(
      this: A,
      ab: (_: A) => B,
      bc: (_: B) => C,
      cd: (_: C) => D,
      de: (_: D) => E,
      ef: (_: E) => F,
      fg: (_: F) => G,
      gh: (_: G) => H,
      hi: (_: H) => I,
      ij: (_: I) => J,
      jk: (_: J) => K
    ): K
    <A, B, C, D, E, F, G, H, I, J, K, L>(
      this: A,
      ab: (_: A) => B,
      bc: (_: B) => C,
      cd: (_: C) => D,
      de: (_: D) => E,
      ef: (_: E) => F,
      fg: (_: F) => G,
      gh: (_: G) => H,
      hi: (_: H) => I,
      ij: (_: I) => J,
      jk: (_: J) => K,
      kl: (_: K) => L
    ): L
    <A, B, C, D, E, F, G, H, I, J, K, L, M>(
      this: A,
      ab: (_: A) => B,
      bc: (_: B) => C,
      cd: (_: C) => D,
      de: (_: D) => E,
      ef: (_: E) => F,
      fg: (_: F) => G,
      gh: (_: G) => H,
      hi: (_: H) => I,
      ij: (_: I) => J,
      jk: (_: J) => K,
      kl: (_: K) => L,
      lm: (_: L) => M
    ): M
    <A, B, C, D, E, F, G, H, I, J, K, L, M, N>(
      this: A,
      ab: (_: A) => B,
      bc: (_: B) => C,
      cd: (_: C) => D,
      de: (_: D) => E,
      ef: (_: E) => F,
      fg: (_: F) => G,
      gh: (_: G) => H,
      hi: (_: H) => I,
      ij: (_: I) => J,
      jk: (_: J) => K,
      kl: (_: K) => L,
      lm: (_: L) => M,
      mn: (_: M) => N
    ): N
    <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O>(
      this: A,
      ab: (_: A) => B,
      bc: (_: B) => C,
      cd: (_: C) => D,
      de: (_: D) => E,
      ef: (_: E) => F,
      fg: (_: F) => G,
      gh: (_: G) => H,
      hi: (_: H) => I,
      ij: (_: I) => J,
      jk: (_: J) => K,
      kl: (_: K) => L,
      lm: (_: L) => M,
      mn: (_: M) => N,
      no: (_: N) => O
    ): O
    <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P>(
      this: A,
      ab: (_: A) => B,
      bc: (_: B) => C,
      cd: (_: C) => D,
      de: (_: D) => E,
      ef: (_: E) => F,
      fg: (_: F) => G,
      gh: (_: G) => H,
      hi: (_: H) => I,
      ij: (_: I) => J,
      jk: (_: J) => K,
      kl: (_: K) => L,
      lm: (_: L) => M,
      mn: (_: M) => N,
      no: (_: N) => O,
      op: (_: O) => P
    ): P
    <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q>(
      this: A,
      ab: (_: A) => B,
      bc: (_: B) => C,
      cd: (_: C) => D,
      de: (_: D) => E,
      ef: (_: E) => F,
      fg: (_: F) => G,
      gh: (_: G) => H,
      hi: (_: H) => I,
      ij: (_: I) => J,
      jk: (_: J) => K,
      kl: (_: K) => L,
      lm: (_: L) => M,
      mn: (_: M) => N,
      no: (_: N) => O,
      op: (_: O) => P,
      pq: (_: P) => Q
    ): Q
    <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R>(
      this: A,
      ab: (_: A) => B,
      bc: (_: B) => C,
      cd: (_: C) => D,
      de: (_: D) => E,
      ef: (_: E) => F,
      fg: (_: F) => G,
      gh: (_: G) => H,
      hi: (_: H) => I,
      ij: (_: I) => J,
      jk: (_: J) => K,
      kl: (_: K) => L,
      lm: (_: L) => M,
      mn: (_: M) => N,
      no: (_: N) => O,
      op: (_: O) => P,
      pq: (_: P) => Q,
      qr: (_: Q) => R
    ): R
    <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S>(
      this: A,
      ab: (_: A) => B,
      bc: (_: B) => C,
      cd: (_: C) => D,
      de: (_: D) => E,
      ef: (_: E) => F,
      fg: (_: F) => G,
      gh: (_: G) => H,
      hi: (_: H) => I,
      ij: (_: I) => J,
      jk: (_: J) => K,
      kl: (_: K) => L,
      lm: (_: L) => M,
      mn: (_: M) => N,
      no: (_: N) => O,
      op: (_: O) => P,
      pq: (_: P) => Q,
      qr: (_: Q) => R,
      rs: (_: R) => S
    ): S
    <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T>(
      this: A,
      ab: (_: A) => B,
      bc: (_: B) => C,
      cd: (_: C) => D,
      de: (_: D) => E,
      ef: (_: E) => F,
      fg: (_: F) => G,
      gh: (_: G) => H,
      hi: (_: H) => I,
      ij: (_: I) => J,
      jk: (_: J) => K,
      kl: (_: K) => L,
      lm: (_: L) => M,
      mn: (_: M) => N,
      no: (_: N) => O,
      op: (_: O) => P,
      pq: (_: P) => Q,
      qr: (_: Q) => R,
      rs: (_: R) => S,
      st: (_: S) => T
    ): T
    <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U>(
      this: A,
      ab: (_: A) => B,
      bc: (_: B) => C,
      cd: (_: C) => D,
      de: (_: D) => E,
      ef: (_: E) => F,
      fg: (_: F) => G,
      gh: (_: G) => H,
      hi: (_: H) => I,
      ij: (_: I) => J,
      jk: (_: J) => K,
      kl: (_: K) => L,
      lm: (_: L) => M,
      mn: (_: M) => N,
      no: (_: N) => O,
      op: (_: O) => P,
      pq: (_: P) => Q,
      qr: (_: Q) => R,
      rs: (_: R) => S,
      st: (_: S) => T,
      tu: (_: T) => U
    ): U
    <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U>(
      this: A,
      ab: (_: A) => B,
      bc: (_: B) => C,
      cd: (_: C) => D,
      de: (_: D) => E,
      ef: (_: E) => F,
      fg: (_: F) => G,
      gh: (_: G) => H,
      hi: (_: H) => I,
      ij: (_: I) => J,
      jk: (_: J) => K,
      kl: (_: K) => L,
      lm: (_: L) => M,
      mn: (_: M) => N,
      no: (_: N) => O,
      op: (_: O) => P,
      pq: (_: P) => Q,
      qr: (_: Q) => R,
      rs: (_: R) => S,
      st: (_: S) => T,
      tu: (_: T) => U
    ): U
  }
}

/**
 * @since 2.0.0
 */
export const pipeArguments = <A>(self: A, args: IArguments): unknown => {
  switch (args.length) {
    case 1:
      return args[0](self)
    case 2:
      return args[1](args[0](self))
    case 3:
      return args[2](args[1](args[0](self)))
    case 4:
      return args[3](args[2](args[1](args[0](self))))
    case 5:
      return args[4](args[3](args[2](args[1](args[0](self)))))
    case 6:
      return args[5](args[4](args[3](args[2](args[1](args[0](self))))))
    case 7:
      return args[6](args[5](args[4](args[3](args[2](args[1](args[0](self)))))))
    case 8:
      return args[7](args[6](args[5](args[4](args[3](args[2](args[1](args[0](self))))))))
    case 9:
      return args[8](args[7](args[6](args[5](args[4](args[3](args[2](args[1](args[0](self)))))))))
    default: {
      let ret = self
      for (let i = 0, len = args.length; i < len; i++) {
        ret = args[i](ret)
      }
      return ret
    }
  }
}
