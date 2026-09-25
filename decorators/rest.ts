import express, { Express, Request, Response } from 'express';
import type { Server } from 'http';

let appInstance: Express | null = null;
let serverInstance: any = null;

export function getRestApp(): Express {
  if (!appInstance) {
    appInstance = express();
    appInstance.use(express.json());
  }
  return appInstance;
}

export function startRestServer(port: number = 3000): Promise<any> {
  const app = getRestApp();
  return new Promise((resolve) => {
    serverInstance = app.listen(port, () => {
      console.log(`Rest server listening on port ${port}`);
      resolve(serverInstance);
    });
  });
}

export function stopRestServer(): Promise<void> {
  return new Promise((resolve) => {
    if (serverInstance) {
      serverInstance.close(() => {
        serverInstance = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

export interface RestRouteOptions {
  path?: string;
  method?: 'get' | 'post' | 'put' | 'delete';
}

/**
 * Exposes a method as an HTTP REST endpoint.
 *
 * Infers HTTP method and path from method name:
 * - getX(...) -> GET /api/x
 * - addX(...) / updateX(...) -> POST /api/x
 * - deleteX(...) / removeX(...) -> DELETE /api/x
 *
 * @example
 * class UserService {
 *   @Rest
 *   getUser(id: string) { ... }
 * }
 */
export function Rest(
  targetOrOptions?: any,
  propertyKey?: string,
  descriptor?: PropertyDescriptor
): any {
  // Support both @Rest and @Rest({ path: '/custom', method: 'post' })
  if (propertyKey !== undefined && descriptor !== undefined) {
    return applyRestRoute(targetOrOptions, propertyKey, descriptor);
  }

  const options: RestRouteOptions = targetOrOptions ?? {};
  return function (target: any, propKey: string, desc: PropertyDescriptor) {
    return applyRestRoute(target, propKey, desc, options);
  };
}

function applyRestRoute(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor,
  options?: RestRouteOptions
) {
  const originalMethod = descriptor.value;
  const methodName = propertyKey;
  const app = getRestApp();

  let httpMethod: 'get' | 'post' | 'put' | 'delete' = options?.method ?? 'get';
  let route = options?.path ?? `/api/${methodName}`;

  if (!options?.method && !options?.path) {
    if (methodName.startsWith('add') || methodName.startsWith('update')) {
      httpMethod = 'post';
      route = `/api/${methodName.replace(/^(add|update)/, '').toLowerCase()}`;
    } else if (methodName.startsWith('delete') || methodName.startsWith('remove')) {
      httpMethod = 'delete';
      route = `/api/${methodName.replace(/^(delete|remove)/, '').toLowerCase()}`;
    } else if (methodName.startsWith('get')) {
      httpMethod = 'get';
      route = `/api/${methodName.replace(/^get/, '').toLowerCase()}`;
    }
  }

  app[httpMethod](route, async (req: Request, res: Response) => {
    try {
      let args: any[];
      if (httpMethod === 'get') {
        args = Object.values(req.query);
      } else {
        args = req.body ? (Array.isArray(req.body) ? req.body : Object.values(req.body)) : [];
      }
      const result = await originalMethod.apply(target, args);
      res.json(result);
    } catch (error: any) {
      res.status(500).send(error?.message ?? 'Internal Server Error');
    }
  });

  return descriptor;
}
