# 使用官方 Node.js 运行环境作为基础镜像
FROM node:20-slim

# 安装下载工具 curl、ca-certificates 以及 bash
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    bash \
    && rm -rf /var/lib/apt/lists/*

# 直接从官方下载 ttyd 二进制文件并赋予执行权限
# 这里下载的是 1.7.7 版本的 x86_64 架构（适合 GitHub Actions 的默认运行环境）
RUN curl -L https://github.com/tsl0922/ttyd/releases/download/1.7.7/ttyd.x86_64 -o /usr/local/bin/ttyd \
    && chmod +x /usr/local/bin/ttyd

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json（如果有）
COPY package*.json ./

# 安装 Node.js 依赖
RUN npm install --production

# 复制项目所有文件到工作目录
COPY . .

# 暴露端口（请根据你项目的实际端口修改，比如 3000）
EXPOSE 3000

# 启动命令
CMD ["npm", "start"]
