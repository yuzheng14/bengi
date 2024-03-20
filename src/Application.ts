import Koa from 'koa'
import Router from '@koa/router'

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
  }

  /**
   * attach @koa/router middleware to the application
   */
  attachRoutes() {
    // unknown reason, the type of Router.Middleware not Koa.Middleware
    this.middleware.push(this.#router.routes() as unknown as Koa.Middleware<StateT, ContextT>)
    this.middleware.push(
      this.#router.allowedMethods() as unknown as Koa.Middleware<StateT, ContextT>,
    )
  }
}
