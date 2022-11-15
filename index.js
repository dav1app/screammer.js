import DeferablePromise from 'promise-deferred'
import debug from 'debug'
import Fuse from 'fuse.js'

const logger = debug('app:screamer')

let screams = {}

let hearings = {}

const options = {
  includeScore: true
}

let fuse

function findSimilar(id){
  return fuse.search(id).map((item) => item.item)[0]
}

function wait(ms, id) {
   return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${id} failed with timeout. Maybe you meant ${findSimilar(id)}? This were called: ${Object.keys(screams)}`)), ms);
   });
}

function resolver(defered, value, id) {
  const logger = debug(`app:screamer:${id}`)
  logger('resolving', id, 'with value type', typeof value)
  defered.resolve(value)
}

export function clear() {
  screams = {}
  hearings = {}
}

export function clearOnly(key) {
  delete screams[key]
  delete hearings[key]
}

export function scream(id, value) {
  const logger = debug(`app:screamer:${id}`)
  const currentHear = hearings[id]
  screams[id] = value

  const updatedScreams = Object.keys(screams)
  fuse = new Fuse(updatedScreams, options)
  logger('screams', updatedScreams)
  logger('is there any hearings?', Object.keys(hearings))
  if (currentHear?.length) {
    currentHear.map((hearing) => {
      logger('resolving hearing', id)
      resolver(hearing, value, id)
    })
  } else {
    logger('no hearing found')
  }
}

export async function hear(id) {
  const logger = debug(`app:screamer:${id}`)
  logger('add hear', id)
  const newPromise = new DeferablePromise()
  let currentHear = hearings[id]
  const currentScream = screams[id]

  if (currentHear?.length) {
    hearings[id].push(newPromise)
  } else {
    hearings[id] = [newPromise]
  }

  //reset currentHear since it might lose its reference
  currentHear = hearings[id]

  logger('is there any screams', !!currentScream)

  if (currentScream || currentScream === 0) {
    currentHear.map((hearing) => {
      logger('resolving hearing', id)
      resolver(hearing, currentScream, id)
    })
  } else {
    logger('no scream found yet')
  }

  return Promise.race([wait(60000, id), newPromise.promise])
}
