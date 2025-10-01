FROM nginx:alpine

# Copiar todos los archivos del frontend al directorio correcto de nginx
COPY . /usr/share/nginx/html/

# Copiar configuración de nginx si existe
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer puerto 80
EXPOSE 80

# Comando por defecto
CMD ["nginx", "-g", "daemon off;"]