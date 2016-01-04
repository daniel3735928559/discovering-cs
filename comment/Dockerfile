FROM node:latest
COPY . /src
RUN cd /src; npm install
EXPOSE  3797
CMD ["node", "/src/app.js"]
