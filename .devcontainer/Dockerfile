FROM oven/bun:latest

WORKDIR /workspaces/humble-tms

RUN apt-get update \
  && apt-get -y install --no-install-recommends \
  ca-certificates \
  git \
  && apt-get auto-remove -y \
  && apt-get clean -y \
  && chsh -s $(which bash) bun \
  && echo 'export PS1="\e[01;32m\u\e[m:\e[01;34m\w\e[m\$ "' >> /home/bun/.bashrc
