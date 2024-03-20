import Koa from 'koa'
import Router from '@koa/router'
import { getAllRoutes } from './utils.js'

/**
 * Application class
 */
export class Application<StateT = Koa.DefaultState, ContextT = Koa.DefaultContext> extends Koa<
  StateT,
  ContextT
> {
  #router: Router

  constructor() {
    super()
    this.#router = new Router()
    this.registerRoutes()
    this.attachRoutes()
  }

  /**
   * register all routes from $root/app/routes/**\/*.{j,t}s
   */
  async registerRoutes() {
    ;(await getAllRoutes()).forEach(({ type, routeFn }) => {
      this.#router[type]('/*', routeFn)
    })
  }

  /**
   * attach @koa/router middleware to the application
   */
  attachRoutes() {
    super.use(this.#router.routes())
    super.use(this.#router.allowedMethods())
  }

  /**
   * Use the given middleware `fn`.
   * @param middleware - Koa middleware
   * @returns this
   */
  use<NewStateT = object, NewContextT = object>(
    middleware: Koa.Middleware<StateT & NewStateT, ContextT & NewContextT>,
  ): Koa<StateT & NewStateT, ContextT & NewContextT> {
    // pop @koa/router middleware
    this.middleware.pop()
    this.middleware.pop()
    super.use(middleware)
    this.attachRoutes()
    // now this couldn't be inferred as Koa<StateT & NewStateT, ContextT & NewContextT>,
    // so we need to cast it
    return this as unknown as Koa<StateT & NewStateT, ContextT & NewContextT>
  }
}
