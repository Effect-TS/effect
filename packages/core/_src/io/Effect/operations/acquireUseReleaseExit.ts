/**
 * Acquires a resource, uses the resource, and then releases the resource.
 * Neither the acquisition nor the release will be interrupted, and the
 * resource is guaranteed to be released, so long as the `acquire` effect
 * succeeds. If `use` fails, then after release, the returned effect will fail
 * with the same error.
 *
 * @tsplus static ets/Effect/Ops acquireUseReleaseExit
 * @tsplus fluent ets/Effect acquireUseReleaseExit
 */
export function acquireUseReleaseExit<R, E, A, R2, E2, A2, R3, X>(
  acquire: LazyArg<Effect<R, E, A>>,
  use: (a: A) => Effect<R2, E2, A2>,
  release: (a: A, exit: Exit<E2, A2>) => Effect<R3, never, X>,
  __tsplusTrace?: string
): Effect<R | R2 | R3, E | E2, A2> {
  return Effect.uninterruptibleMask(({ restore }) =>
    acquire().flatMap((a) =>
      Effect.suspendSucceed(restore(use(a)))
        .exit()
        .flatMap((exit) =>
          Effect.suspendSucceed(release(a, exit)).foldCauseEffect(
            (cause2) =>
              Effect.failCause(
                exit.fold(
                  (cause1) => cause1 + cause2,
                  () => cause2
                )
              ),
            () => Effect.done(exit)
          )
        )
    )
  )
}
