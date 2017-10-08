# egret-protobuf6.8.0（proto3）

这个实例是在egret中使用protobuf6.8.0(proto3)库，解决了在ios打包是不能用外部加载的方式来加载文件的问题，并且改成了使用egret内部加载的方式来加载。

这个实例是一个可以正常运行的实例。



重写了proto库的的load方法，在main里面，在通过mian里面的load方法来加载proto文件。

同时也增加了import的外部加载（注意在import的路径要相对路径，不要填相对路径，要是想要支持据对路径可以修改main.ts中的load方法来支持）。
