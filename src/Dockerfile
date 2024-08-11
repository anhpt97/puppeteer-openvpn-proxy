FROM alpine

RUN apk add gettext openvpn privoxy runit

COPY . src

CMD ["runsvdir", "src"]
