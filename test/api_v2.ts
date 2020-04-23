import { Router, RouteTree } from "../src";

export function api_v2(router: Router, base: RouteTree) {
    router.setAt(base, "GET", "/test", function() {
        return true;
    });
    router.setAt(base, "GET", "/msg/:msg", function(param: any) {
        return param.msg;
    });
    return function(uri: string, msg: string) {
        return uri.includes("Hello");
    }
}
