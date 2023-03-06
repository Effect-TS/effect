import type * as RenderLayer from "@effect/printer-ansi/RenderLayer"

/** @internal */
export const foreground: RenderLayer.RenderLayer = {
  _tag: "Foreground"
}

/** @internal */
export const background: RenderLayer.RenderLayer = {
  _tag: "Background"
}
