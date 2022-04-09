export function environmentFor<T>(service: Service<T>, t: T): Effect<{}, never, Has<T>> {
  // @ts-expect-error
  return Effect.environmentWith((r) => ({
    [service.identifier]: { ...r, ...service(t) }[service.identifier]
  }));
}
