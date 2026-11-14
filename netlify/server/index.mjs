import express from 'express'
import { getStore } from '@netlify/blobs'
import { getContext } from '@netlify/server'
import gamelibrary from '../../data/gamelibrary.js'
import libraryRouter from '../../routes/gamelibrary.js'
import logger from '../../middleware/logger.js'

await gamelibrary.connectBlobs(getStore({ name: 'gamelibrary', consistency: 'strong' }))

const app = express()
app.use(express.json())
app.use(logger)

// Keep the process alive until each request's save has finished
app.use((req, res, next) => {
  getContext().waitUntil(new Promise((done) =>
    res.on('finish', () => gamelibrary.flush().then(done, done))))
  next()
})

app.use('/gamelibrary', libraryRouter)
// copy the 404 and error handlers from app.js

export const config = { path: ['/gamelibrary', '/gamelibrary/*'] }
export default app