var path = require('path'),
    fs = require('fs'),
    stylus = require('stylus');

var gConfig,
    gNeedRenders = [],  // 待渲染文件队列
    gRendingNum = 0,    // 正在渲染的文件数
    gRenderTimer,       // 渲染进程定时器
    gFileCache = {},    // 文件信息缓存（import）
    gWatchCache = [];   // 目录监听缓存（）

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

var D = {
    /**
     * 格式化控制台输出
     * [时间][待渲染文件数/渲染中的文件数]type: msg
     * @param  {String} typeChar
     * @param  {String} msg
     */
    log: function (typeChar, msg){
        console.log(
            '\033[34m' + ((new Date).toLocaleTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/,'$1')) + '\33[0m' +
            '|' +
            '\033[32m' + padStr(gNeedRenders.length, 2, '0') + '/' +
            padStr(gRendingNum, 1, '0') + '\33[0m|' +
            '\033[31m' + (typeChar||' ') + '\33[0m| ' +
            (msg||''));
    }
}

/**
 * 渲染 stylus 文件
 * @param  {String} stylus 文件路径
 */
function renderStylus(filePath){
    var cssFile = filePath.replace(/\.styl$/, '.css'),
        process,
        data;

    D.log('+', filePath);

    data = fs.readFileSync(filePath);

    process = stylus(data.toString())
        .set('filename', filePath)
        .set('paths', gConfig.paths);

    gConfig.imports.forEach(function(stylPath){
        process.import(stylPath);
    });

    process.render(function (err, cssStr){
        if(err){
            D.log('*', cssFile);
            console.log(err.name);
            console.log(err.message);
            return;
        }

        fs.writeFile(cssFile, cssStr, function (err){
            if(err)
                throw err

            D.log('-', cssFile);
        })
    });
}

/**
 * 缓存需要导入的文件
 * @param  {String} filePath
 * @return {Array}
 */
function cacheImports(filePath){
    // D.log('cache', filePath);
    var re = /@import\s+"\s*([^"]+)\s*"/g,
        match,
        data,
        dir = path.dirname(filePath),
        cache,
        imports;

    if(!gFileCache[filePath]){
        gFileCache[filePath] = {};
    }
    cache = gFileCache[filePath];

    if(!gFileCache[filePath].imports){
        gFileCache[filePath].imports = [];
    }
    imports = gFileCache[filePath].imports;

    data = fs.readFileSync(filePath).toString();

    while(match = re.exec(data)){
        imports.push(path.resolve(dir, match[1].replace(/\.styl$/, '') + '.styl'));
    }

    // D.log(imports);

    return imports;
}

/**
 * 获取需要渲染的文件列表
 * @param  {String} fileNeedRender  文件路径
 * @param  {Array} needRenders      需要渲染的文件列表
 */
function getNeedRenders(fileNeedRender, needRenders){
    needRenders = needRenders || [];

    // 已经在渲染列表里的不添加
    if(needRenders.indexOf(fileNeedRender) === -1){
        needRenders.push(fileNeedRender);
    }

    for(var filePath in gFileCache){
        var cache = gFileCache[filePath];

        // 不处理没有导入当前文件的文件
        if(cache.imports.indexOf(fileNeedRender) !== -1){
            getNeedRenders(filePath, needRenders);
        }
    }
}

/**
 * 渲染队列中的文件
 */
function render(){
    if(gNeedRenders.length){
        renderStylus(gNeedRenders.shift());
        gRenderTimer = setTimeout(render, 0);
    }
}

/**
 * Stylus 文件变更处理
 * @param  {String} filePath
 */
function onStylChange(filePath){
    cacheImports(filePath);
    getNeedRenders(filePath, gNeedRenders);
    gRenderTimer && clearTimeout(gRenderTimer);
    gRenderTimer = setTimeout(render, 500);
}

/**
 * 监听目录变化
 * @param  {String} dirPath
 * @param  {Object} actions
 */
function watchDirOfType(dirPath, actions){
    // 不重复监听
    if(gWatchCache.indexOf(dirPath) !== -1){
        return;
    }

    gWatchCache.push(dirPath);
    D.log('w', dirPath);

    fs.watch(dirPath, function (e, filename){
        if(!filename) return;

        var filePath = path.join(dirPath, filename);

        // D.log('change', filePath);
        initOfFile(filePath, actions);
    });
}

/**
 * @param  {String} dirPath
 */
function initOfDir(dirPath, actions){
    // D.log('initdir', dirPath);
    try{
        fs.readdirSync(dirPath).forEach(function (fileName){
            initOfFile(
                path.resolve(dirPath, fileName),
                actions
            );
        });
    }catch(e){
    }
}

/**
 * @param  {String} filePath
 * @param  {Object} actions
 */
function initOfFile(filePath, actions){
    // D.log('initfile', filePath);
    var fileName = path.basename(filePath);
        fileExt = path.extname(filePath);

    if(gConfig.ignores.indexOf(fileName) !== -1){
        return;
    }

    try{
        if(fs.statSync(filePath).isDirectory()){
            // D.log('isdir', filePath);
            watchDirOfType(filePath, actions);
            initOfDir(filePath, actions);
        }else{
            // D.log('isfile', filePath);
            if(actions[fileExt]){
                actions[fileExt](filePath);
            }

        }
    }catch(e){
    }
}

/**
 * 加载配置文件
 * @param {String} path 配置文件路径
 * @return {Object}
 */
function loadConfig(filePath){
    var config,
        paths;

    try{
        config = JSON.parse(
            fs.readFileSync(filePath)
                .toString()
            );
    }catch(e){
        D.log('加载配置文件失败\n\t', filePath);
        config = {};
    }

    config.ignores = config.ignores || ['.git', 'sea-modules', 'node-modules'];
    config.sources = config.sources || [''];

    config.paths = (config.paths || [])
        .map(function (p, i){
            try{
                var t = require(p);

                if(t && t.path){
                    return t.path;
                }
            }catch(e){}

            return path.resolve(p);
        });

    config.imports = (config.imports || [])
        .map(function (p, i){
            return path.resolve(p);
        });

    return config;
}

/**
 * 初始化
 */
function init(){
    gConfig = loadConfig('config2.json');

    gConfig.sources.forEach(function (watchPath){
        initOfFile(
            path.resolve(watchPath),
            {'.styl': onStylChange}
        );
    });

    return;
}

init();
