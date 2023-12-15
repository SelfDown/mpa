const {defineConfig} = require('@vue/cli-service')
const glob = require("glob")
const fs = require('fs')
const path = require("path")
const resolve = dir => path.join(__dirname, dir)

module.exports = defineConfig({
    transpileDependencies: true,
    publicPath: '/mpa/',
    // webpack 链式配置
    chainWebpack: config => {

        if (process.env.NODE_ENV === 'production') {
            // 清除css，js版本号
            config.output.filename('js/[name].min.js').end();
            config.output.chunkFilename('js/[name].min.js').end();
            // 为生产环境修改配置...
            config.plugin('extract-css').tap(() => [{
                filename: `css/[name].min.css`,
                chunkFilename: `css/[name].min.css`
            }])
        }
        // 移除 prefetch 插件
        config.plugins.delete('prefetch')
        // config.resolve.alias.set('@', resolve('src'))

    },
    pages: getPages()
})

function getPages() {
    const pages = {}
    const pagesJson = require("./src/page.json")
    //将二级路由处理成一级路由
    const sub={}
    for(let key in pagesJson){
        let parent = pagesJson[key]
        if (!parent.children){
            continue
        }
        for(let subKey in parent.children){
            let item =parent.children[subKey]
            sub[key+"/"+subKey]=item
        }
    }
    for(let key in sub){
        pagesJson[key]=sub[key]
    }
    const fileList = glob.sync("./src/pages/**/index.vue")
    for(let i=0;i<fileList.length;i++){// 循环处理扫描文件
        let pageUrl = fileList[i]
        const arr=pageUrl.split("/")
        // pages下一级文件夹名称
        let pageCode=arr[3]
        // pages下是否存在二级
        let hasSub=false
        if(arr.length>5){
            hasSub=true
            pageCode+="/"+arr[4]
        }

        const pageData = pagesJson[pageCode]
        if(!pageData){//检测有没有注册，没有注册跳过
            continue
        }
        const {enable}=pageData// enable 为false跳过
        if (!enable){
            continue
        }
        // 入口文件
        const entryFile = `entry/${pageCode}/index.js`
        const dir = `entry/${pageCode}`
        //动态
        let dirExists =fs.existsSync(dir)
        if(!dirExists){
            let tmp=pageCode.split("/")
            if( !fs.existsSync(`entry/${tmp[0]}`)){// 创建一级
                fs.mkdirSync(`entry/${tmp[0]}`)
            }
            if(tmp.length>=2){//创建二级
                fs.mkdirSync(`entry/${tmp[0]}/${tmp[1]}`)
            }
        }

        let exists = fs.existsSync(entryFile)

        if (!exists) {
            let prefix = "../../"
            if(hasSub){
                prefix+="../"
            }
                let data=`/**
 *  此页面是动态生成的，请勿动
 */
import { createApp } from 'vue'
import App from '${prefix}src/pages/${pageCode}/index'
createApp(App).mount('#app')
            `
                fs.writeFile(entryFile,data,function (err){
                    if(err){
                        console.log(err)
                    }
                })

        }


        Object.assign(pageData, {
            url: pageUrl,
            code: pageCode
        })
        pages[pageCode] = {
            entry: entryFile,
            template: "./public/index.html",
            filename:pageCode + "/index.html",
            minify: true,
            chunks: [
                'chunk-vendors',
                'chunk-common',
                'app',
                pageCode
            ],
            chunksSortMode: 'manual',
            pageData: pageData
        }


    }

    return pages
}
