var statik      = require('node-static')
var util        = require('util')
var SauceTunnel = require('sauce-tunnel')
var Cloud       = require('mocha-cloud')
var Canvas      = require('term-canvas')
var GridView    = require('mocha-cloud-grid-view')

var port   = process.env.PORT || 8888
var tests  = 'http://localhost:' + port + '/test/'
var server = serve('.') // relative to caller *not* this file

var size   = process.stdout.getWindowSize()
var canvas = new Canvas(size[0], size[1])
var ctx    = canvas.getContext('2d')

var tunnel = new SauceTunnel( env('SAUCE_USERNAME')
                            , env('SAUCE_ACCESS_KEY')
                            , 'tunnel'
                            , true
                            )

process.on('SIGINT', function () {
  console.error('Received SIGINT, exiting...')
  exit(2, ctx, tunnel, server)
})

process.on('uncaughtException', function (err) {
  exit(err, ctx, tunnel, server)
})

console.log('starting sauce-connect...')
tunnel.start(function (status) {
  if (status === false) throw new Error('Failed to start tunnel.')

  var cloud = new Cloud('saddle', env('SAUCE_USERNAME'), env('SAUCE_ACCESS_KEY'))

  // see https://saucelabs.com/platforms
  cloud.browser( 'internet explorer' , '11' , 'Windows 8.1'  )
  cloud.browser( 'firefox'           , '27' , 'Windows 2003' )

  cloud.url(tests)

  var grid = new GridView(cloud, ctx)
  grid.size(canvas.width, canvas.height)
  ctx.hideCursor()

  server.listen(8888, function () {
    cloud.start(function () {
      grid.showFailures()
      setTimeout(function () {
        ctx.showCursor()
        exit(grid.totalFailures(), ctx, tunnel, server)
      }, 100)
    })
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

function exit(err, ctx, tunnel, server) {
  try {
    if (!process.env.CI) ctx.reset()
    if (util.isError(err)) {
      console.error(err.stack)
      err = 99
    }
    console.error('cleaning up...')
    if (server.address()) server.close()
    tunnel.stop(function(){
      process.exit(err)
    })
    setTimeout(function () {
      process.exit(err)
    }, 5000)
  } catch(err) {
    console.error(err.stack)
    process.exit(99)
  }
}

