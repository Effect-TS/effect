import * as Schema from "effect/Schema"
import { entityInput, makeCore, makeEntity } from "./domain.ts"

const sizes: Record<string, number> = { small: 10, medium: 100, large: 1000 }

// A standalone schema graph. Only the last entity's schemas are used after definition.
export const createWorkload = (size: string) => {
  const count = sizes[size]
  if (count === undefined) throw new Error(`Unknown size: ${size}`)
  let entities: Array<ReturnType<typeof makeEntity>> = []
  const last = count - 1
  const input = entityInput(last)
  const event = { _tag: "Created", entity: input }
  let decoded: unknown
  let decode: (input: unknown) => unknown
  return {
    define: () => {
      const core = makeCore()
      entities = Array.from({ length: count }, (_, index) => makeEntity(core, index))
    },
    phases: {
      decode: () => {
        decode = Schema.decodeUnknownSync(entities[last].Event)
        decoded = decode(event)
        return decoded
      },
      encode: () => Schema.encodeSync(entities[last].Event)(decoded as never)
    },
    warm: () => decode(event),
    retained: () => entities
  }
}
