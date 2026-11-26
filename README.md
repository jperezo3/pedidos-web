# Consulta de Pedidos (Next.js)

## Local
    npm install
    npm run dev        # http://localhost:3000

Para usar tu API Flask, crea `.env.local` con:

    API_URL=http://localhost:8000

Sin `API_URL` se usan los datos de `data/pedidos.json`.

## Vercel
1. Sube esta carpeta a un repositorio de GitHub.
2. En Vercel: Add New > Project > importa el repositorio.
3. (Opcional) Settings > Environment Variables: `API_URL` = URL pública de tu Flask.
4. Deploy. Si agregas o cambias la variable después, vuelve a desplegar.
