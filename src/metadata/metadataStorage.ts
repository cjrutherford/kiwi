import { IAuthorize, IAction, IRouter, IActionExecutor, IParam, IMiddleware } from './types/metadata.types';
import { forEach, isNil, find, filter, drop, findIndex, orderBy, replace, split } from 'lodash';
import { Metadata } from './metadata';
import { IKiwiOptions } from '../types/types';

export class MetadataStorage {
    public static get actions(): IAction[] {
        if (!(global as any).metadata)
            (global as any).metadata = new Metadata();
        return (global as any).metadata.actions;
    };

    public static get options(): IKiwiOptions {
        if (!(global as any).metadata)
            (global as any).options = new Metadata();
        return (global as any).metadata.options;
    };

    public static set options(value: IKiwiOptions){
        if (!(global as any).metadata)
            (global as any).metadata = new Metadata();
            (global as any).metadata.options = value;
    }

    public static get controllers(): any[] {
        if (!(global as any).metadata)
            (global as any).metadata = new Metadata();
        return (global as any).metadata.controllers;
    };

    public static get params(): any[] {
        if (!(global as any).metadata)
            (global as any).metadata = new Metadata();
        return (global as any).metadata.params;
    };

    public static get middlewaresBefore(): IMiddleware[] {
        if (!(global as any).metadata)
            (global as any).metadata = new Metadata();
        return (global as any).metadata.middlewaresBefore;
    };

    public static get middlewaresAfter(): IMiddleware[] {
        if (!(global as any).metadata)
            (global as any).metadata = new Metadata();
        return (global as any).metadata.middlewaresAfter;
    };

    public static get interceptors(): any[] {
        if (!(global as any).metadata)
            (global as any).metadata = new Metadata();
        return (global as any).metadata.interceptors;
    };

    public static get authorize(): IAuthorize[] {
        if (!(global as any).metadata)
            (global as any).metadata = new Metadata();
        return (global as any).metadata.authorize;
    };

    public static get routes(): IRouter {
        if (!(global as any).metadata)
            (global as any).metadata = new Metadata();
        return (global as any).metadata.routes;
    };

    public static init(internalOptions: IKiwiOptions) {
        if (!(global as any).metadata)
            (global as any).metadata = new Metadata();
        MetadataStorage.options = internalOptions;
        const actions = filter(MetadataStorage.actions, (action) => {
            return findIndex(internalOptions.controllers, (controller: any) => { return controller.name == action.className; }) >= 0;
        });
        forEach(MetadataStorage.actions, (action) => {
            const controller = find(MetadataStorage.controllers, (controller) => {
                return action.className == controller.target.name;
            });
            const path = MetadataStorage.generatePath(controller.path, action.path, internalOptions.prefix)
            if (isNil(MetadataStorage.routes[path])) {
                MetadataStorage.routes[path] = {};
            }

            const authorize = find(MetadataStorage.authorize, (auth) => {
                return (isNil(auth.methodName) && auth.className === controller.target.name) ||
                    (auth.methodName === action.methodName && auth.className === controller.target.name);
            });
            //console.log(`${action.method.toUpperCase()} ${path}`);
            MetadataStorage.routes[path][action.method] = {
                fn: controller.target.prototype[action.methodName],
                executor: controller.target.prototype,
                params: [],
                authorize: !isNil(authorize),
                roles: !isNil(authorize) ? authorize.roles : []
            };
            var params = filter(MetadataStorage.params, (param) => {
                return param.className === action.className && action.methodName === param.methodName;
            });
            MetadataStorage.routes[path][action.method].params = params;

        });
        MetadataStorage.orderMiddlewares(internalOptions);
    }

    public static matchRoute(route: string, httpMethod: string): IActionExecutor {
        let match: IActionExecutor = null;
        httpMethod = httpMethod.toLowerCase();
        const keys = Object.keys(MetadataStorage.routes);
        var foundMatch = false;
        var i = 0;
        while (!foundMatch && i < keys.length) {
            var exp = `^${keys[i].replace(/:[^\s/]+/g, '([\\w-]*)')}$`;
            var routeMatcher = new RegExp(exp);
            if (routeMatcher.test(route)) {
                var urlParamsValues = drop(routeMatcher.exec(route));
                var routeMatcher2 = new RegExp(keys[i].replace(/:[^\s/]+/g, ':([\\w-]*)'));
                var urlParamNames = drop(routeMatcher2.exec(keys[i]));
                match = MetadataStorage.routes[keys[i]][httpMethod];
                if (!isNil(match)) {
                    match.paramValues = this.orderParams(urlParamNames, urlParamsValues, match);
                    foundMatch = true;
                }
            }
            i++;
        }
        return match;
    }

    public static orderMiddlewares(internalOptions: IKiwiOptions) {
        let middlewaresAfter = filter((global as any).metadata.middlewaresAfter, (middleware: IMiddleware) => {
            return findIndex(internalOptions.middlewares, (middlewareOption: any) => { return middlewareOption.name == middleware.target.name; }) >= 0;
        });
        let middlewaresBefore = filter((global as any).metadata.middlewaresBefore, (middleware: IMiddleware) => {
            return findIndex(internalOptions.middlewares, (middlewareOption: any) => { return middlewareOption.name == middleware.target.name; }) >= 0;
        });
        (global as any).metadata.middlewaresAfter = orderBy(middlewaresAfter, ['order'], ['asc']);
        (global as any).metadata.middlewaresBefore = orderBy(middlewaresBefore, ['order'], ['asc']);
    }

    public static async  generateDoc(options?: IKiwiOptions) {
        var fs = require('fs');
        const swagger: any = {
            schemes: ["https", "http"],
            paths: {},
            swagger: "2.0"
        };
        const routes = MetadataStorage.routes;
        forEach(Object.keys(routes), (url: string) => {
            swagger.paths[url] = {};
            forEach(Object.keys(routes[url]), (method) => {
                let path = replace(url, options.prefix, '');
                const tags = split(path, '/');
                swagger.paths[url][method] = {
                    consumes: ["application/json"],
                    produces: ["application/json"],
                    parameters: this.getParameters(routes[url][method].params),
                    tags: [tags[1]]
                }

            })
        });
        const resultFile = fs.writeFileSync(`swagger.json`, JSON.stringify(swagger, null, 4), 'utf8');
    }

    private static generatePath(controller: string, action: any, prefix: string) {
        let path = isNil(prefix) ? `${controller}${action}` : `${prefix}${controller}${action}`;
        path = replace(path, '//', '/');
        return path;
    }

    private static orderParams(paramNames: Array<string>, paramValues: Array<string>, match: IActionExecutor): Array<any> {
        const result: Array<any> = [];
        forEach(match.params, (param: IParam) => {
            const index = findIndex(paramNames, (name) => name === param.name);
            result[param.order] = isNaN(parseInt(paramValues[index])) ? paramValues[index] : parseInt(paramValues[index]);
        });
        return result;
    }

    private static getParameters(params: Array<IParam>) {
        const swParams: Array<any> = [];
        forEach(params, (param) => {
            if (param.type === 'query') {
                swParams.push(
                    {
                        name: param.name,
                        in: "path",
                        required: true,
                        type: "string",
                        description: ''
                    }
                )
            } else if (param.type === 'body') {

            }
        })
        return swParams;
    }
}