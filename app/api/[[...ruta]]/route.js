// Intermediario entre el navegador y la API de Flask (variable API_URL).
export const dynamic = "force-dynamic";

const MAX_BYTES = 1024 * 1024; // la API rechaza más de 1 MB

export const GET = manejar;
export const POST = manejar;
export const PATCH = manejar;
export const DELETE = manejar;

function permitida(metodo, [recurso, id, ...resto]) {
  if (resto.length || id === "." || id === "..") return false;
  if (metodo === "GET") return !recurso || (recurso === "health" && !id) || recurso === "pedidos";
  if (recurso !== "pedidos") return false;
  if (metodo === "POST") return !id || id === "bulk";
  return Boolean(id); // PATCH y DELETE
}

async function manejar(request, { params }) {
  const { ruta = [] } = await params;
  if (!permitida(request.method, ruta)) return error("Ruta no encontrada", 404);

  const apiUrl = process.env.API_URL?.replace(/\/+$/, "");
  if (!apiUrl) return error("Falta configurar la variable API_URL", 500);

  const escritura = request.method !== "GET";
  const headers = {};
  let body;
  if (escritura) {
    for (const nombre of ["authorization", "content-type"]) {
      const valor = request.headers.get(nombre);
      if (valor) headers[nombre] = valor;
    }
    body = await request.arrayBuffer();
    // margen para el envoltorio multipart del archivo
    if (body.byteLength > MAX_BYTES + 4096) return error("El contenido supera 1 MB", 413);
    if (!body.byteLength) body = undefined;
  }

  try {
    const res = await fetch(`${apiUrl}/${ruta.map(encodeURIComponent).join("/")}`, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(escritura ? 30000 : 8000),
    });
    const texto = await res.text();
    let datos = {};
    if (texto) {
      try {
        datos = JSON.parse(texto);
      } catch {
        return error(`La API respondió ${res.status} con un formato inesperado`, res.ok ? 502 : res.status);
      }
    }
    return Response.json(datos, { status: res.status === 204 ? 200 : res.status });
  } catch {
    return error(
      escritura
        ? "No hubo respuesta de la API. Actualiza la lista antes de reintentar: el cambio pudo aplicarse."
        : "No se pudo conectar con la API de pedidos",
      502
    );
  }
}

function error(mensaje, status) {
  return Response.json({ error: mensaje }, { status });
}
