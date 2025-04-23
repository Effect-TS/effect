import { describe, it } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
import * as Array from "effect/Array"
import * as Context from "effect/Context"
import { seconds } from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Request from "effect/Request"
import * as Resolver from "effect/RequestResolver"

interface Counter {
  readonly _: unique symbol
}
const Counter = Context.GenericTag<Counter, { count: number }>("counter")
interface Requests {
  readonly _: unique symbol
}
const Requests = Context.GenericTag<Requests, { count: number }>("requests")

interface Parent {
  readonly id: number
}

interface Child {
  readonly id: number
  readonly parentId: number
}

interface ChildInfo {
  readonly id: number
  readonly childId: number
  readonly name: string
}

interface ChildExtra {
  readonly id: number
  readonly childId: number
  readonly extra: string
}

export interface GetAllParents extends Request.Request<ReadonlyArray<Parent>> {
  readonly _tag: "GetAllParents"
}

export const GetAllParents = Request.tagged<GetAllParents>("GetAllParents")

export interface GetParentChildren extends Request.Request<ReadonlyArray<Child>> {
  readonly _tag: "GetParentChildren"
  readonly id: number
}

export const GetParentChildren = Request.tagged<GetParentChildren>("GetParentChildren")

export interface GetChildInfo extends Request.Request<ChildInfo> {
  readonly _tag: "GetChildInfo"
  readonly id: number
}

export const GetChildInfo = Request.tagged<GetChildInfo>("GetChildInfo")

export interface GetChildExtra extends Request.Request<ChildExtra> {
  readonly _tag: "GetChildExtra"
  readonly id: number
}

export const GetChildExtra = Request.tagged<GetChildExtra>("GetChildExtra")

export const parents = Array.range(1, 2).map<Parent>((id) => ({ id }))

export const children: ReadonlyMap<number, ReadonlyArray<Child>> = new Map(
  Array.map(parents, (p) => [
    p.id,
    Array.of({ id: p.id * 10, parentId: p.id })
  ])
)

const counted = <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.tap(self, () => Effect.map(Counter, (c) => c.count++))

const AllResolver = Resolver.makeBatched((
  requests: Array<GetParentChildren | GetAllParents | GetChildExtra | GetChildInfo>
) =>
  Effect.flatMap(Requests, (r) => {
    r.count += requests.length
    return counted(Effect.all([
      Effect.forEach(
        requests.filter((_): _ is GetParentChildren => _._tag === "GetParentChildren"),
        (request) => Request.succeed(request, children.get(request.id)!)
      ),
      Effect.forEach(
        requests.filter((_): _ is GetChildExtra => _._tag === "GetChildExtra"),
        (request) =>
          Request.succeed(request, {
            id: request.id * 10,
            childId: request.id,
            extra: "more stuff"
          })
      ),
      Effect.forEach(
        requests.filter((_): _ is GetChildInfo => _._tag === "GetChildInfo"),
        (request) =>
          Request.succeed(request, {
            id: request.id * 10,
            childId: request.id,
            name: "Mike"
          })
      ),
      Effect.forEach(
        requests.filter((_): _ is GetAllParents => _._tag === "GetAllParents"),
        (request) => Request.succeed(request, parents)
      )
    ]))
  })
).pipe(
  Resolver.batchN(15),
  Resolver.contextFromServices(Counter, Requests)
)

export const getAllParents = Effect.request(GetAllParents({}), AllResolver)
export const getChildren = (id: number) => Effect.request(GetParentChildren({ id }), AllResolver)
export const getChildInfo = (id: number) => Effect.request(GetChildInfo({ id }), AllResolver)
export const getChildExtra = (id: number) => Effect.request(GetChildExtra({ id }), AllResolver)

const EnvLive = Layer.mergeAll(
  Layer.sync(Counter, () => ({ count: 0 })),
  Layer.sync(Requests, () => ({ count: 0 }))
).pipe(Layer.provideMerge(
  Layer.mergeAll(
    Layer.setRequestCache(Request.makeCache({
      capacity: 100,
      timeToLive: seconds(60)
    })),
    Layer.setRequestCaching(true),
    Layer.setRequestBatching(true)
  )
))

describe("Effect", () => {
  it.effect("nested queries are batched", () =>
    Effect.gen(function*() {
      const parents = yield* getAllParents

      yield* Effect.forEach(
        parents,
        (parent) =>
          Effect.flatMap(
            getChildren(parent.id),
            (children) =>
              Effect.forEach(
                children,
                (child) =>
                  Effect.zip(
                    getChildInfo(child.id),
                    getChildExtra(child.id),
                    {
                      concurrent: true,
                      batching: "inherit"
                    }
                  ),
                {
                  concurrency: "unbounded",
                  batching: "inherit"
                }
              )
          ),
        {
          concurrency: "inherit",
          batching: "inherit"
        }
      )

      const count = yield* Counter
      const requests = yield* Requests

      strictEqual(count.count, 3)
      strictEqual(requests.count, 7)
    }).pipe(
      Effect.provide(EnvLive)
    ))
})
