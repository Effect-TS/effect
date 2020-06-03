import * as T from "../../Effect"
import * as E from "../../Either"
import * as M from "../../Managed"
import * as O from "../../Option"
import { DoublyLinkedList } from "../../Support/DoublyLinkedList"

export interface Offer<A> {
  _tag: "offer"
  a: A
}
export interface StreamError<E> {
  _tag: "error"
  e: E
}
export interface Complete {
  _tag: "complete"
}
export type Ops<E, A> = Offer<A> | StreamError<E> | Complete
export interface HasCb<E, A> {
  cb?: (o: Ops<E, A>) => void
}

export function queueUtils<E, A>() {
  const ops: DoublyLinkedList<Ops<E, A>> = DoublyLinkedList.of()
  const hasCB: HasCb<E, A> = {}

  function next(o: Ops<E, A>) {
    if (hasCB.cb) {
      const { cb } = hasCB
      hasCB.cb = undefined
      cb(o)
    } else {
      ops.add(o)
    }
  }

  return { ops, hasCB, next }
}

export function runFromQueue<E, A>(
  op: Ops<E, A>,
  callback: (r: E.Either<E, O.Option<A>>) => void
): () => void {
  switch (op._tag) {
    case "error":
      callback(E.left(op.e))
      // this will never be called
      /* istanbul ignore next */
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      return () => {}
    case "complete":
      callback(E.right(O.none))
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      return () => {}
    case "offer":
      callback(E.right(O.some(op.a)))
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      return () => {}
  }
}

export function emitter<E, A>(
  ops: DoublyLinkedList<Ops<E, A>>,
  hasCB: HasCb<E, A>
): M.Sync<T.AsyncE<E, O.Option<A>>> {
  return M.pure(
    T.async<E, O.Option<A>>((callback) => {
      const op = ops.shift()
      if (op !== undefined) {
        runFromQueue(op, callback)
      } else {
        hasCB.cb = (o) => {
          if (!ops.isEmpty) {
            ops.add(o)
            const op = ops.shift()
            if (op !== undefined) {
              runFromQueue(op, callback)()
            }
          } else {
            runFromQueue(o, callback)()
          }
        }
      }
      /* istanbul ignore next */
      return (cb) => {
        cb()
      }
    })
  )
}
