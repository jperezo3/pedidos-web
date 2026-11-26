import os from "node:os";
import data from "../../../data/pedidos.json";

export const dynamic = "force-dynamic";

// Si API_URL esta definida se reenvia a Flask; si no, se usa data/pedidos.json.
export async function GET(_request, { params }) {
  const { ruta = [] } = await params;
  const [recurso, id] = ruta;

  const valida =
    ruta.length === 0 ||
    (recurso === "health" && ruta.length === 1) ||
    (recurso === "pedidos" && ruta.length <= 2 && id !== "." && id !== "..");
  if (!valida) return responder({ error: "Ruta no encontrada" }, 404);

  const apiUrl = process.env.API_URL?.replace(/\/+$/, "");
  if (apiUrl) return reenviar(apiUrl, ruta);

  const pedidos = data.pedidos ?? [];

  if (!recurso) {
    return responder({
      servicio: "API de Consulta de Pedidos",
      rutas_disponibles: ["/api", "/api/health", "/api/pedidos", "/api/pedidos/<id>"],
    });
  }
  if (recurso === "health") {
    return responder({
      status: "healthy",
      version_datos: data.version_id,
      total_pedidos: pedidos.length,
    });
  }
  if (!id) {
    return responder({
      version_datos: data.version_id,
      ultima_actualizacion: data.ultima_actualizacion,
      total: pedidos.length,
      pedidos,
    });
  }
  const pedido = pedidos.find((p) => p.id === id);
  if (!pedido) return responder({ error: `Pedido ${id} no encontrado` }, 404);
  return responder({ version_datos: data.version_id, pedido });
}

async function reenviar(apiUrl, ruta) {
  try {
    const res = await fetch(`${apiUrl}/${ruta.map(encodeURIComponent).join("/")}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const body = await res.json();
    return Response.json(body, { status: res.status });
  } catch {
    return Response.json({ error: "No se pudo conectar con la API de pedidos" }, { status: 502 });
  }
}

function responder(payload, status = 200) {
  return Response.json(
    {
      ...payload,
      instancia_id: process.env.VERCEL_REGION || os.hostname(),
      timestamp_consulta: new Date().toISOString(),
    },
    { status }
  );
}
