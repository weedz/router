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

type HTTPMethod = "GET" | "POST" | "PUT" | "DELETE" | "UPDATE";

export default class Router {
    routes: RouteTree;
    constructor() {
        this.routes = {};
    }

    get(uri: PathLike, callback: Function, options?: any) {
        return this.setRoute("GET", uri, callback, options);
    }

    post(uri: PathLike, callback: Function, options?: any) {
        return this.setRoute("POST", uri, callback, options);
    }

    put(uri: PathLike, callback: Function, options?: any) {
        return this.setRoute("PUT", uri, callback, options);
    }

    any_of(uri: PathLike, methods: HTTPMethod[], callback: Function, options?: any) {
        return methods.map(method => this.setRoute(method, uri, callback, options));
    }

    use(uri: PathLike, callback: Function, options?: any) {
        const route = this.createRoute(uri, "middleware", callback)
    }

    private setRoute(method: HTTPMethod, uri: PathLike, callback: Function, options?: any) {
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
            routeTree[method].push(route);
        } else {
            if (routeTree[method]) {
                console.error("Found duplicate routes...", uri, method);
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
                    splat_route.params.push(path);
                }
            } else {
                break;
            }
            if (routeTree["middleware"]) {
                let result = null;
                for (const middleware of routeTree["middleware"]) {
                    result = middleware.callback(mapParams(middleware.params, params), result);
                }
            }
        }

        if (splat_route) {
            routeTree = splat_route;
        }
        
        if (routeTree[":"] && routeTree.params) {
            // This might handle splat segments followed by :param,
            // this is undefined and undocumented, might be dragons...
            const paramLength = routeTree[":"][method].params.length;

            if (paramLength) {
                params.push(routeTree.params.slice(routeTree.params.length - paramLength));
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

export function segmentize_uri(uri: PathLike): string[] {
    const startQuery = uri.indexOf("?");

    if (startQuery > -1) {
        uri = uri.substring(startQuery);
    }

    return uri.replace(/^\/+|\/+$/g, "").split("/");
}

function mapParams(paramNames: any[], paramValues: any[]) {
    return paramNames.reduce( (accumulator, name, index) => {
        accumulator[name] = paramValues[index];
        return accumulator;
    }, {});
}
