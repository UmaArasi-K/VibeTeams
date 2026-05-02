FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY dist/ ./dist/
EXPOSE 8082
CMD ["node", "dist/index.js"]
