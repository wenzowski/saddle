var static = require('node-static')
var file = new static.Server()
var server = require('http').createServer(function (request, response) {
  request.addListener('end', function () {
    file.serve(request, response)
  }).resume()
})

var SauceTunnel = require('sauce-tunnel')
var tunnel = new SauceTunnel(process.env.SAUCE_USERNAME, process.env.SAUCE_ACCESS_TOKEN, 'tunnel', true/* ['--debug'] */)

tunnel.start(function(status){
  if (status === false) throw new Error('Something went wrong with the tunnel')

  var Cloud = require('mocha-cloud')
  var cloud = new Cloud('saddle', process.env.SAUCE_USERNAME, process.env.SAUCE_ACCESS_TOKEN)

  // see https://saucelabs.com/platforms
  cloud.browser('internet explorer', '11', 'Windows 8.1')
  // cloud.browser('internet explorer', '10', 'Windows 8')
  // cloud.browser('firefox', '27', 'Linux')
  // cloud.browser('chrome', '32', 'Windows 7')

  cloud.url('http://localhost:8888/test/')

  cloud.on('init', function(browser){
    console.log('  init : %s %s', browser.browserName, browser.version)
  })

  cloud.on('start', function(browser){
    console.log('  start : %s %s', browser.browserName, browser.version)
  })

  server.listen(8888, function () {
    cloud.start()
  })

  cloud.on('end', function(browser, res){
    console.log('  end : %s %s : %d failures', browser.browserName, browser.version, res.failures)

    tunnel.stop(function(){
      process.exit(res.failures)
    })
  })
})

