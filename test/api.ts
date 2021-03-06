import { Router, RouteTree } from "../src";

export function api(router: Router, base: RouteTree) {
    router.setAt(base, "GET", "/test", function() {
        return true;
    });
    router.setAt(base, "GET", "/msg/:msg", function(param: any) {
        return param.msg;
    });
}
