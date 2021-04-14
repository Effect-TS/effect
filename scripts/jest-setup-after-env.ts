import { equals } from "@effect-ts/system/Structural"

const safeStringigy = (obj: any, indent = 2) => {
  let cache: any[] | null = []
  const retVal = JSON.stringify(
    obj,
    (_, value) =>
      typeof value === "object" && value !== null
        ? cache?.includes(value)
          ? undefined // Duplicate reference found, discard key
          : cache?.push(value) && value // Store value in our collection
        : value,
    indent
  )
  cache = null
  return retVal
}

expect.extend({
  equals: (rec, act) => {
    return {
      message: () =>
        `expected:\n${safeStringigy(rec)}\nto equal:\n${safeStringigy(act)}`,
      pass: equals(rec, act)
    }
  }
})
