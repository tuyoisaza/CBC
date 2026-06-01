FROM node:20-alpine
RUN echo "hello from node:20"
CMD ["node", "-e", "console.log('hello')"]
