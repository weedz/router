import Router, { RouteTree } from "..";

export function api(router: Router, base: RouteTree) {
    router.setAt(base, "GET", "/test", function() {
        return true;
    });
    router.setAt(base, "GET", "/msg/:msg", function(param) {
        return param.msg;
    });
}
