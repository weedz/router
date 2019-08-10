type Route = {
    params: string[];
    callback: Function;
    path: PathLike;
};

type RouteTree = {
    [key in HTTPMethod]?: Route;
} & {
    paths?: {
        [key: string]: RouteTree;
    };
    ":"?: RouteTree;
    "*"?: RouteTree;
    "middleware"?: Route[];
};

type SplatRouteTree = RouteTree & { params?: string[]};

type PathLike = string;

type HTTPMethod = "HEAD" | "GET" | "POST" | "PUT" | "DELETE" | "CONNECT" | "OPTIONS" | "TRACE" | "PATCH";

export default class Router {
    routes: RouteTree;
    constructor(routes?: RouteTree) {
        this.routes = routes || {};
    }

    any_of(methods: HTTPMethod[], uri: PathLike, callback: Function, options?: any) {
        return methods.map(method => this.addRoute(method, uri, callback, options));
    }

    use(uri: PathLike, callback: Function, options?: any) {
        const route = this.createRoute(uri, "middleware", callback)
    }

    addRoute(method: HTTPMethod, uri: PathLike, callback: Function, options?: any) {
        return this.createRoute(uri, method, callback);
    }

    private createRoute(uri: PathLike, method: HTTPMethod | "middleware", callback: Function): Route {
        let routeTree = this.routes;

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
                path = "*";
            } else {
                is_splat = 0;
                if (!routeTree.paths) {
                    routeTree.paths = {};
                }
                routeTree = routeTree.paths
            }

            let newRoute = routeTree[path];
            // setup alternating paths. (eg. "/test1|test2" matches the same route)
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
            path: uri
        };

        if (method === "middleware") {
            // We can have multiple middewares for the same route
            if (!routeTree[method]) {
                routeTree[method] = [];
            }
            routeTree[method].push(route);
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
        let routeTree: SplatRouteTree = this.routes;

        const params = [];

        let splat_route: SplatRouteTree;

        for (let path of segmentize_uri(uri)) {
            // Handle exact path segment
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
                // Look for a specified path after "splat" segment
                if (routeTree["*"].paths && routeTree["*"].paths[path]) {
                    splat_route = undefined;
                    routeTree = routeTree["*"].paths[path];
                } else {
                    if (!splat_route) {
                        splat_route = routeTree["*"];
                        splat_route.params = [];
                    }
                    // We save all segments after a "splat" segment in the possibility there
                    // is one or more param segments matching our path further down the tree.
                    splat_route.params.push(path);
                }
            } else {
                break;
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

        if (splat_route) {
            routeTree = splat_route;
        }
        
        // This might handle splat segments followed by :param,
        // this is undefined and undocumented, might be dragons...
        if (routeTree[":"] && routeTree.params) {
            const paramLength = routeTree[":"][method].params.length;

            if (paramLength) {
                params.push(...routeTree.params.slice(routeTree.params.length - paramLength));
                routeTree = routeTree[":"];
            }
        }

        if (routeTree[method]) {
            return {
                ...routeTree[method],
                params: mapParams(routeTree[method].params, params)
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

    return uri.replace(/^\/+|\/+$/g, "").split("/");
}

/**
 * Maps the given array of keys to the array of values
 */
function mapParams(keys: any[], values: any[]) {
    return keys.reduce( (accumulator, name, index) => {
        accumulator[name] = values[index];
        return accumulator;
    }, {});
}
