FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY dist/ ./dist/
EXPOSE 8081
CMD ["node", "dist/index.js"]
