FROM node:18-bullseye

RUN apt-get update && apt-get install -y curl unzip iproute2 && rm -rf /var/lib/apt/lists/*

RUN curl -L https://github.com/XTLS/Xray-core/releases/latest/download/Xray-linux-64.zip -o xray.zip \
    && unzip xray.zip \
    && mv xray /usr/local/bin/xray \
    && chmod +x /usr/local/bin/xray \
    && rm -rf xray.zip *.dat

WORKDIR /app

COPY package.json .
RUN npm install

COPY server.js .
COPY xray.json .
COPY start.sh .

RUN chmod +x start.sh

ENV PORT=8080

EXPOSE 8080

CMD ["./start.sh"]
