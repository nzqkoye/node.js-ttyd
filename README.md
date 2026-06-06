# node.js-ttyd
在node.js环境中构建一个极简linux环境，支持控制台。




-------------------------------------------------------
拷贝文件到容器根目录：
```index.js    package.json    ttyd```




容器启动命令：
```chmod +x ttyd && ./ttyd -W -p 11320 bash```




如果需要argo穿透：
```chmod +x ttyd && ./ttyd -W -p 端口 -c 用户名:密码 bash & sleep 2 && curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cf && chmod +x cf && ./cf tunnel --protocol http2 run --token 你的cf-argo密令```
