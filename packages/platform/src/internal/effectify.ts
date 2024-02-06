import * as Effect from "effect/Effect"
import type { Effectify, EffectifyError } from "../Effectify.js"

/** @internal */
export const effectify: {
  <F extends (...args: Array<any>) => any>(fn: F): Effectify<F, EffectifyError<F>>
  <F extends (...args: Array<any>) => any, E>(
    fn: F,
    onError: (error: EffectifyError<F>, args: Parameters<F>) => E
  ): Effectify<F, E>
  <F extends (...args: Array<any>) => any, E, E2>(
    fn: F,
    onError: (error: EffectifyError<F>, args: Parameters<F>) => E,
    onSyncError: (error: unknown, args: Parameters<F>) => E2
  ): Effectify<F, E | E2>
} =
  (<A>(fn: Function, onError?: (e: any, args: any) => any, onSyncError?: (e: any, args: any) => any) =>
  (...args: Array<any>) =>
    Effect.async<A, Error>((resume) => {
      try {
        fn(...args, (err: Error | null, result: A) => {
          if (err) {
            resume(Effect.fail(onError ? onError(err, args) : err))
          } else {
            resume(Effect.succeed(result))
          }
        })
      } catch (err) {
        resume(onSyncError ? Effect.fail(onSyncError(err, args)) : Effect.die(err))
      }
    })) as any
