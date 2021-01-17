import * as T from "@effect-ts/core/Effect"
import * as S from "@effect-ts/core/Effect/Stream"
import { pipe, tuple } from "@effect-ts/core/Function"
import * as O from "@effect-ts/core/Option"
import * as P from "process"

import type { Byte } from "../Byte"
import { chunk } from "../Byte"

export class StdinError {
  readonly _tag = "StdinError"
  constructor(readonly error: Error) {}
}

/**
 * Creates a stream that reads from the standard input
 */
export const stdin: S.IO<StdinError, Byte> = pipe(
  T.effectTotal(() => tuple(P.stdin.resume(), new Array<Function>())),
  S.fromEffect,
  S.chain(([rs, cleanup]) =>
    pipe(
      S.effectAsync<unknown, StdinError, Byte>((cb) => {
        const onData = (data: Buffer): void => {
          cb(T.succeed(chunk(data)))
        }
        const onError = (error: Error): void => {
          cb(T.fail(O.some(new StdinError(error))))
        }
        cleanup.push(
          () => {
            rs.removeListener("error", onError)
          },
          () => {
            rs.removeListener("data", onData)
          },
          () => {
            rs.pause()
          }
        )
        rs.on("data", onData)
        rs.on("error", onError)
      }),
      S.ensuring(
        T.effectTotal(() => {
          cleanup.forEach((h) => {
            h()
          })
        })
      )
    )
  )
)
