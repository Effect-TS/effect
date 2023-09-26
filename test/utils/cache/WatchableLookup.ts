import * as ObservableResource from "effect-test/utils/cache/ObservableResource"
import * as Chunk from "effect/Chunk"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import { identity, pipe } from "effect/Function"
import * as HashMap from "effect/HashMap"
import * as Option from "effect/Option"
import * as Ref from "effect/Ref"
import * as Schedule from "effect/Schedule"
import type * as Scope from "effect/Scope"
import * as TestServices from "effect/TestServices"

export interface WatchableLookup<Key, Error, Value> {
  (key: Key): Effect.Effect<Scope.Scope, Error, Value>
  lock(): Effect.Effect<never, never, void>
  unlock(): Effect.Effect<never, never, void>
  createdResources(): Effect.Effect<
    never,
    never,
    HashMap.HashMap<Key, Chunk.Chunk<ObservableResource.ObservableResource<Error, Value>>>
  >
  firstCreatedResource(key: Key): Effect.Effect<never, never, ObservableResource.ObservableResource<Error, Value>>
  getCalledTimes(key: Key): Effect.Effect<never, never, number>
  resourcesCleaned(
    resources: Iterable<ObservableResource.ObservableResource<Error, Value>>
  ): Effect.Effect<never, never, void>
  assertCalledTimes(key: Key, sizeAssertion: (value: number) => void): Effect.Effect<never, never, void>
  assertFirstNCreatedResourcesCleaned(key: Key, n: number): Effect.Effect<never, never, void>
  assertAllCleaned(): Effect.Effect<never, never, void>
  assertAllCleanedForKey(key: Key): Effect.Effect<never, never, void>
  assertAtLeastOneResourceNotCleanedForKey(key: Key): Effect.Effect<never, never, void>
}

export const make = <Key, Value>(
  concreteLookup: (key: Key) => Value
): Effect.Effect<never, never, WatchableLookup<Key, never, Value>> =>
  makeEffect((key) => Effect.succeed(concreteLookup(key)))

export const makeUnit = (): Effect.Effect<never, never, WatchableLookup<void, never, void>> => make((_: void) => void 0)

export const makeEffect = <Key, Error, Value>(
  concreteLookup: (key: Key) => Effect.Effect<never, Error, Value>
): Effect.Effect<never, never, WatchableLookup<Key, Error, Value>> =>
  Effect.map(
    Effect.zip(
      Ref.make(false),
      Ref.make(HashMap.empty<Key, Chunk.Chunk<ObservableResource.ObservableResource<Error, Value>>>())
    ),
    ([blocked, resources]): WatchableLookup<Key, Error, Value> => {
      function lookup(key: Key): Effect.Effect<Scope.Scope, Error, Value> {
        return Effect.flatten(Effect.gen(function*($) {
          const observableResource = yield* $(ObservableResource.makeEffect(concreteLookup(key)))
          yield* $(Ref.update(resources, (resourceMap) => {
            const newResource = pipe(
              HashMap.get(resourceMap, key),
              Option.getOrElse(() => Chunk.empty<ObservableResource.ObservableResource<Error, Value>>()),
              Chunk.append(observableResource)
            )
            return HashMap.set(resourceMap, key, newResource)
          }))
          const schedule = Schedule.intersect(
            Schedule.recurWhile<boolean>(identity),
            Schedule.exponential(Duration.millis(10), 2.0)
          )
          yield* $(
            Ref.get(blocked),
            Effect.repeat(schedule),
            TestServices.provideLive
          )
          return observableResource.scoped
        }))
      }
      const lock = () => Ref.set(blocked, true)
      const unlock = () => Ref.set(blocked, false)
      const createdResources = () => Ref.get(resources)
      const firstCreatedResource = (key: Key) =>
        Effect.map(
          Ref.get(resources),
          (map) => Chunk.unsafeHead(HashMap.unsafeGet(map, key))
        )
      const getCalledTimes = (key: Key) =>
        Effect.map(
          createdResources(),
          (map) =>
            Option.match(HashMap.get(map, key), {
              onNone: () => 0,
              onSome: Chunk.size
            })
        )
      const resourcesCleaned = (resources: Iterable<ObservableResource.ObservableResource<Error, Value>>) =>
        Effect.forEach(resources, (resource) => Effect.suspend(() => resource.assertAcquiredOnceAndCleaned()))
      const assertCalledTimes = (key: Key, sizeAssertion: (value: number) => void) =>
        Effect.flatMap(getCalledTimes(key), (n) => Effect.sync(() => sizeAssertion(n)))
      const assertFirstNCreatedResourcesCleaned = (key: Key, n: number) =>
        Effect.flatMap(createdResources(), (resources) =>
          resourcesCleaned(pipe(
            HashMap.get(resources, key),
            Option.match({
              onNone: () => Chunk.empty<ObservableResource.ObservableResource<Error, Value>>(),
              onSome: Chunk.take(n)
            })
          )))
      const assertAllCleaned = () =>
        Effect.flatMap(createdResources(), (resources) =>
          resourcesCleaned(
            Chunk.flatten(Chunk.unsafeFromArray(Array.from(HashMap.values(resources))))
          ))
      const assertAllCleanedForKey = (key: Key) =>
        Effect.flatMap(createdResources(), (resources) =>
          resourcesCleaned(pipe(HashMap.get(resources, key), Option.getOrElse(() => Chunk.empty()))))
      const assertAtLeastOneResourceNotCleanedForKey = (key: Key) =>
        Effect.flatMap(createdResources(), (resources) => {
          const resourcesForKey = pipe(
            HashMap.get(resources, key),
            Option.getOrElse(() =>
              Chunk.empty()
            )
          )
          return pipe(
            Effect.reduce(resourcesForKey, false, (acc, resource) =>
              pipe(
                Effect.suspend(() => resource.assertAcquiredOnceAndNotCleaned()),
                Effect.isSuccess,
                Effect.map((isSuccess) => acc || isSuccess)
              )),
            Effect.map((atLeastOneNotCleaned) => Effect.sync(() => expect(atLeastOneNotCleaned).toBe(true)))
          )
        })
      return Object.assign(lookup, {
        lock,
        unlock,
        createdResources,
        firstCreatedResource,
        getCalledTimes,
        resourcesCleaned,
        assertCalledTimes,
        assertFirstNCreatedResourcesCleaned,
        assertAllCleaned,
        assertAllCleanedForKey,
        assertAtLeastOneResourceNotCleanedForKey
      })
    }
  )
