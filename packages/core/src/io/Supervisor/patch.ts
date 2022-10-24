import { Zip } from "@effect/core/io/Supervisor/definition"
import * as Differ from "@fp-ts/data/Differ"
import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"
import * as HashSet from "@fp-ts/data/HashSet"
import * as List from "@fp-ts/data/List"
/**
 * @category model
 * @since 1.0.0
 */
export type Patch = AddSupervisor | RemoveSupervisor | AndThen | Empty

/**
 * @category model
 * @since 1.0.0
 */
export class AddSupervisor {
  readonly _tag = "AddSupervisor"
  constructor(readonly supervisor: Supervisor<any>) {}
}

/**
 * @category model
 * @since 1.0.0
 */
export class Empty {
  readonly _tag = "Empty"
}

/**
 * @category model
 * @since 1.0.0
 */
export class RemoveSupervisor {
  readonly _tag = "RemoveSupervisor"
  constructor(readonly supervisor: Supervisor<any>) {}
}

/**
 * @category model
 * @since 1.0.0
 */
export class AndThen {
  readonly _tag = "AndThen"
  constructor(readonly first: Patch, readonly second: Patch) {}
}

/**
 * Combines two patches to produce a new patch that describes applying the
 * updates from this patch and then the updates from the specified patch.
 *
 * @tsplus static effect/core/io/Supervisor.Ops combinePatch
 * @category constructors
 * @since 1.0.0
 */
export function combinePatch(self: Patch, that: Patch): Patch {
  return new AndThen(self, that)
}

/**
 * An empty patch
 *
 * @tsplus static effect/core/io/Supervisor.Ops emptyPatch
 * @category constructors
 * @since 1.0.0
 */
export const emptyPatch: Patch = new Empty()

/**
 * Applies an update to the supervisor to produce a new supervisor.
 *
 * @tsplus static effect/core/io/Supervisor.Ops applyPatch
 * @category constructors
 * @since 1.0.0
 */
export function applyPatch(self: Patch, supervisor: Supervisor<any>): Supervisor<any> {
  return applyPatchLoop(supervisor, List.of(self))
}

/**
 * @tsplus tailRec
 */
function applyPatchLoop(supervisor: Supervisor<any>, patches: List.List<Patch>): Supervisor<any> {
  if (List.isCons(patches)) {
    switch (patches.head._tag) {
      case "AddSupervisor": {
        return applyPatchLoop(supervisor.zip(patches.head.supervisor), patches.tail)
      }
      case "RemoveSupervisor": {
        return applyPatchLoop(removeSupervisor(supervisor, patches.head.supervisor), patches.tail)
      }
      case "AndThen": {
        return applyPatchLoop(
          supervisor,
          List.cons(patches.head.first, List.cons(patches.head.second, patches.tail))
        )
      }
      case "Empty": {
        return applyPatchLoop(supervisor, patches.tail)
      }
    }
  }
  return supervisor
}

function removeSupervisor(self: Supervisor<any>, that: Supervisor<any>): Supervisor<any> {
  if (Equal.equals(self, that)) {
    return Supervisor.none
  } else {
    if (self instanceof Zip) {
      return removeSupervisor(self.left, that).zip(removeSupervisor(self.right, that))
    } else {
      return self
    }
  }
}

function toSet(self: Supervisor<any>): HashSet.HashSet<Supervisor<any>> {
  if (Equal.equals(self, Supervisor.none)) {
    return HashSet.empty()
  } else {
    if (self instanceof Zip) {
      return pipe(toSet(self.left), HashSet.union(toSet(self.right)))
    } else {
      return HashSet.make(self)
    }
  }
}

/**
 * @tsplus static effect/core/io/Supervisor.Ops diff
 */
export function diff(oldValue: Supervisor<any>, newValue: Supervisor<any>): Patch {
  if (Equal.equals(oldValue, newValue)) {
    return emptyPatch
  }
  const oldSupervisors = toSet(oldValue)
  const newSupervisors = toSet(newValue)
  const added = pipe(
    newSupervisors,
    HashSet.difference(oldSupervisors),
    HashSet.reduce(
      emptyPatch,
      (p, s) => combinePatch(p, new AddSupervisor(s))
    )
  )
  const removed = pipe(
    oldSupervisors,
    HashSet.difference(newSupervisors),
    HashSet.reduce(
      emptyPatch,
      (p, s) => combinePatch(p, new RemoveSupervisor(s))
    )
  )
  return combinePatch(added, removed)
}

/**
 * @tsplus static effect/core/io/Supervisor.Ops differ
 * @category diffing
 * @since 1.0.0
 */
export const differ = Differ.make<Supervisor<any>, Patch>({
  empty: emptyPatch,
  patch: applyPatch,
  combine: combinePatch,
  diff
})
