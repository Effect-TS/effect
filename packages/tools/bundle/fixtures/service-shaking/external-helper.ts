// Imported by `external-module.ts`. The test marks this module external, so
// the analysis never sees it reading the running Fiber's services. It has no
// imports, so every runtime can load it from the bundle's temporary directory.
export const unusedType = (): string => {
  const fiber = (globalThis as Record<string, any>)["~effect/Fiber/currentFiber"]
  return typeof fiber.context.mapUnsafe.get("test/ExternalModule").unused
}
