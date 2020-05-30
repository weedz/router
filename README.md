# Router

[![npm](https://img.shields.io/npm/v/@weedzcokie/router?style=flat-square)](https://www.npmjs.com/package/@weedzcokie/router)
[![Build Status](https://travis-ci.org/weedz/router.svg?branch=master)](https://travis-ci.org/weedz/router)
[![Coverage Status](https://coveralls.io/repos/github/weedz/router/badge.svg?branch=master)](https://coveralls.io/github/weedz/router?branch=master)

Examples:

```javascript
import { Router, RouteTree } from "router";
const router = new Router();

router.set("GET", "/test", ...); // 1
router.set("GET", "/test/:msg", ...); // 2
router.set("GET", "/test/:param1/:param2", ...); // 3
router.set("GET", "/test/:param1/1/:param2", ...); // 4
router.set("GET", "/splat/*/test", ...); // 5
router.set("GET", "/splat1/*", ...); // 6
router.set("GET", "/wildcardparam/*/:param", ...); // 7
router.set("GET", "/wildcardparam/*/test/:param", ...); // 8
router.anyOf(["GET", "POST"], "/or/ping|pong", ...); // 9
router.set("GET", "/or/ping|pong/:param", ...); // 10

router.find("/test", "GET");    // matches 1
router.find("/test/Hello world", "GET");    // 2, params.msg = "Hello world"
router.find("/test/Hello/world!", "GET");    // 3, params.param1 = "Hello", params.param2 = "world!"
router.find("/test/Hello/1/world!", "GET");    // 4, params.param1 = "Hello", params.param2 = "world!"
router.find("/splat/1/2/3", "GET");    // does not match
router.find("/splat/1/2/test", "GET");    // matches 5
router.find("/splat1/1/2/3", "GET");    // matches 6
router.find("/wildcardparam/1/2/YO!", "GET");    // matches 7, params.param = "Yo"
router.find("/wildcardparam/1/2/test/YO!", "GET");    // matches 8, params.param = "Yo"
router.find("/or/pong", "GET");    // matches 9
router.find("/or/ping", "GET");    // matches 9
router.find("/or/ping", "POST");    // matches 9
router.find("/or/pong/Hello", "GET");    // matches 10, params.param = "Hello"

// "use"
function api(router: Router, base: RouteTree) {
    router.setAt(base, "GET", "/test", function() {
        return true;
    });
    router.setAt(base, "GET", "/msg/:msg", function(param) {
        return param.msg;
    });
}
router.use("/api", api);
router.find("/api/test", "GET");
router.find("/api/msg/hello", "GET");
```
