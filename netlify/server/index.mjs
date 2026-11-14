import express from 'express'
import libraryRouter from '../../routes/gamelibrary.js'
import logger from '../../middleware/logger.js'

const app = express()
app.use(express.json())
app.use(logger)
app.use('/gamelibrary', libraryRouter)
// copy over the 404 and error handlers from app.js

export const config = { path: ['/gamelibrary', '/gamelibrary/*'] }

export default app