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

router.get("/test", function() {
    return true;
});
router.get("/test/1/2/3", function() {
    return true;
});
router.get("/test/:msg", function(params) {
    return params;
});
router.get("/test/:param1/:param2", function(params) {
    return params;
});
router.get("/test/:param1/1/:param2", function(params) {
    return params;
});
router.get("/splat/*/test", function() {
    return true;
});
router.get("/splat1/*", function() {
    return true;
});
router.get("/wildcardparam/*/:param", function(params) {
    return params;
});
// This is invalid because of "/wildcardparam/*/:param", might need to look in to this..
// router.get("/wildcardparam/*/:param/:param2", function(params) {
//     return params;
// });
router.get("/wildcardparam/*/test/:param", function(params) {
    return params;
});
router.get("/wildcardparam2/*/:param/:param2", function(params) {
    return params;
});
router.get("/or/ping|pong", function() {
    return true;
});
router.get("/or/ping|pong/:param", function(params) {
    return params;
});


test("exact route", () => {
    expect(router.find("/test", "GET")).toBeTruthy();
    expect(router.find("/test/1/2/3", "GET")).toBeTruthy();
    expect(router.find("/test/1/2", "GET")).toBeFalsy();
});

test("params", () => {
    expect(router.find("/test/Hello", "GET")).toHaveProperty("params", { msg: "Hello" });
    expect(router.find("/test/Hello/world", "GET")).toHaveProperty("params", { param1: "Hello", param2: "world" });
    expect(router.find("/test/Hello/1/world", "GET")).toHaveProperty("params", { param1: "Hello", param2: "world" });
});

test("alternation", () => {
    expect(router.find("/or/ping", "GET")).toBeTruthy();
    expect(router.find("/or/pong", "GET")).toBeTruthy();
    expect(router.find("/or/po", "GET")).toBeFalsy();

    expect(router.find("/or/pong/Hello world", "GET")).toHaveProperty("params", { param: "Hello world" });
    expect(router.find("/or/ping/Hello world", "GET")).toHaveProperty("params", { param: "Hello world" });
});

test("splat", () => {
    expect(router.find("/splat/1/2/test", "GET")).toBeTruthy();
    expect(router.find("/splat/1/2/3", "GET")).toBeFalsy();
    expect(router.find("/splat1/1/2/3", "GET")).toBeTruthy();
    expect(router.find("/wildcardparam/1/2/hello", "GET")).toHaveProperty("params", { param: "hello" });
    // expect(router.find("/wildcardparam/1/2/hello/world", "GET")).toHaveProperty("params", { param: "hello", param2: "world" });
    expect(router.find("/wildcardparam2/1/2/hello/world", "GET")).toHaveProperty("params", { param: "hello", param2: "world" });
    expect(router.find("/wildcardparam/1/2/test/hello", "GET")).toHaveProperty("params", { param: "hello" });
})
