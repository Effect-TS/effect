export function test<E>(name: string, effect: () => Effect<unknown, E, void>) {
  return it(name, () => Effect.suspendSucceed(effect).unsafeRunPromise());
}
