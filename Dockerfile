# 使用官方 Node.js 运行环境作为基础镜像
FROM node:20-slim

# 安装 ttyd、bash 
RUN apt-get update && apt-get install -y \
    ttyd \
    bash \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 复制 package.json
COPY package*.json ./

# 安装 Node.js 依赖
RUN npm install --production

# 复制项目所有文件
COPY . .

# 暴露端口（根据你项目的实际端口修改，比如 3000）
EXPOSE 3000

# 启动命令
CMD ["npm", "start"]
