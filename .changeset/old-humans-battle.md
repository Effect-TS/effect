---
"@effect/platform": patch
---

Fix: Prevent request body from being added to the OpenAPI spec for GET methods in `OpenApi.fromApi`.

When creating a `GET` endpoint with a request payload, the `requestBody` was incorrectly added to the OpenAPI specification, which is invalid for `GET` methods.

Before

```ts
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  OpenApi
} from "@effect/platform"
import { Schema } from "effect"

const api = HttpApi.make("api").add(
  HttpApiGroup.make("group").add(
    HttpApiEndpoint.get("get", "/")
      .addSuccess(Schema.String)
      .setPayload(
        Schema.Struct({
          a: Schema.String
        })
      )
  )
)

const spec = OpenApi.fromApi(api)

console.log(JSON.stringify(spec.paths, null, 2))
/*
Output:
{
  "/": {
    "get": {
      "tags": [
        "group"
      ],
      "operationId": "group.get",
      "parameters": [
        {
          "name": "a",
          "in": "query",
          "schema": {
            "type": "string"
          },
          "required": true
        }
      ],
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
        }
      },
      "requestBody": {
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "required": [
                "a"
              ],
              "properties": {
                "a": {
                  "type": "string"
                }
              },
              "additionalProperties": false
            }
          }
        },
        "required": true
      }
    }
  }
}
*/
```

After

```ts
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  OpenApi
} from "@effect/platform"
import { Schema } from "effect"

const api = HttpApi.make("api").add(
  HttpApiGroup.make("group").add(
    HttpApiEndpoint.get("get", "/")
      .addSuccess(Schema.String)
      .setPayload(
        Schema.Struct({
          a: Schema.String
        })
      )
  )
)

const spec = OpenApi.fromApi(api)

console.log(JSON.stringify(spec.paths, null, 2))
/*
Output:
{
  "/": {
    "get": {
      "tags": [
        "group"
      ],
      "operationId": "group.get",
      "parameters": [
        {
          "name": "a",
          "in": "query",
          "schema": {
            "type": "string"
          },
          "required": true
        }
      ],
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
        }
      }
    }
  }
}
*/
```
