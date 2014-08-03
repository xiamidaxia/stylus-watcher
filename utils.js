var path = require('path')
    ,fs = require('fs')
    ,exec = require('child_process').exec

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
            if(ignorePath) {
                for(var i= 0,len=ignorePath.length; i<len; i++) {
                    if(ignorePath[i].test(item)) {
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
        console.log("utils-ls err: " + err)
    }
}
/**
 * @param {String}
 * @param {Function} ({Array} pidArr进程id数组)
 */
function getPid (processName, cb) {
    //var _exc = spawn("ps",["-ef | grep '"+ processName+"' | grep -v grep | awk '{print $2}'"])
    //var _cmd = ""
    processName = processName.split("|")[0].trim() //去除管道后边的子进程
    //console.log(processName)
    var _exc = exec("ps -ef | grep '"+processName+"' | grep -v grep | awk '{print $2}'")
    var _data
    _exc.stdout.on('data', function(data){
        _data = data.toString().trim().split('\n')
        _data = _data.filter(function(item){
            if (Number(item) === process.pid){
                return false
            } else{
                return true
            }
        })
        cb(_data)
    })
    _exc.stderr.on('data', function(data){
        console.log('utils.getPid err: ', data)
    })
    _exc.on('close', function(code){
        //console.log('未找到程序：' + processName + "的pid")
        if (!_data) cb([])
        //console.log('getPid close: ' + code)
    })
}

/**
 * 字符串补齐
 * @param  {String} str    需要补齐的字符串
 * @param  {Number} minLen 目标字符串长度
 * @param  {String} char   补齐用的字符
 * @return {String}
 */
function padStr(str, minLen, char){
    char = char || ' ';
    return (Array(minLen).join(char) + str.toString())
        .slice(-minLen);
}

function log (msg, color) {
    //_getTimeString()
    console.log(_color(_getTimeString()) +" | " + _color(msg, color || "green"))
}

function _getTimeString () {
    return ((new Date).toLocaleTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/,'$1'))
}

function _color (msg, color, isBg) {
    //字体色30 (黑色)、31 (红色)、32 (绿色)、33 (黄色)、34 (蓝色)、35 (紫红色)、36 (青色)和37 (白色)
    //背景色40、41、42、43、44、45、46、47
    //0、1、22、4、24、5、25、7、27，分别定义颜色、黑体、非黑体、下画线、非下画线、闪烁、非闪烁、翻转、非翻转
    var colors = { "black": 30, "red": 31, "green": 32, "yellow": 33, "blue": 34, "purple":35, "cyan":36, "white":37}
    var _color = colors[color] || colors['cyan']
    if (isBg) _color += 10 //背景颜色加10
    return '\033['+_color+'m' + msg + '\033[0m'
}

exports.ls = ls
exports.log = log
exports.padStr = padStr
exports.getPid = getPid
