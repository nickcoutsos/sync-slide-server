const express = require('express')
const expressWs = require('express-ws')
const expressJwt = require('express-jwt')
const cors = require('cors')

const app = express()
const subscribersByTopic = {}

function registerSubscriber (topic, ws) {
  if (!subscribersByTopic[topic]) {
    subscribersByTopic[topic] = []
  }

  subscribersByTopic[topic].push(ws)
}

expressWs(app)

app.use(cors())

app.post('/topics/:topic', expressJwt({
  secret: process.env.JWT_SECRET
}), (req, res) => {
  const { topic } = req.params
  const subscribers = subscribersByTopic[topic] || []

  if (!subscribers.length) {
    console.info('no subscribers for published topic', topic)
    return res.sendStatus(200)
  }

  const buf = []
  req.on('data', buf.push.bind(buf))
  req.on('end', () => {
    const body = buf.join('')
    for (let i = 0; i < subscribers.length; i++) {
      subscribers[i].send(body)
    }
    res.sendStatus(200)
  })
})

app.ws('/topics/:topic', (ws, req) => {
  const { topic } = req.params
  registerSubscriber(topic, ws)

  ws.onclose = () => {
    const index = subscribersByTopic[topic].indexOf(ws)
    subscribersByTopic[topic].splice(index, 1)
  }
})

app.use((err, req, res, next) => {
  console.error(err)
  res.sendStatus(err.status || 500)
})


app.listen(process.env.PORT)
