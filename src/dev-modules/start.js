/// <reference path="./declare.ts" />

/**
 * REGISTERED MODULES
 * @type {{
 *  [id: string]: HotState
 * }}
 */
const REGISTERED_MODULES = {}

/**
 * Reload window
 * @returns {never}
 */
const reload = () => {
  console.debug('[noraneko] reload..')
  // @ts-ignore
  location.reload()
  throw 'Reloaded'
}

const ws = new WebSocket('ws://localhost:8080')

const opened = new Promise(resolve => {
  ws.onopen = async () => {
    console.debug('[noraneko] connected')
  
    resolve(null)
  }
})

ws.addEventListener('message', async ev => {
  /**
   * @type {import("./types").HotMessage}
   */
  // @ts-ignore
  const data = JSON.parse(ev.data)

  const url = new URL(data.distUrl)

  const hotState = REGISTERED_MODULES[url.pathname]

  if (!hotState) {
    reload()
  }
  if (hotState.isDeclined) {
    reload()
  }

  const acceptCallbacks = hotState.acceptCallbacks

  const urlToImport = new URL(url.href)
  urlToImport.searchParams.set('t', Date.now().toString())
  const mod = await import(urlToImport.href)

  for (const acceptCallback of acceptCallbacks) {
    acceptCallback(mod)
  }
})


/**
 * @implements {ESMHot}
 * 
 * @method 
 */
class HotState {
  /**
   * @param {URL} fullUrl
   */
  constructor (fullUrl) {
    this.data = {}

    /**
     * @type {((module?: unknown) => void)[]}
     */
    this.acceptCallbacks = []

    /**
     * @type {boolean}
     */
    this.isDeclined = false

    /**
     * @type {boolean}
     */
    this.isLocked = false
  }

  lock () {
    this.isLocked = true
    this.acceptCallbacks = []
  }

  /**
   * @param {(module?: unknown) => void} cb
   */
  accept(cb) {
    if (!cb || this.isLocked) {
      return
    }
    this.acceptCallbacks.push(cb)
  }

  invalidate () {
    reload()
  }
  decline () {
    this.isDeclined = true
  }
}


/**
 * Create hot context
 * @param {string} fullUrl
 * @returns {ImportMeta['hot']}
 */
export const createHotContext = (fullUrl) => {
  const url = new URL(fullUrl)
  const hot = new HotState(url)

  const oldHot = REGISTERED_MODULES[url.pathname]
  if (oldHot) {
    oldHot.lock()
    hot.data = oldHot.data
  }

  REGISTERED_MODULES[url.pathname] = hot
  return hot
}

/**
 * Start HMR
 * @param {string} path file path to import
 */
export const start = async (path) => {
  await opened
  const module = await import(path)
  if (typeof module.default === 'function') {
    module.default()
  }
}
