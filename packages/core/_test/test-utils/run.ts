export function test<E>(name: string, effect: () => Effect<never, E, void>) {
  return it(name, () => Effect.suspendSucceed(effect).unsafeRunPromise())
}
