import express from 'express'

const app = express()
const port = process.env.PORT || 3001

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' })
})

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
})

export default app
