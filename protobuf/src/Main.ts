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

class Main extends egret.DisplayObjectContainer {

    /**
     * 加载进度界面
     * Process interface loading
     */
    private loadingView: LoadingUI;

    public constructor() {
        super();
        this.addEventListener(egret.Event.ADDED_TO_STAGE, this.onAddToStage, this);
    }

    private onAddToStage(event: egret.Event) {
        //设置加载进度界面
        //Config to load process interface
        this.loadingView = new LoadingUI();
        this.stage.addChild(this.loadingView);

        //初始化Resource资源加载库
        //initiate Resource loading library
        RES.addEventListener(RES.ResourceEvent.CONFIG_COMPLETE, this.onConfigComplete, this);
        RES.loadConfig("resource/default.res.json", "resource/");
    }

    /**
     * 配置文件加载完成,开始预加载preload资源组。
     * configuration file loading is completed, start to pre-load the preload resource group
     */
    private onConfigComplete(event: RES.ResourceEvent): void {
        RES.removeEventListener(RES.ResourceEvent.CONFIG_COMPLETE, this.onConfigComplete, this);
        RES.addEventListener(RES.ResourceEvent.GROUP_COMPLETE, this.onResourceLoadComplete, this);
        RES.addEventListener(RES.ResourceEvent.GROUP_LOAD_ERROR, this.onResourceLoadError, this);
        RES.addEventListener(RES.ResourceEvent.GROUP_PROGRESS, this.onResourceProgress, this);
        RES.addEventListener(RES.ResourceEvent.ITEM_LOAD_ERROR, this.onItemLoadError, this);
        RES.loadGroup("preload");
    }

    /**
     * preload资源组加载完成
     * Preload resource group is loaded
     */
    private onResourceLoadComplete(event: RES.ResourceEvent) {
        if (event.groupName == "preload") {
            this.stage.removeChild(this.loadingView);
            RES.removeEventListener(RES.ResourceEvent.GROUP_COMPLETE, this.onResourceLoadComplete, this);
            RES.removeEventListener(RES.ResourceEvent.GROUP_LOAD_ERROR, this.onResourceLoadError, this);
            RES.removeEventListener(RES.ResourceEvent.GROUP_PROGRESS, this.onResourceProgress, this);
            RES.removeEventListener(RES.ResourceEvent.ITEM_LOAD_ERROR, this.onItemLoadError, this);
            this.createGameScene();
        }
    }

    /**
     * 资源组加载出错
     *  The resource group loading failed
     */
    private onItemLoadError(event: RES.ResourceEvent) {
        console.warn("Url:" + event.resItem.url + " has failed to load");
    }

    /**
     * 资源组加载出错
     *  The resource group loading failed
     */
    private onResourceLoadError(event: RES.ResourceEvent) {
        //TODO
        console.warn("Group:" + event.groupName + " has failed to load");
        //忽略加载失败的项目
        //Ignore the loading failed projects
        this.onResourceLoadComplete(event);
    }

    /**
     * preload资源组加载进度
     * Loading process of preload resource group
     */
    private onResourceProgress(event: RES.ResourceEvent) {
        if (event.groupName == "preload") {
            this.loadingView.setProgress(event.itemsLoaded, event.itemsTotal);
        }
    }

