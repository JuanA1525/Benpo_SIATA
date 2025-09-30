FROM nginx:alpine

# Copiar archivos estáticos
COPY . /usr/share/nginx/html

# Copiar configuración de nginx desde la carpeta nginx
COPY ../nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Exponer puerto
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]