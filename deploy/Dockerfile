FROM node:18-bullseye

RUN apt-get update
RUN apt-get -y upgrade
RUN apt-get install -y --no-install-recommends \
    git \
    libpq-dev \
    gcc \
    linux-libc-dev \
    libc6-dev \
    make
RUN apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    wget \
    unzip \
    zip \
    ffmpeg
RUN npm install -g npm@9.8
WORKDIR /usr/src/app
COPY package.json .
COPY package-lock.json .
RUN npm install
COPY . .
RUN npm run sass-deploy
RUN npm run build --if-present

ENV HOST=0.0.0.0
ENV PORT=${PORT}
EXPOSE ${PORT}

CMD ["make", "run-web"]
