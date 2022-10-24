/**
 * Use a scoped effect to emit an output element.
 *
 * @tsplus static effect/core/stream/Channel.Ops scoped
 * @category constructors
 * @since 1.0.0
 */
export function scoped<R, E, A>(
  effect: Effect<R, E, A>
): Channel<Exclude<R, Scope>, unknown, unknown, unknown, E, A, unknown> {
  return Channel.acquireUseReleaseOutExit(
    Scope.make.flatMap((scope) =>
      Effect.uninterruptibleMask(({ restore }) =>
        restore(scope.extend(effect)).foldCauseEffect(
          (cause) => scope.close(Exit.failCause(cause)).zipRight(Effect.failCause(cause)),
          (out) => Effect.succeed([out, scope] as const)
        )
      )
    ),
    ([_, scope], exit) => scope.close(exit)
  ).mapOut((_) => _[0])
}
