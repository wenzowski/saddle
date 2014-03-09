var statik      = require('node-static')
var Cloud       = require('mocha-cloud')
var SauceTunnel = require('sauce-tunnel')

var server = serve('.') // relative to caller *not* this file

var tunnel = new SauceTunnel( env('SAUCE_USERNAME')
                            , env('SAUCE_ACCESS_KEY')
                            , 'tunnel'
                            , true
                            )

tunnel.start(function (status) {
  if (status === false) throw new Error('Failed to start tunnel.')

  var cloud = new Cloud('saddle', env('SAUCE_USERNAME'), env('SAUCE_ACCESS_KEY'))

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

  cloud.on('end', function(browser, res){
    console.log('  end : %s %s : %d failures', browser.browserName, browser.version, res.failures)

    tunnel.stop(function(){
      process.exit(res.failures)
    })
  })

  server.listen(8888, function () {
    cloud.start()
  })
})

function env(v) {
  var val = process.env[v]
  if (!val) throw new Error('$' + v + ' not set')
  return val
}

function serve(dir, opts) {
  var files = new(statik.Server)(dir, opts)
  return require('http').createServer(function (request, response) {
    request.addListener('end', function () {
      files.serve(request, response)
    }).resume()
  })
}

