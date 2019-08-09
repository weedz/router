import Router, { segmentize_uri } from "./lib/Router";

const router = new Router();

router.addRoute("GET", "/test", function(params) {
    console.log("Test?");
});
router.addRoute("GET", "/test/:msg", function(params) {
    console.log("Test?", params);
});
router.addRoute("GET", "/splat/*/test", function() {
    console.log("Wildcards?");
});
router.addRoute("GET", "/wildcardparam/*/:param", function(params) {
    console.log("Wildcards and params?", params);
});
router.addRoute("GET", "/wildcardparam/*/test/:param", function(params) {
    console.log("Wildcards and params2?", params);
});
router.addRoute("GET", "/or/ping|pong", function() {
    console.log("Which is it?");
});
router.addRoute("GET", "/or/ping|pong/:param", function(params) {
    console.log("Which is it?", params);
});

// const route = router.find("/test", "GET");    // matches
// const route = router.find("/test/Hello world", "GET");    // params.msg = "Hello world"
// const route = router.find("/splat/123/456", "GET");    // does not match
// const route = router.find("/splat/123/456/test", "GET");    // matches
// const route = router.find("/wildcardparam/123/456/YO!", "GET");    // matches, params.param = "Yo"
// const route = router.find("/wildcardparam/123/456/test/YO!", "GET");    // matches, params.param = "Yo"
// const route = router.find("/or/pong", "GET");    // matches
const route = router.find("/or/pong/Hello", "GET");    // matches, params.param = "Hello"

console.log(route);
if (route) {
    route.callback(route.params);
}
