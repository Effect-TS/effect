import * as Chunk from "../../Collections/Immutable/Chunk"
import * as List from "../../Collections/Immutable/List"
import type * as SS from "../../Collections/Immutable/SortedSet"
import * as E from "../../Either"
import type * as Fiber from "../../Fiber"
import * as St from "../../Structural"
import type { AtomicReference } from "../../Support/AtomicReference"
import { Int } from "../Int"

/**
 * A type of annotation.
 */

export class TestAnnotation<V> implements St.HasHash, St.HasEquals {
  constructor(
    readonly identifier: string,
    readonly initial: V,
    readonly combine: (x: V, y: V) => V
  ) {}

  get [St.hashSym](): number {
    return St.hash(this.identifier)
  }

  [St.equalsSym](that: unknown): boolean {
    return that instanceof TestAnnotation && St.equals(this.identifier, that.identifier)
  }
}

export type FibersAnnotation = E.Either<
  Int,
  Chunk.Chunk<AtomicReference<SS.SortedSet<Fiber.Runtime<unknown, unknown>>>>
>

export const fibers: TestAnnotation<FibersAnnotation> = new TestAnnotation(
  "fibers",
  E.leftW(0 as Int),
  compose
)

function compose<A>(
  left: E.Either<Int, Chunk.Chunk<A>>,
  right: E.Either<Int, Chunk.Chunk<A>>
): E.Either<Int, Chunk.Chunk<A>> {
  if (left._tag === "Left" && right._tag === "Left") {
    return E.left(Int(left.left + right.left))
  } else if (left._tag === "Right" && right._tag === "Right") {
    return E.right(Chunk.concat_(left.right, right.right))
  } else if (left._tag === "Right" && right._tag === "Left") {
    return E.left(right.left)
  } else {
    return E.right((right as E.Right<Chunk.Chunk<A>>).right)
  }
}

export type LocationAnnotation = List.List<Fiber.SourceLocation>

export const location: TestAnnotation<LocationAnnotation> = new TestAnnotation(
  "location",
  List.empty(),
  List.concat_
)
