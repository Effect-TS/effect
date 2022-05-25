/**
 * Builds this layer and uses it until it is interrupted. This is useful when
 * your entire application is a layer, such as an HTTP server.
 *
 * @tsplus fluent ets/Layer launch
 */
export function launch<RIn, E, ROut>(self: Layer<RIn, E, ROut>): Effect<RIn, E, never> {
  return Effect.scoped(
    Effect.scopeWith((scope) => self.buildWithScope(scope)) > Effect.never
  )
}
