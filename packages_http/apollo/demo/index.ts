import { gql } from "apollo-server"

import { apollo } from "../src"

import * as A from "@matechs/core/Array"
import * as T from "@matechs/core/Effect"
import { pipe } from "@matechs/core/Function"
import * as M from "@matechs/core/Managed"
import * as O from "@matechs/core/Option"
import { combine } from "@matechs/core/Provider"
import * as EX from "@matechs/express"

// EXPERIMENTAL
/* istanbul ignore file */

const apolloURI = "myapp/unique-uri"
const Apollo = apollo(
  apolloURI,
  {
    subscriptions: {
      path: "/subscriptions",
      onConnect: (_, ws) =>
        T.access((_: { subOnConnect: string }) => ({
          ws,
          message: "ok"
        })),
      onDisconnect: () =>
        T.access((_: { subOnDisconnect: string }) => {
          //
        })
    }
  },
  ({ connection, req }) =>
    T.access((_: { contextFnEnv: string }) => ({
      req: connection ? O.none : O.some(req),
      sub: connection ? O.some(connection.context) : O.none
    }))
)

const typeDefs = gql`
  type Book {
    title: String
    author: String
  }
  type Query {
    books(n: Int!): [Book]
    hi: String
  }
  type DemoMessage {
    message: String
  }
  type Subscription {
    demo(n: Int!): DemoMessage
  }
  schema {
    query: Query
    subscription: Subscription
  }
`

const books = Apollo.binder({
  ["Query/books"]: Apollo.resolver<{ n: number }>()(({ args }) =>
    pipe(
      T.access((_: { foo: string }) => _.foo),
      T.map((foo) =>
        pipe(
          A.range(0, args.n),
          A.map((i) => ({ title: `book: ${i}`, author: foo }))
        )
      )
    )
  )
})

const hi = Apollo.binder({
  ["Query/hi"]: () =>
    T.accessM((_: { bar: string }) =>
      pipe(
        Apollo.accessContext,
        T.chain(({ req }) =>
          O.isSome(req) ? T.pure(`${_.bar} - with req`) : T.pure(_.bar)
        )
      )
    )
})

async function* gen(n: number, message: O.Option<string>) {
  let i = 0
  while (i < n) {
    yield {
      demo: { message: `${i++} - ${O.isSome(message) ? message.value : "no-sub"}` }
    }
  }
}

export const demo = Apollo.binder({
  ["Subscription/demo"]: Apollo.subscription<{ n: number }>()(
    (_) =>
      T.accessM(({ subN }: { subN: number }) =>
        pipe(
          Apollo.accessContext,
          T.chain(({ sub }) =>
            T.pure(
              gen(
                subN + _.args.n,
                pipe(
                  sub,
                  O.map(({ message }) => message)
                )
              )
            )
          )
        )
      ),
    (x) =>
      T.accessM(({ prefix }: { prefix: string }) =>
        pipe(
          Apollo.accessContext,
          T.chain(({ sub }) =>
            O.isSome(sub)
              ? T.pure({
                  message: `${prefix}: ${x.demo.message} (resolve: ${sub.value.message})`
                })
              : T.pure({ message: `${prefix}: ${x.demo.message}` })
          )
        )
      )
  )
})

const resolvers = Apollo.binder({
  ...hi,
  ...books,
  ...demo
})

const main = pipe(
  // Bind apollo
  Apollo.bindToSchema(resolvers, typeDefs),
  // keep server waiting
  T.chainTap(() => T.never)
)

const provider = combine()
  .with(M.provide(EX.managedExpress(8080)))
  .with(T.provide(EX.express))
  .with(
    T.provide({
      foo: "foo"
    })
  )
  .with(
    T.provide({
      bar: "bar"
    })
  )
  .with(
    T.provide({
      subN: 10
    })
  )
  .with(
    T.provide({
      prefix: "ok"
    })
  )
  .with(
    T.provide({
      subOnDisconnect: "ok"
    })
  )
  .with(
    T.provide({
      subOnConnect: "ok"
    })
  )
  .with(
    T.provide({
      contextFnEnv: "ok"
    })
  )
  .done()

const cancel = pipe(main, provider, (x) =>
  T.run(x, (ex) => {
    console.log(ex)
  })
)

process.on("SIGINT", () => {
  cancel()
})
