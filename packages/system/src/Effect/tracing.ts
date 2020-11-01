import { identity } from "../Function"
import { AtomicBoolean } from "../Support/AtomicBoolean"

export const reg = /\/(.*?):(\d+):(\d+)/

export const globalTracingEnabled = new AtomicBoolean(false)

export function traceWith(name: string) {
  if (globalTracingEnabled.get) {
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
  }
  return identity
}
