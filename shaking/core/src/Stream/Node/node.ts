import { ReadStream } from "fs"
import { Readable, Writable } from "stream"

import { toError, right, left } from "fp-ts/lib/Either"
import { Option, none, some } from "fp-ts/lib/Option"

import {
  async as asyncT,
  AsyncE as TAsyncE,
  delay as delayT,
  sync as syncT
} from "../../Effect"
import {
  encaseEffect as encaseEffectM,
  managed,
  Sync as MSync,
  SyncE as MSyncE
} from "../../Managed"
import { emitter, queueUtils } from "../Support"
import { fromSource } from "../stream"

function getSourceFromObjectReadStream<A>(
  stream: Readable
): MSync<TAsyncE<Error, Option<A>>> {
  return managed.chain(
    encaseEffectM(
      syncT(() => {
        const { hasCB, next, ops } = queueUtils<Error, A>()

        stream.on("end", () => {
          next({ _tag: "complete" })
        })

        stream.on("error", (e) => {
          next({ _tag: "error", e: toError(e) })
        })

        stream.pipe(
          new Writable({
            objectMode: true,
            write(chunk, _, callback) {
              next({ _tag: "offer", a: chunk })

              callback()
            }
          })
        )

        return { ops, hasCB }
      })
    ),
    ({ hasCB, ops }) => emitter(ops, hasCB)
  )
}

/* istanbul ignore next */
export function fromObjectReadStream<A>(stream: Readable) {
  return fromSource(getSourceFromObjectReadStream<A>(stream))
}

function getSourceFromObjectReadStreamB<A>(
  stream: ReadStream,
  batch: number,
  every: number
): MSyncE<Error, TAsyncE<Error, Option<Array<A>>>> {
  return encaseEffectM(
    syncT(() => {
      let open = true
      const leftover: Array<any> = []
      const errors: Array<Error> = []

      stream.on("end", () => {
        open = false
      })

      stream.on("error", (e) => {
        errors.push(e)
      })

      stream.pipe(
        new Writable({
          objectMode: true,
          write(chunk, _, callback) {
            leftover.push(chunk)

            callback()
          }
        })
      )

      return delayT(
        asyncT((res) => {
          if (leftover.length > 0) {
            res(right(some(leftover.splice(0, batch))))
          } else {
            if (errors.length > 0) {
              res(left(errors[0]))
            } else {
              if (open) {
                res(right(some([])))
              } else {
                res(right(none))
              }
            }
          }

          // eslint-disable-next-line @typescript-eslint/no-empty-function
          return (cb) => {
            cb()
          }
        }),
        every
      )
    })
  )
}

/* istanbul ignore next */
export function fromObjectReadStreamB<A>(
  stream: ReadStream,
  batch: number,
  every: number
) {
  return fromSource(getSourceFromObjectReadStreamB<A>(stream, batch, every))
}
