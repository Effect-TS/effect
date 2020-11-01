import { identity } from "../Function"

export const reg = /\/(.*?):(\d+):(\d+)/

export function traceWith(name: string) {
  const line = new Error()?.stack?.split("\n")?.[3]

  if (line) {
    const ref = reg.exec(line)

    if (ref) {
      const full = `${name} : /${ref[1]}:${ref[2]}:${ref[3]}`
      return <X>(x: X) => {
        x["$trace"] = full
        return x
      }
    }
  }

  return identity
}
