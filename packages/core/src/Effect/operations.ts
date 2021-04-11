/* eslint-disable prefer-rest-params */
// tracing: off

import "../Operator"

import * as T from "@effect-ts/system/Effect"

import type * as P from "../Prelude"

/**
 * Like forEach but preserves the type of the collection used
 */
export function forEachOf<F extends P.URIS, C>(
  C: P.Collection<F, C>
): {
  <K, Q, W, X, I, S, R, E, A, RE, EE, AA>(
    self: P.Kind<F, C, K, Q, W, X, I, S, R, E, A> & Iterable<A>,
    f: (a: A) => T.Effect<RE, EE, AA>,
    __trace?: string
  ): T.Effect<RE, EE, P.Kind<F, C, K, Q, W, X, I, S, R, E, AA>>
  /**
   * @dataFirst self
   */
  <A, RE, EE, AA>(f: (a: A) => T.Effect<RE, EE, AA>, __trace?: string): <
    K,
    Q,
    W,
    X,
    I,
    S,
    R,
    E
  >(
    self: P.Kind<F, C, K, Q, W, X, I, S, R, E, A> & Iterable<A>
  ) => T.Effect<RE, EE, P.Kind<F, C, K, Q, W, X, I, S, R, E, AA>>
} {
  // @ts-expect-error
  return function () {
    if (arguments.length >= 2 && typeof arguments[1] !== "string") {
      return T.suspend(() => {
        let builder = C.builder()
        return T.map_(
          T.forEachUnit_(
            arguments[0],
            (a) =>
              T.map_(arguments[1](a), (aa) => {
                builder = builder.append(aa)
              }),
            arguments[2]
          ),
          () => builder.build()
        )
      })
    }
    return (self: any) => forEachOf(C)(self, arguments[0], arguments[1])
  }
}
