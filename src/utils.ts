import { stat } from 'node:fs/promises'
import fg from 'fast-glob'
import { HTTP_METHODS } from './const.js'
import Koa, { DefaultContext } from 'koa'

/**
 * validate if the route path has <same-path>.js & <same-path>.ts or  <same-path>.{j,t}s & <same-path>/index.{j,t}s
 * @param routePath - the path of all route
 */
function validateRoutePath(routePath: string[]) {
  /**
   * <same-path>.js & <same-path>.ts
   */
  const duplicatedRoutePath = <string[]>[]
  /**
   * <same-path>/index.{j,t}s & <same-path>.{j,t}s
   */
  const duplicateIndexRoutePath = <string[]>[]
  // validate <same-path>.js & <same-path>.ts
  const paths = [...routePath]
  let path
  while ((path = paths.pop())) {
    if (paths.includes(path)) duplicatedRoutePath.push(path)
  }

  // validate <same-path>/index.{j,t}s & <same-path>.{j,t}s
  paths.push(...routePath.map((p) => p.replace(/\/index$/, '')))
  while ((path = paths.pop())) {
    if (path.endsWith('/index')) {
      if (paths.includes(path.replace(/\/index$/, ''))) duplicateIndexRoutePath.push(path)
    }
  }

  throw Error(
    `Duplicate route path: ${[...new Set(duplicatedRoutePath)].map((p) => p + '.{j,t}s').join(', ')}. Ambiguous route path: ${[...new Set(duplicateIndexRoutePath)].join(', ')}`,
  )
}

export function isHTTPMethod(method: string): method is (typeof HTTP_METHODS)[number] {
  return HTTP_METHODS.includes(method as (typeof HTTP_METHODS)[number])
}

/**
 * get all router functions from $root/app/routes/*.{j,t}s
 */
export async function getAllRoutes(): Promise<
  { type: (typeof HTTP_METHODS)[number]; routeFn: Koa.Middleware }[]
> {
  if (!(await stat('app/routes/')).isDirectory()) throw new Error('app/routes/ is not a directory')
  const files = (
    await fg('**/*.{j,t}s', {
      cwd: 'app/routes/',
    })
  ).map((p) => p.replace(/\.(j|t)s$/, ''))
  validateRoutePath(files)
  return (await Promise.all(files.map((p) => import(`app/routes/${p}`)))).flatMap((m) =>
    Object.entries<NonNullable<unknown>>(m)
      .map(([k, v]) =>
        isHTTPMethod(k) && typeof v === 'function'
          ? {
              type: k,
              routeFn: (ctx: DefaultContext) => {
                // to avoid raise a Error when call next in route middleware,
                // transfer a noop function to next
                ctx.body = v(ctx, () => {}) || ctx.body
              },
            }
          : null,
      )
      .filter((v): v is NonNullable<typeof v> => v !== null),
  )
}
