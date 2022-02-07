// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as L from "../../../../Collections/Immutable/List/index.js"
import * as T from "../../../../Effect/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"
import * as Unwrap from "./unwrap.js"

class Rechunker<A> {
  private builder = CK.builder<A>()
  private pos = 0

  constructor(readonly n: number) {}

  write(elem: A) {
    this.builder.append(elem)
    this.pos += 1

    if (this.pos === this.n) {
      const result = this.builder.build()

      this.builder = CK.builder()
      this.pos = 0

      return result
    }

    return null
  }

  emitOfNotEmpty() {
    if (this.pos !== 0) {
      return CH.write(this.builder.build())
    } else {
      return CH.unit
    }
  }
}

/**
 * Re-chunks the elements of the stream into chunks of
 * `n` elements each.
 * The last chunk might contain less than `n` elements
 */
export function rechunk_<R, E, A>(
  self: C.Stream<R, E, A>,
  n: number
): C.Stream<R, E, A> {
  return Unwrap.unwrap(
    T.succeedWith(() => {
      const rechunker = new Rechunker<A>(n)
      const process: CH.Channel<
        R,
        E,
        CK.Chunk<A>,
        unknown,
        E,
        CK.Chunk<A>,
        void
      > = CH.readWithCause(
        (chunk) => {
          const chunkSize = CK.size(chunk)

          if (chunkSize > 0) {
            let chunks = L.empty<CK.Chunk<A>>()
            let result: CK.Chunk<A> | null = null
            let i = 0

            while (i < chunkSize) {
              while (i < chunkSize && result === null) {
                result = rechunker.write(CK.unsafeGet_(chunk, i))
                i += 1
              }

              if (result !== null) {
                chunks = L.prepend_(chunks, result)
                result = null
              }
            }

            return CH.zipRight_(CH.writeAll(...L.toArray(L.reverse(chunks))), process)
          }

          return process
        },
        (cause) => CH.zipRight_(rechunker.emitOfNotEmpty(), CH.failCause(cause)),
        (_) => rechunker.emitOfNotEmpty()
      )

      return new C.Stream(self.channel[">>>"](process))
    })
  )
}

/**
 * Re-chunks the elements of the stream into chunks of
 * `n` elements each.
 * The last chunk might contain less than `n` elements
 *
 * @ets_data_first rechunk_
 */
export function rechunk(n: number) {
  return <R, E, A>(self: C.Stream<R, E, A>) => rechunk_(self, n)
}
