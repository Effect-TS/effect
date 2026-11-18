import * as BytePath from "../../BytePath.ts"
import * as Predicate from "../../Predicate.ts"
import * as Result from "../../Result.ts"
import * as V from "./model.ts"

const sameBytes = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((byte, index) => byte === b[index])
const Paths = {
  ownedPath: (bytes: Uint8Array) => Result.getOrThrow(BytePath.fromBytes(bytes)),
  ROOT_PATH: new Uint8Array([47])
}

export interface Link {
  readonly parent: bigint
  readonly name: Uint8Array
}

export interface CallerWatchSelection {
  readonly rootChain: ReadonlyArray<bigint>
  readonly target: bigint
  readonly recursive: boolean
  readonly selected?: Link | undefined
}

export interface Event {
  readonly change: V.Change
  readonly object: bigint
  readonly parent: bigint
  readonly path: Uint8Array
  readonly previous?: bigint | undefined
}

export interface View {
  readonly root: Uint8Array
  readonly aliases: ReadonlyArray<Uint8Array>
}

const below = (path: Uint8Array, directory: Uint8Array): boolean => {
  if (directory.length === 1) return true

  if (path.length !== directory.length && path[directory.length] !== 47) return false

  return sameBytes(path.subarray(0, directory.length), directory)
}

const relative = (absolute: Uint8Array, root: Uint8Array) => {
  if (root.length === 1) return Paths.ownedPath(absolute)

  return Paths.ownedPath(absolute.length === root.length ? Paths.ROOT_PATH : absolute.subarray(root.length))
}

const rootPath = (
  chain: ReadonlyArray<bigint>,
  paths: (ino: bigint) => Array<Uint8Array>
): Uint8Array | V.ReadError => {
  let parent: Uint8Array = Paths.ROOT_PATH

  for (const ino of chain) {
    const current = paths(ino)[0]

    if (current === undefined) return new V.InvalidResource({ operation: "watch", reason: "closed" })

    if (!below(current, parent)) return new V.AccessDenied({ operation: "watch", reason: "confinement" })
    parent = current
  }

  return parent
}

// Capture the caller's visible names on either side of publication. No live permission lookup occurs in a listener.
export const observe = (
  options: CallerWatchSelection,
  selected: Link | undefined,
  paths: (ino: bigint) => Array<Uint8Array>,
  entryPath: (link: Link) => Uint8Array | undefined
): View | V.ReadError => {
  const root = rootPath(options.rootChain, paths)

  if (!Predicate.isUint8Array(root)) return root
  const aliases = paths(options.target)
  const choice = selected === undefined ? undefined : entryPath(selected)

  return {
    root,
    aliases: aliases.filter((path) =>
      below(path, root) && (selected === undefined || (choice !== undefined && sameBytes(path, choice)))
    )
  }
}

export const deliver = (
  options: CallerWatchSelection,
  before: View,
  after: View,
  events: ReadonlyArray<Event>,
  offer: (event: V.Change, rescan: BytePath.BytePath) => void,
  end: (last: ReadonlyArray<V.Change>, rescan: BytePath.BytePath) => void
) => {
  const gone = after.aliases.length === 0

  const rescan = gone
    ? relative(before.aliases[0] ?? before.root, before.root)
    : relative(after.aliases[0] ?? after.root, after.root)

  for (const event of events) {
    if (event.previous === options.target && event.object !== options.target) {
      if (!gone && before.aliases.some((path) => sameBytes(path, event.path))) {
        offer({ _tag: "Remove", path: relative(event.path, before.root) }, rescan)
      }
    }

    const removed = Predicate.isTagged(event.change, "Remove")
    const view = removed ? before : after

    if (!below(event.path, view.root)) continue

    if (event.object === options.target) {
      if (gone && removed) continue

      if (!view.aliases.some((path) => sameBytes(path, event.path))) continue
    } else if (
      !view.aliases.some((scope) =>
        below(event.path, scope) &&
        (options.recursive || event.path.lastIndexOf(47) === (scope.length === 1 ? 0 : scope.length))
      )
    ) continue

    // Renaming a confinement root cannot disclose its outside parent.
    if (event.object === options.rootChain.at(-1) && !Predicate.isTagged(event.change, "Update")) continue
    offer({ _tag: event.change._tag, path: relative(event.path, view.root) }, rescan)
  }

  if (gone) {
    end(before.aliases.map((path) => ({ _tag: "Remove" as const, path: relative(path, before.root) })), rescan)
  }
}
