import type * as A from "../../Chunk"
import type * as T from "../_internal/effect"
import type * as M from "../_internal/managed"
import * as SK from "../Sink"
import type { Stream } from "./definitions"
import { run_ } from "./run"
import { runManaged_ } from "./runManaged"

/**
 * Consumes all elements of the stream, passing them to the specified callback.
 */
export function forEach_<R, R1, E, E1, A>(
  self: Stream<R, E, A>,
  f: (i: A) => T.Effect<R1, E1, any>
): T.Effect<R & R1, E1 | E, void> {
  return run_(self, SK.forEach(f))
}

/**
 * Consumes all elements of the stream, passing them to the specified callback.
 */
export function forEach<R1, E1, A>(f: (i: A) => T.Effect<R1, E1, any>) {
  return <R, E>(self: Stream<R, E, A>) => forEach_(self, f)
}

/**
 * Like `Stream#forEachWhile`, but returns a `Managed` so the finalization order
 * can be controlled.
 */
export function forEachWhileManaged_<R, R1, E, E1, O>(
  self: Stream<R, E, O>,
  f: (o: O) => T.Effect<R1, E1, boolean>
): M.Managed<R & R1, E | E1, void> {
  return runManaged_(self, SK.forEachWhile(f))
}

/**
 * Like `Stream#forEachWhile`, but returns a `Managed` so the finalization order
 * can be controlled.
 */
export function forEachWhileManaged<R1, E1, O>(f: (o: O) => T.Effect<R1, E1, boolean>) {
  return <R, E>(self: Stream<R, E, O>) => forEachWhileManaged_(self, f)
}

/**
 * Consumes all elements of the stream, passing them to the specified callback.
 */
export function forEachChunk_<R, R1, E, E1, O>(
  self: Stream<R, E, O>,
  f: (o: A.Chunk<O>) => T.Effect<R1, E1, any>
): T.Effect<R & R1, E | E1, void> {
  return run_(self, SK.forEachChunk(f))
}

/**
 * Consumes all elements of the stream, passing them to the specified callback.
 */
export function forEachChunk<R1, E1, O>(f: (o: A.Chunk<O>) => T.Effect<R1, E1, any>) {
  return <R, E>(self: Stream<R, E, O>) => run_(self, SK.forEachChunk(f))
}

/**
 * Consumes elements of the stream, passing them to the specified callback,
 * and terminating consumption when the callback returns `false`.
 */
export function forEachWhile_<R, R1, E, E1, O>(
  self: Stream<R, E, O>,
  f: (o: O) => T.Effect<R1, E1, boolean>
): T.Effect<R & R1, E | E1, void> {
  return run_(self, SK.forEachWhile(f))
}

/**
 * Consumes elements of the stream, passing them to the specified callback,
 * and terminating consumption when the callback returns `false`.
 */
export function forEachWhile<R1, E1, O>(f: (o: O) => T.Effect<R1, E1, boolean>) {
  return <R, E>(self: Stream<R, E, O>) => forEachWhile_(self, f)
}

/**
 * Like `forEach`, but returns a `Managed` so the finalization order
 * can be controlled.
 */
export function forEachManaged_<A, R, R1, E, E1>(
  self: Stream<R, E, A>,
  f: (i: A) => T.Effect<R1, E1, any>
): M.Managed<R & R1, E1 | E, void> {
  return runManaged_(self, SK.forEach(f))
}

/**
 * Like `forEach`, but returns a `Managed` so the finalization order
 * can be controlled.
 */
export function forEachManaged<A, R1, E1>(f: (i: A) => T.Effect<R1, E1, any>) {
  return <R, E>(self: Stream<R, E, A>): M.Managed<R & R1, E1 | E, void> =>
    forEachManaged_(self, f)
}

/**
 * Like `Stream#forEachChunk`, but returns a `Managed` so the finalization order
 * can be controlled.
 */
export function forEachChunkManaged_<R, R1, E, E1, O>(
  self: Stream<R, E, O>,
  f: (f: A.Chunk<O>) => T.Effect<R1, E1, any>
): M.Managed<R & R1, E | E1, void> {
  return runManaged_(self, SK.forEachChunk(f))
}

/**
 * Like `Stream#forEachChunk`, but returns a `Managed` so the finalization order
 * can be controlled.
 */
export function forEachChunkManaged<R, R1, E, E1, O>(
  f: (f: A.Chunk<O>) => T.Effect<R1, E1, any>
): (self: Stream<R, E, O>) => M.Managed<R & R1, E | E1, void> {
  return (self) => forEachChunkManaged_(self, f)
}
