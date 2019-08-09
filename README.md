# Router

Examples:

```javascript
import Router from "./lib/Router";
const router = new Router();

router.get("/test", ...); // 1
router.get("/test/:msg", ...); // 2
router.get("/test/:param1/:param2", ...); // 3
router.get("/test/:param1/1/:param2", ...); // 4
router.get("/splat/*/test", ...); // 5
router.get("/splat1/*", ...); // 6
router.get("/wildcardparam/*/:param", ...); // 7
router.get("/wildcardparam/*/test/:param", ...); // 8
router.get("/or/ping|pong", ...); // 9
router.get("/or/ping|pong/:param", ...); // 10

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
router.find("/or/pong/Hello", "GET");    // matches 10, params.param = "Hello"
```
