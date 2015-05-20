exports.start = function () {
  var express = require('express')
    , bodyParser = require('body-parser')
    , route = require('./route')

  var app = express()
  
  // app.use(bodyParser.json())
  // app.use(bodyParser.urlencoded({ extended: false }))
  app.use(express.static(__dirname.substring(0, __dirname.length - 12) + '/public'))

  app.get('/', route.index)
  app.get('/id', route.id)
  app.get('/chat', route.chat)
  app.post('/upload', route.upload)

  app.listen(12580)
}

exports.getHostIp = function () {
  var interfaces = require('os').networkInterfaces()
  for(var dev in interfaces){  
    var face = interfaces[dev]
    for (var i = 0; i < face.length; i++) {  
      var info = face[i]
      if (!info.internal && info.family === 'IPv4' && info.address !== '127.0.0.1') {
        return info.address
      }  
    }  
  }
}

exports.getBaseUrl = function () {
  return 'http://' + exports.getHostIp() + ':12580/'
}