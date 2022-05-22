FROM node:10.19.0

COPY . /opt

WORKDIR /opt

RUN npm install

ENTRYPOINT ["npm", "run"]

CMD ["node_1_debug"]
