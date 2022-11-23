/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */
require("ts-node").register({
  lazy: true,
  project: "tsconfig.examples.json"
})

require("../examples/defects")
