//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-present, Egret Technology.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////
var __reflect = (this && this.__reflect) || function (p, c, t) {
    p.__class__ = c, t ? t.push(c) : t = [c], p.__types__ = p.__types__ ? t.concat(p.__types__) : t;
};
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Main = (function (_super) {
    __extends(Main, _super);
    function Main() {
        var _this = _super.call(this) || this;
        _this.addEventListener(egret.Event.ADDED_TO_STAGE, _this.onAddToStage, _this);
        return _this;
    }
    Main.prototype.onAddToStage = function (event) {
        //设置加载进度界面
        //Config to load process interface
        this.loadingView = new LoadingUI();
        this.stage.addChild(this.loadingView);
        //初始化Resource资源加载库
        //initiate Resource loading library
        RES.addEventListener(RES.ResourceEvent.CONFIG_COMPLETE, this.onConfigComplete, this);
        RES.loadConfig("resource/default.res.json", "resource/");
    };
    /**
     * 配置文件加载完成,开始预加载preload资源组。
     * configuration file loading is completed, start to pre-load the preload resource group
     */
    Main.prototype.onConfigComplete = function (event) {
        RES.removeEventListener(RES.ResourceEvent.CONFIG_COMPLETE, this.onConfigComplete, this);
        RES.addEventListener(RES.ResourceEvent.GROUP_COMPLETE, this.onResourceLoadComplete, this);
        RES.addEventListener(RES.ResourceEvent.GROUP_LOAD_ERROR, this.onResourceLoadError, this);
        RES.addEventListener(RES.ResourceEvent.GROUP_PROGRESS, this.onResourceProgress, this);
        RES.addEventListener(RES.ResourceEvent.ITEM_LOAD_ERROR, this.onItemLoadError, this);
        RES.loadGroup("preload");
    };
    /**
     * preload资源组加载完成
     * Preload resource group is loaded
     */
    Main.prototype.onResourceLoadComplete = function (event) {
        if (event.groupName == "preload") {
            this.stage.removeChild(this.loadingView);
            RES.removeEventListener(RES.ResourceEvent.GROUP_COMPLETE, this.onResourceLoadComplete, this);
            RES.removeEventListener(RES.ResourceEvent.GROUP_LOAD_ERROR, this.onResourceLoadError, this);
            RES.removeEventListener(RES.ResourceEvent.GROUP_PROGRESS, this.onResourceProgress, this);
            RES.removeEventListener(RES.ResourceEvent.ITEM_LOAD_ERROR, this.onItemLoadError, this);
            this.createGameScene();
        }
    };
    /**
     * 资源组加载出错
     *  The resource group loading failed
     */
    Main.prototype.onItemLoadError = function (event) {
        console.warn("Url:" + event.resItem.url + " has failed to load");
    };
    /**
     * 资源组加载出错
     *  The resource group loading failed
     */
    Main.prototype.onResourceLoadError = function (event) {
        //TODO
        console.warn("Group:" + event.groupName + " has failed to load");
        //忽略加载失败的项目
        //Ignore the loading failed projects
        this.onResourceLoadComplete(event);
    };
    /**
     * preload资源组加载进度
     * Loading process of preload resource group
     */
    Main.prototype.onResourceProgress = function (event) {
        if (event.groupName == "preload") {
            this.loadingView.setProgress(event.itemsLoaded, event.itemsTotal);
        }
    };
    /**
     * 创建游戏场景
     * Create a game scene
     */
    Main.prototype.createGameScene = function () {
        var _this = this;
        this.load("./resource/test.proto", function (err, root) {
            console.log(root);
            _this.Proto = root.Test;
            _this.initWebSocket();
        });
    };
    /**
     * 使用框架内部加载外部proto文件
     * @param  {any} url proto文件路径 也可以是路径数组（可包含多条路径）
     * @param  {any} options (err: any, root: any) => {}加载完成后回调
     * @param  {any} callback=null
     * @returns void
     */
    Main.prototype.load = function (url, options, callback) {
        var _this = this;
        if (callback === void 0) { callback = null; }
        var self = new protobuf.Root();
        var queued = 0;
        var path;
        if (typeof options === "function") {
            callback = options;
            options = undefined;
        }
        var finish = function (err, root) {
            if (!callback || queued)
                return;
            callback(err, root);
        };
        var process = function (filename, source) {
            self.files.push(filename);
            var parsed = protobuf.parse(source, self, options), resolved;
            if (parsed.imports) {
                queued += parsed.imports.length;
                for (var i = 0; i < parsed.imports.length; ++i) {
                    if (resolved = self.resolvePath(path, parsed.imports[i])) {
                        var str = resolved.slice(resolved.lastIndexOf("/") + 1, resolved.length).replace(".", "_");
                        if (!RES.getRes(str)) {
                            RES.getResByUrl(resolved, function (source_) {
                                process(resolved, source_);
                                --queued;
                                finish(null, self);
                            }, _this, RES.ResourceItem.TYPE_TEXT);
                        }
                        else {
                            process(resolved, RES.getRes(str));
                            --queued;
                        }
                    }
                }
            }
            if (parsed.weakImports) {
                queued += parsed.imports.length;
                for (var i = 0; i < parsed.weakImports.length; ++i) {
                    if (resolved = self.resolvePath(path, parsed.weakImports[i])) {
                        var str = resolved.slice(resolved.lastIndexOf("/") + 1, resolved.length).replace(".", "_");
                        if (!RES.getRes(str)) {
                            RES.getResByUrl(resolved, function (source_) {
                                process(resolved, source_);
                                --queued;
                                finish(null, self);
                            }, _this, RES.ResourceItem.TYPE_TEXT);
                        }
                        else {
                            process(resolved, RES.getRes(str));
                            --queued;
                        }
                    }
                }
            }
            ;
            finish(null, self);
        };
        if (typeof url === "string") {
            path = url.slice(0, url.lastIndexOf("/") + 1);
            RES.getResByUrl(url, function (source_) {
                process(url, source_);
            }, this, RES.ResourceItem.TYPE_TEXT);
        }
        else {
            var _loop_1 = function (i) {
                RES.getResByUrl(url[i], function (source_) {
                    var tempurl = url[i];
                    path = tempurl.slice(0, tempurl.lastIndexOf("/") + 1);
                    process(tempurl, source_);
                }, this_1, RES.ResourceItem.TYPE_TEXT);
            };
            var this_1 = this;
            for (var i = 0; i < url.length; i++) {
                _loop_1(i);
            }
        }
    };
    Main.prototype.initWebSocket = function () {
        //创建 WebSocket 对象
        this.socket = new egret.WebSocket();
        //设置数据格式为二进制，默认为字符串
        this.socket.type = egret.WebSocket.TYPE_BINARY;
        //添加收到数据侦听，收到数据会调用此方法
        this.socket.addEventListener(egret.ProgressEvent.SOCKET_DATA, this.onReceiveMessage, this);
        //添加链接打开侦听，连接成功会调用此方法
        this.socket.addEventListener(egret.Event.CONNECT, this.onSocketOpen, this);
        //添加链接关闭侦听，手动关闭或者服务器关闭连接会调用此方法
        this.socket.addEventListener(egret.Event.CLOSE, this.onSocketClose, this);
        //添加异常侦听，出现异常会调用此方法
        this.socket.addEventListener(egret.IOErrorEvent.IO_ERROR, this.onSocketError, this);
        //连接服务器
        this.socket.connect("echo.websocket.org", 80);
    };
    Main.prototype.sendData = function () {
        var obj = {
            SID: "123456",
            RID: 0,
            GPS_LNG: 0,
            GPS_LAT: 0,
            openid: "000",
            token: undefined
        };
        /**
         * 获取buff
         */
        var buff = this.getProto(100, obj);
        /**把buff写入ByteArray */
        var byte = new egret.ByteArray();
        byte._writeUint8Array(buff);
        //发送数据
        this.socket.writeBytes(byte);
        this.socket.flush();
    };
    /**
     * ID:
     * body:要传输的数据
     * 返回buff
     */
    Main.prototype.getProto = function (ID, body) {
        var ProMessage = this.Proto.Message;
        var BodyClass;
        console.log(this.Proto.Login, this.Proto[100], this.Proto['Login']);
        switch (ID) {
            case 100:
                BodyClass = this.Proto.Login;
                break;
        }
        //----------------
        var message = {
            "ID": ID,
            "MSG": BodyClass.encode(BodyClass.create(body)).finish()
        };
        var messageBuffer = ProMessage.encode(ProMessage.create(message)).finish();
        console.log("[发-" + ID + "]", body);
        return messageBuffer;
    };
    Main.prototype.onSocketOpen = function () {
        console.log("WebSocketOpen");
        this.sendData();
    };
    Main.prototype.onSocketClose = function () {
        console.log("WebSocketClose");
    };
    Main.prototype.onSocketError = function () {
        console.log("WebSocketError");
    };
    Main.prototype.onReceiveMessage = function (e) {
        //创建 ByteArray 对象
        var byte = new egret.ByteArray();
        //读取数据
        this.socket.readBytes(byte);
        //从二进制中读取出uint8Arry
        var uint8 = new Uint8Array(this.getUint8Array(byte));
        var Message = this.Proto.Message;
        var data = Message.decode(uint8);
        this.onGotLoginMessage(data);
    };
    /**
     * 返回一个uintArray数据
     */
    Main.prototype.getUint8Array = function (byte) {
        var data = [];
        for (var i = 0; i < byte.dataView.byteLength; i++) {
            data.push(byte.dataView.getUint8(i));
        }
        return data;
    };
    Main.prototype.onGotLoginMessage = function (msg) {
        var obj;
        switch (msg.ID) {
            case 100:
                obj = this.Proto.Login.decode(msg.MSG);
                break;
            default:
                break;
        }
        console.log("[收-" + msg.ID + "]", obj);
    };
    return Main;
}(egret.DisplayObjectContainer));
__reflect(Main.prototype, "Main");
//# sourceMappingURL=Main.js.map