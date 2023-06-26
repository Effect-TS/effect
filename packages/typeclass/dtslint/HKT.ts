import * as _ from "@effect/data/HKT"

// issue #536
export function testIssue536<F extends _.TypeLambda, G extends _.TypeLambda, R, W, E, A>(
  x: _.Kind<F, R, W, E, A>
): _.Kind<G, R, W, E, A> {
  // @ts-expect-error
  return x
}
