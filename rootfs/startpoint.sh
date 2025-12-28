#!/bin/bash

service nginx start

cd /usr/src/node-red

if [ -f /data/package.json ]; then
    echo "/data/package.json exists merge and install."

    /usr/local/bin/node /opt/utils/merge_package.js $PWD/package.json /data/package.json $PWD/package.json
    
    rm -f package-lock.json
    npm install --force
else
    echo "/data/package.json does not exist."
fi

exec ./entrypoint.sh