var path = require('path')
    ,fs = require('fs')

/**
 * @param {String} dir
 * @param {Function} ({String} realPath) 回调函数为文件全名
 * @param {Array || Ignore} 要忽略的文件名
 */
function ls(dir, cb, ignorePath){
    try {
        dir = fs.realpathSync(dir)
        fs.readdirSync(dir).forEach(function(item){
            var realpath = path.join(dir, item)
            //??????
            if(ignorePath) {
                for(var i= 0,len=ignorePath.length; i<len; i++) {
                    if(ignorePath[i] === item) { //todo
                        return
                    }
                }
            }
            cb(realpath)
            if(fs.statSync(realpath).isDirectory()) {
                ls(realpath, cb, ignorePath)
            }
        })
    }catch(err) {
        console.log("catch err: " + err)
    }
}

exports.ls = ls
