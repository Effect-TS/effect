import type { Context } from "../Context.ts"

// Only batch execution contexts are tracked. Recording writes, rather than
// comparing values, preserves explicit equal-valued resolver overrides.
export const patches = new WeakMap<Context<never>, ReadonlySet<string>>()

export const mergePatches = <R>(next: Context<R>, contexts: ReadonlyArray<Context<never>>): Context<R> => {
  if (!contexts.some((context) => patches.has(context))) return next
  const keys = new Set<string>()
  for (const context of contexts) {
    const patch = patches.get(context)
    // The last operand containing a key supplies both its value and provenance.
    // Inherited values must not become explicit writes just by being merged.
    for (const key of context.mapUnsafe.keys()) {
      if (patch === undefined || patch.has(key)) keys.add(key)
      else keys.delete(key)
    }
  }
  patches.set(next, keys)
  return next
}

export const inheritPatch = <R>(
  self: Context<never>,
  next: Context<R>,
  added?: string | Iterable<string>
): Context<R> => {
  const patch = patches.get(self)
  if (patch === undefined) return next
  const keys = new Set(patch)
  if (typeof added === "string") {
    // A single add cannot remove keys. Keep Context's overlay fast path lazy.
    keys.add(added)
  } else {
    if (added !== undefined) {
      for (const key of added) keys.add(key)
    }
    for (const key of keys) {
      if (!next.mapUnsafe.has(key)) keys.delete(key)
    }
  }
  patches.set(next, keys)
  return next
}
