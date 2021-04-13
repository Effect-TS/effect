// tracing: off

// -------------------------------------------------------------------------------------
// definition
// -------------------------------------------------------------------------------------
export class Background {
  readonly _tag = "Background"
}

export class Foreground {
  readonly _tag = "Foreground"
}

export type Layer = Background | Foreground

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

export const foreground: Layer = new Foreground()

export const background: Layer = new Background()
