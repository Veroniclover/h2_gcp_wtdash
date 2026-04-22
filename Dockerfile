FROM alpine:latest

WORKDIR /app

RUN apk add --no-cache wget unzip ca-certificates \
 && wget https://github.com/XTLS/Xray-core/releases/latest/download/Xray-linux-64.zip \
 && unzip Xray-linux-64.zip \
 && rm Xray-linux-64.zip

COPY config.json /app

EXPOSE 8080

CMD ["./xray", "run", "-c", "config.json"]
