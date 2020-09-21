type Route<T = Function> = {
    params: string[];
    callback: T
    path: PathLike;
};

export type RouteTree<T = Function> = {
    [key in HTTPMethod]?: Route<T>;
} & {
    paths: {
        [key: string]: RouteTree<T>;
    };
    ":"?: RouteTree<T>;
    "*"?: RouteTree<T>;
    "middleware"?: Function[];
};

type PathLike = string;

type HTTPMethod = "HEAD" | "GET" | "POST" | "PUT" | "DELETE" | "CONNECT" | "OPTIONS" | "TRACE" | "PATCH";

enum RouteType {
    STATIC,
    DYNAMIC,
    SPLAT
};

export class Router<CallbackType = Function> {
    routes: RouteTree<CallbackType>;
    constructor(routes: RouteTree<CallbackType> = {
        paths: {}
    }) {
        this.routes = routes;
    }

    anyOf(methods: HTTPMethod[], uri: PathLike, callback: CallbackType, options?: any) {
        return methods.map(method => this.set(method, uri, callback, options));
    }

    use(uri: PathLike, callback: CallbackType, options?: any) {
        return this.createRoute(this.routes, uri, "middleware", callback, options);
    }

    set(method: HTTPMethod, uri: PathLike, callback: CallbackType, options?: any) {
        return this.createRoute(this.routes, uri, method, callback, options);
    }

    setAt(base: RouteTree<CallbackType>, method: HTTPMethod, uri: PathLike, callback: CallbackType, options?: any) {
        return this.createRoute(base, uri, method, callback, options);
    }

    private createRoute(routeTree: RouteTree<CallbackType>, uri: PathLike, method: HTTPMethod | "middleware", callback: CallbackType, options?: any): Route<CallbackType> {
        const params = [];
        let is_splat = 0;

        for (let path of segmentize_uri(uri)) {
            let type = RouteType.STATIC;
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
                type = RouteType.DYNAMIC;
            } else if (path[0] === "*") {
                is_splat = 1;
                type = RouteType.SPLAT;
            } else {
                is_splat = 0;
            }

            let newRoute: RouteTree<CallbackType>;
            switch(type) {
                case RouteType.STATIC:
                    newRoute = routeTree.paths[path];
                    break;
                case RouteType.DYNAMIC:
                    if (!routeTree[":"]) {
                        routeTree[":"] = {paths: {}};
                    }
                    newRoute = routeTree[":"];
                    break;
                case RouteType.SPLAT:
                    if (!routeTree["*"]) {
                        routeTree["*"] = {paths: {}};
                    }
                    newRoute = routeTree["*"];
                    break;
            }
            // Handle alternating paths. (eg. "/test1|test2" matches the same route)
            // TODO: The order in which we declare routes is important when using alternating paths, need to fix this. Maybe a deep merge?
            if (type === RouteType.STATIC) {
                for (const orPath of path.split("|")) {
                    if (!routeTree.paths[orPath]) {
                        if (!newRoute) {
                            newRoute = {paths: {}};
                        }
                        routeTree.paths[orPath] = newRoute;
                    } else {
                        newRoute = routeTree.paths[orPath];
                    }
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
            if (typeof callback === "function") {
                const result = callback(this, routeTree, route);
                if (typeof result === "function") {
                    if (routeTree[method] === undefined) {
                        // We can have multiple middewares for the same route
                        routeTree[method] = [];
                    }
                    // TODO: TypeScript can't infer that routeTree[method] is not undefined here so we are forcing this to work...
                    routeTree[method]!.push(result);
                }
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
                if (routeTree.paths[path]) {
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
                if (routeTree.paths[path]) {
                    splatRoute = false;
                    routeTree = routeTree.paths[path];
                    splatParams = [];
                } else if (routeTree[":"] && routeTree[":"].paths[path]) {
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

            // TODO: FIX THIS
            if (routeTree["middleware"]) {
                let result = null;
                for (const middleware of routeTree["middleware"]) {
                    // TODO: improve middleware support and handling...
                    result = middleware(uri, result);
                    // result = middleware.callback(mapParams(middleware.params, params), result);
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

            const paramLength = route[method]!.params.length - params.length;

            if (paramLength) {
                params.push(...splatParams.slice(splatParams.length - paramLength));
            }
            routeTree = route;
        }

        const route = routeTree[method]

        if (route) {
            return {
                callback: route.callback,
                path: route.path,
                params: mapParams(route.params, params) || {},
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
export function mapParams(keys: (string|number)[], values: any[]) {
    const params: any = {};
    for (let i = 0; i < keys.length; i++) {
        params[keys[i]] = values[i];
    }
    return params;
}
