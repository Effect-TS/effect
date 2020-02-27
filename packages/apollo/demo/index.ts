import { effect as T } from "@matechs/effect";
import * as EX from "@matechs/express";
import { gql } from "apollo-server";
import { array as A } from "fp-ts";
import { pipe } from "fp-ts/lib/pipeable";
import * as Apollo from "../src";

// Experimental
/* istanbul ignore file */

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
    demo: DemoMessage
  }
  schema {
    query: Query
    subscription: Subscription
  }
`;

const books = Apollo.resolver({
  ["Query/books"]: ({ args }) =>
    pipe(
      T.access((_: { foo: string }) => _.foo),
      T.map(foo =>
        pipe(
          A.range(0, args["n"] as number),
          A.map(i => ({ title: `book: ${i}`, author: foo }))
        )
      )
    )
});

const hi = Apollo.resolver({
  ["Query/hi"]: () => T.accessM((_: { bar: string }) => T.pure(_.bar))
});

async function* gen(n: number) {
  let i = 0;
  while (i < n) {
    yield {
      demo: { message: `${i++}` }
    };
  }
}

const demo = Apollo.resolver({
  ["Subscription/demo"]: Apollo.subscription(
    _ => T.accessM(({ subN }: { subN: number }) => T.pure(gen(subN))),
    x => T.accessM(({ prefix }: { prefix: string }) => T.pure({ message: `${prefix}: ${x.demo.message}` }))
  )
});

const resolvers = Apollo.resolver({
  ...hi,
  ...books,
  ...demo
});

const main = pipe(Apollo.bindToSchema(resolvers, typeDefs), EX.bracketWithApp(8080));

const cancel = pipe(
  main,
  T.provideS({
    foo: "foo"
  }),
  T.provideS({
    bar: "bar"
  }),
  T.provideS({
    subN: 10
  }),
  T.provideS({
    prefix: "ok"
  }),
  T.provideS(EX.express),
  x =>
    T.run(x, ex => {
      console.log(ex);
    })
);

process.on("SIGINT", () => {
  cancel();
});
