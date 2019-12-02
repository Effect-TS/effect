import * as list from "../list";
import * as O from "fp-ts/lib/Option";
import * as E from "fp-ts/lib/Either";
import * as M from "../managed";
import * as T from "../effect";

export type Offer<A> = { _tag: "offer"; a: A };
export type StreamError<E> = { _tag: "error"; e: E };
export type Complete = { _tag: "complete" };
export type Ops<E, A> = Offer<A> | StreamError<E> | Complete;
export type HasCb<E, A> = { cb?: (o: Ops<E, A>) => void };

export function queueUtils<E, A>() {
  const ops: list.List<Ops<E, A>> = list.empty();
  const hasCB: HasCb<E, A> = {};

  function next(o: Ops<E, A>) {
    if (hasCB.cb) {
      const cb = hasCB.cb;
      hasCB.cb = undefined;
      cb(o);
    } else {
      // TODO: figure out how to trigger if even possible
      /* istanbul ignore next */
      list.push(ops, o);
    }
  }

  return { ops, hasCB, next };
}

export function runFromQueue<E, A>(
  op: Ops<E, A>,
  callback: (r: E.Either<E, O.Option<A>>) => void
): () => void {
  switch (op._tag) {
    case "error":
      callback(E.left(op.e));
      // this will never be called
      /* istanbul ignore next */
      return () => {};
    case "complete":
      callback(E.right(O.none));
      return () => {};
    case "offer":
      callback(E.right(O.some(op.a)));
      return () => {};
  }
}

export function emitter<E, A>(
  ops: list.List<Ops<E, A>>,
  hasCB: HasCb<E, A>
): M.Managed<unknown, never, T.Effect<unknown, E, O.Option<A>>> {
  return M.pure(
    T.async<E, O.Option<A>>(callback => {
      const op = list.popUnsafe(ops);
      if (op !== null) {
        return runFromQueue(op, callback);
      } else {
        hasCB.cb = o => {
          // TODO: figure out how to trigger if even possible, triggered by line 22
          /* istanbul ignore if */
          if (list.isNotEmpty(ops)) {
            list.push(ops, o);
            const op = list.popUnsafe(ops);
            if (op !== null) {
              runFromQueue(op, callback)();
            }
          } else {
            runFromQueue(o, callback)();
          }
        };
      }
      return () => {};
    })
  );
}
