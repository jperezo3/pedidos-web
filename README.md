# Pedidos (Next.js)

Front de la API de Pedidos (Flask + PostgreSQL).

## Local
    npm install
    # crea .env.local con:  API_URL=http://localhost:8000
    npm run dev        # http://localhost:3000

`API_URL` es obligatoria (en Vercel: Settings > Environment Variables, y luego Redeploy).

Crear, editar, eliminar y cargar piden usuario y contraseña (los de
API_AUTH_CREDENTIALS del back). No se guardan: se pierden al recargar.
Usa HTTPS en la API antes de enviar credenciales reales por internet.
