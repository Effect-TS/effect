import * as Data from "effect/Data"
import * as Schema from "effect/Schema"

/**
 * An error that occurs when attempting to create a Naval Fate ship that already
 * exists.
 */
export class ShipExistsError extends Data.TaggedError("ShipExistsError")<{
  readonly name: string
}> {
  toString(): string {
    return `ShipExistsError: ship with name '${this.name}' already exists`
  }
}

/**
 * An error that occurs when attempting to move a Naval Fate ship that does not
 * exist.
 */
export class ShipNotFoundError extends Data.TaggedError("ShipNotFoundError")<{
  readonly name: string
  readonly x: number
  readonly y: number
}> {
  toString(): string {
    return `ShipNotFoundError: ship with name '${this.name}' does not exist`
  }
}

/**
 * An error that occurs when attempting to move a Naval Fate ship to coordinates
 * already occupied by another ship.
 */
export class CoordinatesOccupiedError extends Data.TaggedError("CoordinatesOccupiedError")<{
  readonly name: string
  readonly x: number
  readonly y: number
}> {
  toString(): string {
    return `CoordinatesOccupiedError: ship with name '${this.name}' already occupies coordinates (${this.x}, ${this.y})`
  }
}

/**
 * Represents a Naval Fate ship.
 */
export class Ship extends Schema.Class<Ship>("Ship")({
  name: Schema.String,
  x: Schema.Number,
  y: Schema.Number,
  status: Schema.Literal("sailing", "destroyed")
}) {
  static readonly create = (name: string) => new Ship({ name, x: 0, y: 0, status: "sailing" })

  hasCoordinates(x: number, y: number): boolean {
    return this.x === x && this.y === y
  }

  move(x: number, y: number): Ship {
    return new Ship({ name: this.name, x, y, status: this.status })
  }

  destroy(): Ship {
    return new Ship({ name: this.name, x: this.x, y: this.y, status: "destroyed" })
  }
}

/**
 * Represents a Naval Fate mine.
 */
export class Mine extends Schema.Class<Mine>("Mine")({
  x: Schema.Number,
  y: Schema.Number
}) {
  static readonly create = (x: number, y: number) => new Mine({ x, y })

  hasCoordinates(x: number, y: number): boolean {
    return this.x === x && this.y === y
  }
}
