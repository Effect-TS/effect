import * as KeyValueStore from "@effect/platform/KeyValueStore"
import * as Arr from "effect/Array"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import { CoordinatesOccupiedError, Mine, Ship, ShipExistsError, ShipNotFoundError } from "./domain.js"

/**
 * Represents the storage layer for the Naval Fate command-line application.
 */
export interface NavalFateStore {
  createShip(name: string): Effect.Effect<Ship, ShipExistsError>
  moveShip(
    name: string,
    x: number,
    y: number
  ): Effect.Effect<Ship, CoordinatesOccupiedError | ShipNotFoundError>
  shoot(x: number, y: number): Effect.Effect<void>
  setMine(x: number, y: number): Effect.Effect<void>
  removeMine(x: number, y: number): Effect.Effect<void>
}

export const NavalFateStore = Context.GenericTag<NavalFateStore>("NavalFateStore")

export const make = Effect.gen(function*() {
  const shipsStore = yield* Effect.map(
    KeyValueStore.KeyValueStore,
    (store) => store.forSchema(Schema.ReadonlyMap({ key: Schema.String, value: Ship }))
  )
  const minesStore = yield* Effect.map(
    KeyValueStore.KeyValueStore,
    (store) => store.forSchema(Schema.Array(Mine))
  )

  const getShips = shipsStore.get("ships").pipe(
    Effect.map(Option.getOrElse<ReadonlyMap<string, Ship>>(() => new Map())),
    Effect.orDie
  )
  const getMines = minesStore.get("mines").pipe(
    Effect.map(Option.getOrElse<ReadonlyArray<Mine>>(() => [])),
    Effect.orDie
  )
  const setShips = (ships: ReadonlyMap<string, Ship>) => shipsStore.set("ships", ships).pipe(Effect.orDie)
  const setMines = (mines: ReadonlyArray<Mine>) => minesStore.set("mines", mines).pipe(Effect.orDie)

  const createShip: NavalFateStore["createShip"] = (name) =>
    Effect.gen(function*() {
      const oldShips = yield* getShips
      const foundShip = Option.fromNullable(oldShips.get(name))
      if (Option.isSome(foundShip)) {
        return yield* Effect.fail(new ShipExistsError({ name }))
      }
      const ship = Ship.create(name)
      const newShips = new Map(oldShips).set(name, ship)
      yield* setShips(newShips)
      return ship
    })

  const moveShip: NavalFateStore["moveShip"] = (name, x, y) =>
    Effect.gen(function*() {
      const oldShips = yield* getShips
      const foundShip = Option.fromNullable(oldShips.get(name))
      if (Option.isNone(foundShip)) {
        return yield* Effect.fail(new ShipNotFoundError({ name, x, y }))
      }
      const shipAtCoords = pipe(
        Arr.fromIterable(oldShips.values()),
        Arr.findFirst((ship) => ship.hasCoordinates(x, y))
      )
      if (Option.isSome(shipAtCoords)) {
        return yield* Effect.fail(
          new CoordinatesOccupiedError({ name: shipAtCoords.value.name, x, y })
        )
      }
      const mines = yield* getMines
      const mineAtCoords = Arr.findFirst(mines, (mine) => mine.hasCoordinates(x, y))
      const ship = Option.isSome(mineAtCoords)
        ? foundShip.value.move(x, y).destroy()
        : foundShip.value.move(x, y)
      const newShips = new Map(oldShips).set(name, ship)
      yield* setShips(newShips)
      return ship
    })

  const shoot: NavalFateStore["shoot"] = (x, y) =>
    Effect.gen(function*() {
      const oldShips = yield* getShips
      const shipAtCoords = pipe(
        Arr.fromIterable(oldShips.values()),
        Arr.findFirst((ship) => ship.hasCoordinates(x, y))
      )
      if (Option.isSome(shipAtCoords)) {
        const ship = shipAtCoords.value.destroy()
        const newShips = new Map(oldShips).set(ship.name, ship)
        yield* setShips(newShips)
      }
    })

  const setMine: NavalFateStore["setMine"] = (x, y) =>
    Effect.gen(function*() {
      const mines = yield* getMines
      const mineAtCoords = Arr.findFirst(mines, (mine) => mine.hasCoordinates(x, y))
      if (Option.isNone(mineAtCoords)) {
        const mine = Mine.create(x, y)
        const newMines = Arr.append(mines, mine)
        yield* setMines(newMines)
      }
    })

  const removeMine: NavalFateStore["removeMine"] = (x, y) =>
    Effect.gen(function*() {
      const mines = yield* getMines
      const mineAtCoords = Arr.findFirstIndex(mines, (mine) => mine.hasCoordinates(x, y))
      if (Option.isSome(mineAtCoords)) {
        const newMines = Arr.remove(mines, mineAtCoords.value)
        yield* setMines(newMines)
      }
    })

  return NavalFateStore.of({
    createShip,
    moveShip,
    shoot,
    setMine,
    removeMine
  })
})

export const layer = Layer.effect(NavalFateStore, make)
