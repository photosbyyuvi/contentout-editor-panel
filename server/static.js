// Tiny static server for the built SPA (used by the Railway web service).
import express from 'express'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const dist = join(here, '..', 'dist')

const app = express()
app.disable('x-powered-by')
app.use(express.static(dist))
// SPA fallback — every non-asset route returns index.html
app.use((_req, res) => res.sendFile(join(dist, 'index.html')))

const PORT = Number(process.env.PORT || 8080)
app.listen(PORT, () => console.log(`Contentout web on http://localhost:${PORT}`))
