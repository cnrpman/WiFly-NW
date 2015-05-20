exports.getLocalStorage = function (key) {
  if (typeof key === 'string') {
    return window.localStorage.getItem(key)
  } else if (key instanceof Array) {
    var result = []
    for (var i in key) {
      result.push(window.localStorage.getItem(key[i]))
    }
    return result
  }
}

exports.setLocalStorage = function (key, value) {
  if (typeof key === 'string' && typeof value === 'string') {
    window.localStorage.setItem(key, value)
  } else if (key instanceof Array && value instanceof Array && key.length == value.length) {
    for (var i in key) {
      window.localStorage.setItem(key[i], value[i])
    }
  }
}

exports.delLocalStorage = function (key) {
  if (typeof key === 'string') {
    window.localStorage.removeItem(key)
  } else if (key instanceof Array) {
    for (var i in key) {
      window.localStorage.removeItem(key[i])
    }
  }
}

exports.addReceived = function (file) {
  var history = exports.listReceived()
  if (!history) {
    history = []
  }
  history.push(file)
  exports.setLocalStorage('received', JSON.stringify(history))
}

exports.deleteReceived = function (path) {
  var fs = require('fs')
  if (exports.getLocalStorage('del') != 'keep' && fs.existsSync(path)) {
    fs.unlinkSync(path)
  }
  var history = exports.listReceived();
  for (var i in history) {
    if (history[i].path == path) {
      history.splice(i, 1)
      break
    }
  }
  exports.setLocalStorage('received', JSON.stringify(history))
}

exports.listReceived = function () {
  return JSON.parse(exports.getLocalStorage('received'))
}