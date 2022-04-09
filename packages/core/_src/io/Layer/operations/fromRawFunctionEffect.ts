/**
 * Creates a layer from an effectful function
 */
export function fromRawFunctionEffect<A, R, E, B>(
  f: (environment: A) => Effect<R, E, B>
): Layer<R & A, E, B> {
  return Layer.fromRawEffect(Effect.environmentWithEffect(f));
}