    public Proto: any;
    private socket: egret.WebSocket;
    /**
     * 创建游戏场景
     * Create a game scene
     */
    private createGameScene() {
        this.load("./resource/test.proto", (err: any, root: any) => {
            console.log(root);
            this.Proto = root.Test;
            this.initWebSocket();
        });
    }
    /**
     * 使用框架内部加载外部proto文件
     * @param  {any} url proto文件路径 也可以是路径数组（可包含多条路径）
     * @param  {any} options (err: any, root: any) => {}加载完成后回调
     * @param  {any} callback=null
     * @returns void
     */
    private load(url: any, options, callback = null): void {
		let self: any = new protobuf.Root();
		let queued: number = 0;
		let path: string;
		if (typeof options === "function") {
			callback = options;
			options = undefined;
		}
		let finish = (err, root) => {
			if (!callback || queued) return;
			callback(err, root);
		}
		let process = (filename, source) => {
			self.files.push(filename);
			let parsed = protobuf.parse(source, self, options), resolved;
			if (parsed.imports) {
				queued += parsed.imports.length;
				for (let i = 0; i < parsed.imports.length; ++i) {
					if (resolved = self.resolvePath(path, parsed.imports[i])) {
						let str: any = resolved.slice(resolved.lastIndexOf("/") + 1, resolved.length).replace(".", "_");
						if (!RES.getRes(str)) {
							RES.getResByUrl(resolved, function (source_: any) {
								process(resolved, source_);
								--queued;
								finish(null, self);
							}, this, RES.ResourceItem.TYPE_TEXT)
						} else {
							process(resolved, RES.getRes(str));
							--queued;
						}
					}
				}
			}
			if (parsed.weakImports) {
				queued += parsed.imports.length;
				for (let i = 0; i < parsed.weakImports.length; ++i) {
					if (resolved = self.resolvePath(path, parsed.weakImports[i])) {
						let str: any = resolved.slice(resolved.lastIndexOf("/") + 1, resolved.length).replace(".", "_");
						if (!RES.getRes(str)) {
							RES.getResByUrl(resolved, function (source_: any) {
								process(resolved, source_);
								--queued;
								finish(null, self);
							}, this, RES.ResourceItem.TYPE_TEXT);
						} else {
							process(resolved, RES.getRes(str));
							--queued;
						}
					}
				}
			};
			finish(null, self);
		}

		if (typeof url === "string") {
			path = url.slice(0, url.lastIndexOf("/") + 1);
			RES.getResByUrl(url, function (source_: any) {
				process(url, source_);
			}, this, RES.ResourceItem.TYPE_TEXT);
		} else {
			for (let i = 0; i < url.length; i++) {
				RES.getResByUrl(url[i], function (source_: any) {
					let tempurl: string = url[i];
					path = tempurl.slice(0, tempurl.lastIndexOf("/") + 1);
					process(tempurl, source_);
				}, this, RES.ResourceItem.TYPE_TEXT);
			}
		}
	}

    private initWebSocket(): void {
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
    }

    private sendData(): void {
        var obj: Object = {
            SID: "123456",
            RID: 0,
            GPS_LNG: 0,
            GPS_LAT: 0,
            openid: "000",
            token: undefined
        }
        /**
         * 获取buff
         */
        var buff: Uint8Array = this.getProto(100, obj);

        /**把buff写入ByteArray */
        var byte: egret.ByteArray = new egret.ByteArray();
        byte._writeUint8Array(buff);
        //发送数据
        this.socket.writeBytes(byte);
        this.socket.flush();
    }
    /**
     * ID:
     * body:要传输的数据
     * 返回buff
     */
    private getProto(ID: number, body: Object): any {
        var ProMessage: any = this.Proto.Message;
        var BodyClass: any;
        console.log(this.Proto.Login, this.Proto[100], this.Proto['Login'])
        switch (ID) {
            case 100:
                BodyClass = this.Proto.Login;
                break;
        }

        //----------------
        var message: any = {
            "ID": ID,
            "MSG": BodyClass.encode(BodyClass.create(body)).finish()
        }
        var messageBuffer: any = ProMessage.encode(ProMessage.create(message)).finish();
        console.log("[发-" + ID + "]", body);
        return messageBuffer;
    }

    private onSocketOpen(): void {
        console.log("WebSocketOpen");
        this.sendData();
    }

    private onSocketClose(): void {
        console.log("WebSocketClose");
    }

    private onSocketError(): void {
        console.log("WebSocketError");
    }

    private onReceiveMessage(e: egret.Event): void {
        //创建 ByteArray 对象
        var byte: egret.ByteArray = new egret.ByteArray();
        //读取数据
        this.socket.readBytes(byte);
        //从二进制中读取出uint8Arry
        var uint8: Uint8Array = new Uint8Array(this.getUint8Array(byte));

        var Message: any = this.Proto.Message;
        var data: any = Message.decode(uint8);
        this.onGotLoginMessage(data);
    }
    /**
     * 返回一个uintArray数据
     */
    private getUint8Array(byte: egret.ByteArray): Array<number> {
        let data: Array<number> = [];
        for (let i: number = 0; i < byte.dataView.byteLength; i++) {
            data.push(byte.dataView.getUint8(i));
        }
        return data;
    }

    protected onGotLoginMessage(msg: any): void {
        var obj: any;
        switch (msg.ID) {
            case 100://登陆成功
                obj = this.Proto.Login.decode(msg.MSG);
                break;
            default:
                break;
        }
        console.log("[收-" + msg.ID + "]", obj);
    }
}


