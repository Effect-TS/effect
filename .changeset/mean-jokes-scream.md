---
"@effect/platform": patch
---

Ensure the encoding kind of error responses is respected in the OpenAPI spec.

Before

When generating an OpenAPI spec for a request with an error schema of type `HttpApiSchema.Text()``, the response content type was incorrectly set to "application/json" instead of "text/plain".

```ts
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi
} from "@effect/platform"

const api = HttpApi.make("api").add(
  HttpApiGroup.make("group").add(
    HttpApiEndpoint.get("get", "/").addError(HttpApiSchema.Text())
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
      "parameters": [],
      "security": [],
      "responses": {
        "204": {
          "description": "Success"
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
                "type": "string"
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

After

```diff
import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema, OpenApi } from "@effect/platform"

const api = HttpApi.make("api").add(
  HttpApiGroup.make("group").add(
    HttpApiEndpoint.get("get", "/").addError(HttpApiSchema.Text())
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
      "parameters": [],
      "security": [],
      "responses": {
        "204": {
          "description": "Success"
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
+            "text/plain": {
-            "application/json": {
              "schema": {
                "type": "string"
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
