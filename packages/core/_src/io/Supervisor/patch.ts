import { Zip } from "@effect/core/io/Supervisor/definition"
import { equals } from "@tsplus/stdlib/structure/Equals"

export type Patch = AddSupervisor | RemoveSupervisor | AndThen | Empty

export class AddSupervisor {
  readonly _tag = "AddSupervisor"
  constructor(readonly supervisor: Supervisor<any>) {}
}

export class Empty {
  readonly _tag = "Empty"
}

export class RemoveSupervisor {
  readonly _tag = "RemoveSupervisor"
  constructor(readonly supervisor: Supervisor<any>) {}
}

export class AndThen {
  readonly _tag = "AndThen"
  constructor(readonly first: Patch, readonly second: Patch) {}
}

/**
 * Combines two patches to produce a new patch that describes applying the
 * updates from this patch and then the updates from the specified patch.
 *
 * @tsplus static effect/core/io/Supervisor.Ops combinePatch
 */
export function combinePatch(self: Patch, that: Patch): Patch {
  return new AndThen(self, that)
}

/**
 * An empty patch
 *
 * @tsplus static effect/core/io/Supervisor.Ops emptyPatch
 */
export const emptyPatch: Patch = new Empty()

/**
 * Applies an update to the supervisor to produce a new supervisor.
 *
 * @tsplus static effect/core/io/Supervisor.Ops applyPatch
 */
export function applyPatch(self: Patch, supervisor: Supervisor<any>): Supervisor<any> {
  /**
   * @tsplus tailRec
   */
  function loop(supervisor: Supervisor<any>, patches: List<Patch>): Supervisor<any> {
    if (patches.isCons()) {
      switch (patches.head._tag) {
        case "AddSupervisor": {
          return loop(supervisor.zip(patches.head.supervisor), patches.tail)
        }
        case "RemoveSupervisor": {
          return loop(removeSupervisor(supervisor, patches.head.supervisor), patches.tail)
        }
        case "AndThen": {
          return loop(
            supervisor,
            List.cons(patches.head.first, List.cons(patches.head.second, patches.tail))
          )
        }
        case "Empty": {
          return loop(supervisor, patches.tail)
        }
      }
    }
    return supervisor
  }
  return loop(supervisor, List(self))
}

function removeSupervisor(self: Supervisor<any>, that: Supervisor<any>): Supervisor<any> {
  if (equals(self, that)) {
    return Supervisor.none
  } else {
    if (self instanceof Zip) {
      return removeSupervisor(self.left, that).zip(removeSupervisor(self.right, that))
    } else {
      return self
    }
  }
}

function toSet(self: Supervisor<any>): HashSet<Supervisor<any>> {
  if (equals(self, Supervisor.none)) {
    return HashSet.empty()
  } else {
    if (self instanceof Zip) {
      return toSet(self.left).union(toSet(self.right))
    } else {
      return HashSet(self)
    }
  }
}

/**
 * @tsplus static effect/core/io/Supervisor.Ops diff
 */
export function diff(oldValue: Supervisor<any>, newValue: Supervisor<any>): Patch {
  if (equals(oldValue, newValue)) {
    return emptyPatch
  }
  const oldSupervisors = toSet(oldValue)
  const newSupervisors = toSet(newValue)
  const added = newSupervisors.difference(oldSupervisors).reduce(
    emptyPatch,
    (p, s) => combinePatch(p, new AddSupervisor(s))
  )
  const removed = oldSupervisors.difference(newSupervisors).reduce(
    emptyPatch,
    (p, s) => combinePatch(p, new RemoveSupervisor(s))
  )
  return combinePatch(added, removed)
}

/**
 * @tsplus static effect/core/io/Supervisor.Ops differ
 */
export const differ = Differ.make<Supervisor<any>, Patch>({
  empty: emptyPatch,
  patch: applyPatch,
  combine: combinePatch,
  diff
})
