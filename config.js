module.exports = {
	"ignores": [".git",".idea","dest","sea-modules","sumeru","backup", "bin","docs", "node_modules"], //忽略的目录
    //"exts": [js],
	"path": "../xiami",  //要监听的目录
	"exc": "node index | bunyan --color -o short",
	"exc_cwd": "../xiami"
    //"path": "../derby-test",
    //"exc_cwd": "../derby-test",
    //"exc": "node server"
}

