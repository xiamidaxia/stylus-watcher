var path = require('path')
    ,fs = require('fs')
    ,ls = require('./utils').ls
    ,_config //配置json
    ,stylus = require('stylus')
    ,nib = require('nib')
    ,spawn = require('child_process').spawn
    ,stylusCache = {} //缓存 stylus文件及对应的import依赖
    ,watchDirCache = [] //所有已经监听的文件夹
//read config file

function renderAllStylus() {
    ls(_config.projectPath, function(relPath){
        if(path.extname(relPath) === '.styl') {
            renderStylus(relPath, _config.configPath)
        }
    },_config.ignores)
}

function renderStylus(aPath) {
    if(path.extname(aPath) === '.styl') {
        var cssFilePath = path.dirname(aPath) + path.sep + path.basename(aPath, '.styl') + ".css"
        var data = fs.readFileSync(aPath)
        //fs.readFile(aPath, function(err, data) {
        //   if(err) return //截断 todo
            stylus(data.toString())
                .set('filename', aPath)
                .include(nib.path)
                //.import('nib')
                .import(_config.configPath)
                .render(function(err, cssStr){
                    if(err) throw err
                    fs.writeFile(cssFilePath, cssStr, function(err){
                        if(err) throw err
                        console.log('compile ' + aPath)
                    })
                })
        //})
    }
}
/**
 * 缓存所有stylus文件路径及其import依赖文件路径
 */
function cacheAllStylus() {
    ls(_config.projectPath, function(relPath){
        cacheStylus(relPath)
    },_config.ignores)
    //console.log(stylusCache)
    ///console.log("success:\tcache all stylus filepath and its importpath !!")
}
/**
 * @param {String} relPath
 */
function cacheStylus(relPath) {
    var importReg = /@import\s*"\s*([^\"]*)\s*"/g
        ,importArr = []
        ,cur
        ,curPath
        ,data
        ,curDir = path.dirname(relPath)  //当前文件目录
        ,configPath = _config.configPath //stylus config文件
    if(path.extname(relPath) !== '.styl') return

    data = fs.readFileSync(relPath)

    while(cur = importReg.exec(data)) {
        curPath = path.resolve(curDir, cur[1]).replace('.styl','')
        if(curPath !== configPath.replace('.styl','')) { //过滤config文件
            importArr.push(curPath)
        }
    }
    stylusCache[relPath.replace('.styl','')] = importArr
}

function getConfig() {
    var config
        ,data
    data = fs.readFileSync("./config.json")
    config = JSON.parse(data.toString().replace(/\s/g, ""))
    config.projectPath = path.normalize(config.projectPath)
    config.configPath = path.normalize(config.configPath)
    return config
}

function fileChangeCb(filePath) {
    cacheAllStylus() //更新cache
    if(path.extname(filePath) === ".styl") {
        renderStylus(filePath) //编译当前文件
        for(var i in stylusCache) {
            stylusCache[i].forEach(function(aImport){
                if(aImport === filePath.replace('.styl','')) {
                    renderStylus(i + ".styl")
                }
            })
        }
    }
}
function watchAllDir() {
    watchDir(_config.projectPath, fileChangeCb)
    ls(_config.projectPath, function(realPath){
        if(fs.statSync(realPath).isDirectory()) {
            watchDir(realPath, fileChangeCb)
        }
    }, _config.ignores)
}
/**
 * 监听目录下变化的文件，不包含子目录
 */
function watchDir(dirPath, cb) {
    console.log('watch dir: \t' + dirPath)
    watchDirCache.push(dirPath)
    fs.watch(dirPath, function(event, filename){
        if(!filename) return
        var filePath = path.join(dirPath, filename)
        fs.stat(filePath, function(err,states) {
            if(err) return //截断
            if(!states.isDirectory()) {
                //console.log(event, filePath)
                cb(filePath)
            }else{
                if(watchDirCache.indexOf(filePath) == -1) { //未被监听
                    watchDir(filePath, cb)
                }
            }
        })
    })
}
/**
 * 监听config文件，config文件改变时候编译所有
 */
function watchConfig() {
    fs.watchFile(_config.configPath, function(){
        console.log('change config styl, ready to compile all stylus ...')
        renderAllStylus()
    })
}
function init() {
    _config = getConfig()
    //renderAllStylus()
    cacheAllStylus()
    watchAllDir()
    watchConfig()
    //watchDir(_config.projectPath)
    return //todo
}
init()
