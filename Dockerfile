# Dùng Node.js làm môi trường
FROM node:22

# Thiết lập thư mục làm việc trong container
WORKDIR /app

# Copy package.json và cài đặt dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy toàn bộ project vào container
COPY . .

# Expose cổng 1337 cho Strapi
EXPOSE 1337

# Lệnh chạy Strapi khi container khởi động
CMD ["npm", "run", "develop"]
