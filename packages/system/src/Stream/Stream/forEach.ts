// ets_tracing: off

import type * as A from "../../Collections/Immutable/Chunk/index.js"
import type * as T from "../_internal/effect.js"
import type * as M from "../_internal/managed.js"
import * as SK from "../Sink/index.js"
import type { Stream } from "./definitions.js"
import { run_ } from "./run.js"
import { runManaged_ } from "./runManaged.js"

/**
 * Consumes all elements of the stream, passing them to the specified callback.
 */
export function forEach_<R, R1, E, E1, A, X>(
  self: Stream<R, E, A>,
  f: (i: A) => T.Effect<R1, E1, X>
): T.Effect<R & R1, E1 | E, void> {
  return run_(self, SK.forEach(f))
}

/**
 * Consumes all elements of the stream, passing them to the specified callback.
 */
export function forEach<R1, E1, A, X>(f: (i: A) => T.Effect<R1, E1, X>) {
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
export function forEachChunk_<R, R1, E, E1, O, X>(
  self: Stream<R, E, O>,
  f: (o: A.Chunk<O>) => T.Effect<R1, E1, X>
): T.Effect<R & R1, E | E1, void> {
  return run_(self, SK.forEachChunk(f))
}

/**
 * Consumes all elements of the stream, passing them to the specified callback.
 */
export function forEachChunk<R1, E1, O, X>(f: (o: A.Chunk<O>) => T.Effect<R1, E1, X>) {
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
export function forEachManaged_<A, R, R1, E, E1, X>(
  self: Stream<R, E, A>,
  f: (i: A) => T.Effect<R1, E1, X>
): M.Managed<R & R1, E1 | E, void> {
  return runManaged_(self, SK.forEach(f))
}

/**
 * Like `forEach`, but returns a `Managed` so the finalization order
 * can be controlled.
 */
export function forEachManaged<A, R1, E1, X>(f: (i: A) => T.Effect<R1, E1, X>) {
  return <R, E>(self: Stream<R, E, A>): M.Managed<R & R1, E1 | E, void> =>
    forEachManaged_(self, f)
}

/**
 * Like `Stream#forEachChunk`, but returns a `Managed` so the finalization order
 * can be controlled.
 */
export function forEachChunkManaged_<R, R1, E, E1, O, X>(
  self: Stream<R, E, O>,
  f: (f: A.Chunk<O>) => T.Effect<R1, E1, X>
): M.Managed<R & R1, E | E1, void> {
  return runManaged_(self, SK.forEachChunk(f))
}

/**
 * Like `Stream#forEachChunk`, but returns a `Managed` so the finalization order
 * can be controlled.
 */
export function forEachChunkManaged<R, R1, E, E1, O, X>(
  f: (f: A.Chunk<O>) => T.Effect<R1, E1, X>
): (self: Stream<R, E, O>) => M.Managed<R & R1, E | E1, void> {
  return (self) => forEachChunkManaged_(self, f)
}
