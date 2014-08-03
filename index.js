var path = require('path')
    ,fs = require('fs')
    ,u = require('./utils')
    ,_config = require('./config')
    ,exec = require('child_process').exec
    ,util = require('util')

var _watchDirCache = []

function killProject(cb) {
    //var projectCmd = _config.exc + " " + _config.exc_params.join(' ').trim()
    u.getPid(_config.exc, function(pids){
        if (pids.length == 0 ) cb && cb()
        else {
            pids.forEach(function(pid){
                try {
                    process.kill(pid, "SIGHUP")
                    u.log("process " + pid + " killed...")
                } catch (err) {
                    console.log("process.kill error: ", err)
                }
            })
            cb && cb()
        }
    })
}

function isIgnorePath(path) {
    var isIgnore = false
    _config.ignores.forEach(function(item){
        if (item.test(path)) isIgnore = true
    })
    return isIgnore
}

function startProject () {
    var isStart = false
    //u.log("process starting...")
    //var _exc = spawn(_config.exc, _config.exc_params, {
    //    "cwd": path.resolve(_config.exc_cwd)
    //})
    var _exc = exec(_config.exc, {
        "cwd": path.resolve(_config.exc_cwd)
    })
    _exc.stdout.on('data', function(data){
        if (!isStart) {
            u.log('process ' + _exc.pid + ' started...')
            console.log('=====================================================')
        }
        console.log(data.toString())
        isStart = true
    })
    _exc.stderr.on('data', function(data){
        //u.log('start process ' + _config.exc +' err: ' + data, 'red')
        u.log(data,'red')
    })
/*    _exc.on('close', function(code){
        u.log('process close: ' + code)
    })*/
}

function _fileChangeCb(filePath) {
    if (!isIgnorePath(filePath)) {
        console.log('=====================================================')
        u.log('file change: ' + filePath, "cyan")
        killProject(function(){startProject()})
    }
}

function _watchAllDir () {
    _watchDir(_config.path, _fileChangeCb)
    u.ls(_config.path, function(realPath){
        if(fs.statSync(realPath).isDirectory()) {
            _watchDir(realPath, _fileChangeCb)
        }
    }, _config.ignores)

}

function _watchDir(dirPath, cb) {
    u.log(dirPath, "blue")
    _watchDirCache.push(dirPath)
    fs.watch(dirPath, function(event, filename){
        if(!filename) return
        var filePath = path.join(dirPath, filename)
        fs.stat(filePath, function(err,states) {
            if(err) return //截断
            if(!states.isDirectory()) {
                //console.log(event, filePath)
                cb(filePath)
            }else{
                if(_watchDirCache.indexOf(filePath) == -1) { //未被监听
                    _watchDir(filePath, cb)
                }
            }
        })
    })

}

function preConfig() {
    _config.ignores = _config.ignores.map(function(item){
        return new RegExp(item)
    })
}

function init () {
    preConfig()
    killProject(function(){startProject()})
    _watchAllDir()
}
init()
