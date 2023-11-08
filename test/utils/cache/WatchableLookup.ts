import * as ObservableResource from "effect-test/utils/cache/ObservableResource"
import { Chunk } from "effect/Chunk"
import { Duration } from "effect/Duration"
import { Effect } from "effect/Effect"
import { identity, pipe } from "effect/Function"
import { HashMap } from "effect/HashMap"
import { Option } from "effect/Option"
import { Ref } from "effect/Ref"
import { Schedule } from "effect/Schedule"
import type { Scope } from "effect/Scope"
import { TestServices } from "effect/TestServices"
import { expect } from "vitest"

export interface WatchableLookup<Key, Error, Value> {
  (key: Key): Effect<Scope, Error, Value>
  lock(): Effect<never, never, void>
  unlock(): Effect<never, never, void>
  createdResources(): Effect<
    never,
    never,
    HashMap<Key, Chunk<ObservableResource.ObservableResource<Error, Value>>>
  >
  firstCreatedResource(key: Key): Effect<never, never, ObservableResource.ObservableResource<Error, Value>>
  getCalledTimes(key: Key): Effect<never, never, number>
  resourcesCleaned(
    resources: Iterable<ObservableResource.ObservableResource<Error, Value>>
  ): Effect<never, never, void>
  assertCalledTimes(key: Key, sizeAssertion: (value: number) => void): Effect<never, never, void>
  assertFirstNCreatedResourcesCleaned(key: Key, n: number): Effect<never, never, void>
  assertAllCleaned(): Effect<never, never, void>
  assertAllCleanedForKey(key: Key): Effect<never, never, void>
  assertAtLeastOneResourceNotCleanedForKey(key: Key): Effect<never, never, void>
}

export const make = <Key, Value>(
  concreteLookup: (key: Key) => Value
): Effect<never, never, WatchableLookup<Key, never, Value>> => makeEffect((key) => Effect.succeed(concreteLookup(key)))

export const makeUnit = (): Effect<never, never, WatchableLookup<void, never, void>> => make((_: void) => void 0)

export const makeEffect = <Key, Error, Value>(
  concreteLookup: (key: Key) => Effect<never, Error, Value>
): Effect<never, never, WatchableLookup<Key, Error, Value>> =>
  Effect.map(
    Effect.zip(
      Ref.make(false),
      Ref.make(HashMap.empty<Key, Chunk<ObservableResource.ObservableResource<Error, Value>>>())
    ),
    ([blocked, resources]): WatchableLookup<Key, Error, Value> => {
      function lookup(key: Key): Effect<Scope, Error, Value> {
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
