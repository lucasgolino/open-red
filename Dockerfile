FROM nodered/node-red:latest-debian as base

RUN npm install node-red-contrib-telegrambot \
    node-red-node-email \
    node-red-node-sqlite \
    node-red-contrib-redis \
    node-red-contrib-chatbot \
    node-red-contrib-google-cloud \
    node-red-node-geofence \
    node-red-contrib-speedtest

RUN npm install \
    node-red-contrib-unifi \
    @flowfuse/node-red-dashboard \
    node-red-contrib-uuid

# RUN npm install \
#     node-red-contrib-graphql-server
    
USER root
RUN apt update && \
    apt install -y nginx

COPY rootfs/ /
ENTRYPOINT ["/./startpoint.sh"]