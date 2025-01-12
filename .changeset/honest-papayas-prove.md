---
"@effect/platform": patch
---

Deduplicate errors in `OpenApi.fromApi`.

When multiple identical errors were added to the same endpoint, group, or API, they were all included in the generated OpenAPI specification, leading to redundant entries in the `anyOf` array for error schemas.

Identical errors are now deduplicated in the OpenAPI specification. This ensures that each error schema is included only once, simplifying the generated spec and improving readability.

**Before**

```ts
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  OpenApi
} from "@effect/platform"
import { Schema } from "effect"

const err = Schema.String.annotations({ identifier: "err" })
const api = HttpApi.make("api")
  .add(
    HttpApiGroup.make("group1")
      .add(
        HttpApiEndpoint.get("get1", "/1")
          .addSuccess(Schema.String)
          .addError(err)
          .addError(err)
      )
      .addError(err)
      .addError(err)
  )
  .addError(err)
  .addError(err)

const spec = OpenApi.fromApi(api)

console.log(JSON.stringify(spec.paths, null, 2))
/*
Output:
{
  "/1": {
    "get": {
      "tags": [
        "group1"
      ],
      "operationId": "group1.get1",
      "parameters": [],
      "security": [],
      "responses": {
        "200": {
          "description": "a string",
          "content": {
            "application/json": {
              "schema": {
                "type": "string"
              }
            }
          }
        },
        "400": {
          "description": "The request did not match the expected schema",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/HttpApiDecodeError"
              }
            }
          }
        },
        "500": {
          "description": "a string",
          "content": {
            "application/json": {
              "schema": "schema": {
                "anyOf": [
                  {
                    "$ref": "#/components/schemas/err"
                  },
                  {
                    "$ref": "#/components/schemas/err"
                  },
                  {
                    "$ref": "#/components/schemas/err"
                  }
                ]
              }
            }
          }
        }
      }
    }
  }
}
*/
```

**After**

```ts
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  OpenApi
} from "@effect/platform"
import { Schema } from "effect"

const err = Schema.String.annotations({ identifier: "err" })
const api = HttpApi.make("api")
  .add(
    HttpApiGroup.make("group1")
      .add(
        HttpApiEndpoint.get("get1", "/1")
          .addSuccess(Schema.String)
          .addError(err)
          .addError(err)
      )
      .addError(err)
      .addError(err)
  )
  .addError(err)
  .addError(err)

const spec = OpenApi.fromApi(api)

console.log(JSON.stringify(spec.paths, null, 2))
/*
Output:
{
  "/1": {
    "get": {
      "tags": [
        "group1"
      ],
      "operationId": "group1.get1",
      "parameters": [],
      "security": [],
      "responses": {
        "200": {
          "description": "a string",
          "content": {
            "application/json": {
              "schema": {
                "type": "string"
              }
            }
          }
        },
        "400": {
          "description": "The request did not match the expected schema",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/HttpApiDecodeError"
              }
            }
          }
        },
        "500": {
          "description": "a string",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/err"
              }
            }
          }
        }
      }
    }
  }
}
*/
```
