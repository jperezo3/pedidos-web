export type Pedido = Record<string, unknown> & { id?: string }
export type Credenciales = { usuario: string; clave: string }

export class ErrorApi extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

export async function consultar(url: string, init?: RequestInit) {
  const res = await fetch(url, { cache: "no-store", ...init })
  const body = await res.json().catch(() => ({}))
  // /health informa sus errores en "detalle"; el resto en "error"
  if (!res.ok) throw new ErrorApi(body.error || body.detalle || `Error ${res.status}`, res.status)
  return body
}

export function basic({ usuario, clave }: Credenciales) {
  const bytes = new TextEncoder().encode(`${usuario}:${clave}`)
  return `Basic ${btoa(String.fromCharCode(...bytes))}`
}
