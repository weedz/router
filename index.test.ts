import Router, { segmentize_uri } from "./lib/Router";

test("segmentize uri", () => {
    expect(segmentize_uri("1/2/3")).toStrictEqual(["1", "2", "3"]);
    expect(segmentize_uri("/1/2/3/")).toStrictEqual(["1", "2", "3"]);
    expect(segmentize_uri("//1/2/3//")).toStrictEqual(["1", "2", "3"]);
    expect(segmentize_uri("//test/1/2/3//")).toStrictEqual(["test", "1", "2", "3"]);
    expect(segmentize_uri("/1/2?ping=pong")).toStrictEqual(["1", "2"]);
});

// router setup
const router = new Router();

router.any_of(["GET", "POST", "HEAD"], "/test", function() {
    return true;
});
router.addRoute("GET", "/test/1/2/3", function() {
    return true;
});
router.addRoute("GET", "/test/:msg", function(params) {
    return params;
});
router.addRoute("GET", "/test/:param1/:param2", function(params) {
    return params;
});
router.addRoute("GET", "/test/:param1/1/:param2", function(params) {
    return params;
});
router.addRoute("GET", "/splat/*/test", function() {
    return true;
});
router.addRoute("GET", "/splat1/*", function() {
    return true;
});
router.addRoute("GET", "/wildcardparam/*/:param", function(params) {
    return params;
});
// This is invalid because of "/wildcardparam/*/:param", might need to look in to this..
// router.addRoute("GET", "/wildcardparam/*/:param/:param2", function(params) {
//     return params;
// });
router.addRoute("GET", "/wildcardparam/*/test/:param", function(params) {
    return params;
});
router.addRoute("GET", "/wildcardparam2/*/:param/:param2", function(params) {
    return params;
});
router.addRoute("GET", "/or/ping|pong", function() {
    return true;
});
router.addRoute("GET", "/or/ping|pong/:param", function(params) {
    return params;
});

// Middleware
router.use("/middleware", function() {
    return true;
});
router.use("/middleware/false", function() {
    return false;
});
router.addRoute("GET", "/middleware/test", function() {
    return true;
});
router.addRoute("GET", "/middleware/false/test", function() {
    return true;
});


test("exact route", () => {
    expect(router.find("/test", "GET")).toHaveProperty("path", "/test");
    expect(router.find("/test/1/2/3", "GET")).toHaveProperty("path", "/test/1/2/3");
    expect(router.find("/test/1/2", "GET")).toBeFalsy();
});

test("params", () => {
    expect(router.find("/test/Hello", "GET")).toHaveProperty("params", { msg: "Hello" });
    expect(router.find("/test/Hello/world", "GET")).toHaveProperty("params", { param1: "Hello", param2: "world" });
    expect(router.find("/test/Hello/1/world", "GET")).toHaveProperty("params", { param1: "Hello", param2: "world" });
});

test("alternation", () => {
    expect(router.find("/or/ping", "GET")).toHaveProperty("path", "/or/ping|pong");
    expect(router.find("/or/pong", "GET")).toHaveProperty("path", "/or/ping|pong");
    expect(router.find("/or/po", "GET")).toBeFalsy();

    expect(router.find("/or/pong/Hello world", "GET")).toHaveProperty("params", { param: "Hello world" });
    expect(router.find("/or/ping/Hello world", "GET")).toHaveProperty("params", { param: "Hello world" });
});

test("splat", () => {
    expect(router.find("/splat/1/2/test", "GET")).toHaveProperty("path", "/splat/*/test");
    expect(router.find("/splat/1/2/3", "GET")).toBeFalsy();
    expect(router.find("/splat1/1/2/3", "GET")).toHaveProperty("path", "/splat1/*");
    expect(router.find("/wildcardparam/1/2/hello", "GET")).toHaveProperty("params", { param: "hello" });
    // expect(router.find("/wildcardparam/1/2/hello/world", "GET")).toHaveProperty("params", { param: "hello", param2: "world" });
    expect(router.find("/wildcardparam2/1/2/hello/world", "GET")).toHaveProperty("params", { param: "hello", param2: "world" });
    expect(router.find("/wildcardparam/1/2/test/hello", "GET")).toHaveProperty("params", { param: "hello" });
})

test("methods", () => {
    expect(router.find("/test", "GET")).toBeTruthy();
    expect(router.find("/test", "POST")).toBeTruthy();
    expect(router.find("/test", "HEAD")).toBeTruthy();
    expect(router.find("/test", "PATCH")).toBeFalsy();
});

// middleware is WIP...
test("middleware", () => {
    expect(router.find("/middleware/test", "GET")).toBeTruthy();
    expect(router.find("/middleware/false/1", "GET")).toBeFalsy();
});

test("duplicate route", () => {
    expect(() => {
        router.addRoute("GET", "/test/duplicate", () => {});
        router.addRoute("GET", "/test/duplicate", () => {});
    }).toThrowError("Duplicate route");

    expect(() => {
        router.addRoute("GET", "/test/dup2/:param1", () => {});
        router.addRoute("GET", "/test/dup2/:param2", () => {});
    }).toThrowError("Duplicate route");
})
