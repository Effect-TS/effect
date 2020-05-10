import { AsyncE, async } from "../../Effect"
import { Either, left, right } from "../../Either"
import { pure as managedPure, Sync as ManagedSync } from "../../Managed"
import { none, some, Option } from "../../Option"
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
  const ops: DoublyLinkedList<Ops<E, A>> = new DoublyLinkedList()
  const hasCB: HasCb<E, A> = {}

  function next(o: Ops<E, A>) {
    if (hasCB.cb) {
      const { cb } = hasCB
      hasCB.cb = undefined
      cb(o)
    } else {
      ops.append(o)
    }
  }

  return { ops, hasCB, next }
}

export function runFromQueue<E, A>(
  op: Ops<E, A>,
  callback: (r: Either<E, Option<A>>) => void
): () => void {
  switch (op._tag) {
    case "error":
      callback(left(op.e))
      // this will never be called
      /* istanbul ignore next */
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      return () => {}
    case "complete":
      callback(right(none))
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      return () => {}
    case "offer":
      callback(right(some(op.a)))
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      return () => {}
  }
}

export function emitter<E, A>(
  ops: DoublyLinkedList<Ops<E, A>>,
  hasCB: HasCb<E, A>
): ManagedSync<AsyncE<E, Option<A>>> {
  return managedPure(
    async<E, Option<A>>((callback) => {
      const op = ops.deleteHead()
      if (op !== null && op.value !== null) {
        runFromQueue(op.value, callback)
      } else {
        hasCB.cb = (o) => {
          if (!ops.empty()) {
            ops.append(o)
            const op = ops.deleteHead()
            if (op !== null && op.value !== null) {
              runFromQueue(op.value, callback)()
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
