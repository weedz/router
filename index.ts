type RouteCallback = Function | any;

type Route = {
    params: string[];
    callback: RouteCallback
    path: PathLike;
};

export type RouteTree = {
    [key in HTTPMethod]?: Route;
} & {
    paths?: {
        [key: string]: RouteTree;
    };
    ":"?: RouteTree;
    "*"?: RouteTree;
    "middleware"?: Route[];
};

type PathLike = string;

type HTTPMethod = "HEAD" | "GET" | "POST" | "PUT" | "DELETE" | "CONNECT" | "OPTIONS" | "TRACE" | "PATCH";

export default class Router {
    routes: RouteTree;
    constructor(routes: RouteTree = {}) {
        this.routes = routes;
    }

    anyOf(methods: HTTPMethod[], uri: PathLike, callback: RouteCallback, options?: any) {
        return methods.map(method => this.set(method, uri, callback, options));
    }

    use(uri: PathLike, callback: RouteCallback, options?: any) {
        return this.createRoute(this.routes, uri, "middleware", callback, options);
    }

    set(method: HTTPMethod, uri: PathLike, callback: RouteCallback, options?: any) {
        return this.createRoute(this.routes, uri, method, callback, options);
    }

    setAt(base: RouteTree, method: HTTPMethod, uri: PathLike, callback: RouteCallback, options?: any) {
        return this.createRoute(base, uri, method, callback, options);
    }

    private createRoute(routeTree: RouteTree, uri: PathLike, method: HTTPMethod | "middleware", callback: RouteCallback, options?: any): Route {
        const params = [];
        let is_splat = 0;

        for (let path of segmentize_uri(uri)) {
            if (path[0] === ":") {
                params.push(path.substring(1));
                if (is_splat) {
                    // if we encountered a splat segment followed by params we need to handle all the
                    // params until the next "exact" segment, therefore we continue to the next segment
                    if (is_splat > 1) {
                        continue;
                    }
                    is_splat++;
                }
                path = ":";
            } else if (path === "*") {
                is_splat = 1;
            } else {
                is_splat = 0;
                if (!routeTree.paths) {
                    routeTree.paths = {};
                }
                routeTree = routeTree.paths;
            }

            let newRoute = routeTree[path];
            // setup alternating paths. (eg. "/test1|test2" matches the same route)
            // The order in which we declare routes is important when using alternating paths, need to fix this. Maybe a deep merge?
            for (const orPath of path.split("|")) {
                if (!routeTree[orPath]) {
                    if (!newRoute) {
                        newRoute = {};
                    }
                    routeTree[orPath] = newRoute;
                } else {
                    newRoute = routeTree[orPath];
                }
            }
            routeTree = newRoute;
        }

        const route = {
            params,
            callback,
            path: uri,
            options
        };

        if (method === "middleware") {
            // We can have multiple middewares for the same route
            if (!routeTree[method]) {
                routeTree[method] = [];
            }
            if (typeof callback === "function") {
                const result = callback(this, routeTree, route);
                if (typeof result === "function") {
                    routeTree[method].push(route);
                }
            } else {
                // routeTree[method].push(route);
            }
        } else {
            if (routeTree[method]) {
                throw Error("Duplicate route");
            } else {
                routeTree[method] = route;
            }
        }

        return route;
    }

    find(uri: PathLike, method: HTTPMethod) {
        let routeTree = this.routes;

        const params = <string[]>[];

        let match = true;
        let splatRoute = false;
        let splatParams = <string[]>[];

        for (let path of segmentize_uri(uri)) {
            // Handle exact path segment
            if (!splatRoute) {
                if (routeTree.paths && routeTree.paths[path]) {
                    routeTree = routeTree.paths[path];
                }
                // Handle "param" segments
                else if (routeTree[":"]) {
                    params.push(path);
                    routeTree = routeTree[":"];
                }
                //Handle "splat" segments
                else if (routeTree["*"]) {
                    routeTree = routeTree["*"];
                    splatRoute = true;
                } else {
                    match = false;
                    break;
                }
            }

            if (splatRoute) {
                // Look for a specified path after "splat" segment
                if (routeTree.paths && routeTree.paths[path]) {
                    splatRoute = false;
                    routeTree = routeTree.paths[path];
                    splatParams = [];
                } else if (routeTree[":"] && routeTree[":"].paths && routeTree[":"].paths[path]) {
                    routeTree = routeTree[":"].paths[path];
                    splatRoute = false;
                } else {
                    // We save all segments after a "splat" segment in the possibility there
                    // is one or more param segments matching our path further down the tree.
                    if (routeTree[":"]) {
                        splatParams.push(path);
                    }
                }
            }

            if (routeTree["middleware"]) {
                let result = null;
                for (const middleware of routeTree["middleware"]) {
                    // TODO: improve middleware support and handling...
                    result = middleware.callback(mapParams(middleware.params, params), result);
                    if (!result) {
                        return false;
                    }
                }
            }
        }


        // This might handle splat segments followed by :param,
        // this is undefined and undocumented, might be dragons...
        if (splatParams.length) {
            let route = routeTree[":"] || routeTree;

            const paramLength = route[method].params.length - params.length;

            if (paramLength) {
                params.push(...splatParams.slice(splatParams.length - paramLength));
            }
            routeTree = route;
        }

        if (routeTree[method]) {
            return {
                ...routeTree[method],
                params: mapParams(routeTree[method].params, params),
                splat: splatParams,
                match
            };
        }

        return false;
    }
}

/**
 * Removes the query string portion and splits the given uri into segments,
 * removing "/" from the beginning and end.
 */
export function segmentize_uri(uri: PathLike): string[] {
    const startQuery = uri.indexOf("?");

    if (startQuery > -1) {
        uri = uri.substring(0, startQuery);
    }

    // return uri.replace(/^\/+|\/+$/g, "").split("/");
    return uri.replace(/^\/+/g, "").replace(/\/+$/g, "").split("/");
}

/**
 * Maps the given array of keys to the array of values
 */
function mapParams(keys: (string|number)[], values: any[]) {
    return keys.reduce( (accumulator, name, index) => {
        accumulator[name] = values[index];
        return accumulator;
    }, {});
}
