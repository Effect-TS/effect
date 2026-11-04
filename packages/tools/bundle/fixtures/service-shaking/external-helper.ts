import * as Logger from "effect/Logger"

// Imported by `external-module.ts`. The test marks this module external, so
// the analysis never sees the logger that inspects its Fiber.
export const seen: Array<string> = []

export const layer = Logger.layer([
  Logger.make((options) => {
    const services: ReadonlyMap<string, object> = Reflect.get(Reflect.get(options.fiber, "context"), "mapUnsafe")
    seen.push(typeof Reflect.get(services.get("test/ExternalModule")!, "unused"))
  })
])
