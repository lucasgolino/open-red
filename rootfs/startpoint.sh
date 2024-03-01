#!/bin/bash

service nginx start

cd /usr/src/node-red
exec ./entrypoint.sh