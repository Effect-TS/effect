import type { HKT } from "effect"

export function testIssue536<F extends HKT.TypeLambda, G extends HKT.TypeLambda, R, W, E, A>(
  x: HKT.Kind<F, R, W, E, A>
): HKT.Kind<G, R, W, E, A> {
  // @ts-expect-error: Type 'Kind<F, R, W, E, A>' is not assignable to type 'Kind<G, R, W, E, A>'
  return x
}
