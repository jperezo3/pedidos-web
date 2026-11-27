"use client"

import { useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { basic, consultar, ErrorApi, type Credenciales, type Pedido } from "@/lib/api"

export type Accion =
  | { tipo: "crear" }
  | { tipo: "cargar" }
  | { tipo: "editar"; pedido: Pedido }
  | { tipo: "eliminar"; pedido: Pedido }

const CAMPOS = [
  { nombre: "id", etiqueta: "ID" },
  { nombre: "codigo_lote", etiqueta: "Código de lote" },
  { nombre: "producto", etiqueta: "Producto" },
  { nombre: "cantidad", etiqueta: "Cantidad" },
  { nombre: "estado", etiqueta: "Estado" },
  { nombre: "centro_origen", etiqueta: "Centro de origen" },
]

const TITULOS = {
  crear: ["Nuevo pedido", "Todos los campos son obligatorios."],
  cargar: ["Carga masiva", "Archivo .json de máximo 1 MB. Si un pedido falla, no se importa ninguno."],
  editar: ["Editar pedido", "Solo se envían los campos que cambies."],
  eliminar: ["Eliminar pedido", "Esta acción es definitiva."],
}

type Props = {
  accion: Accion
  credenciales: Credenciales
  onCredenciales: (c: Credenciales) => void
  onCerrar: () => void
  onListo: (mensaje: string) => void
}

export function Formulario({ accion, credenciales, onCredenciales, onCerrar, onListo }: Props) {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState("")
  const [titulo, descripcion] = TITULOS[accion.tipo]
  const original = "pedido" in accion ? accion.pedido : undefined

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    const datos = new FormData(e.currentTarget)
    const headers: Record<string, string> = { Authorization: basic(credenciales) }
    let url = "/api/pedidos"
    let method = "POST"
    let body: BodyInit | undefined
    let mensaje = "Pedido creado"

    if (accion.tipo === "cargar") {
      const archivo = datos.get("file") as File
      if (!archivo.name.toLowerCase().endsWith(".json")) return setError("El archivo debe tener extensión .json")
      if (archivo.size > 1024 * 1024) return setError("El archivo supera 1 MB")
      const envio = new FormData()
      envio.append("file", archivo)
      url += "/bulk"
      body = envio
      mensaje = "Pedidos importados"
    } else if (accion.tipo === "eliminar") {
      url += `/${encodeURIComponent(String(original?.id))}`
      method = "DELETE"
      mensaje = `Pedido ${original?.id} eliminado`
    } else {
      const pedido: Pedido = {}
      for (const { nombre } of CAMPOS) {
        if (accion.tipo === "editar" && nombre === "id") continue
        const valor = String(datos.get(nombre) ?? "").trim()
        if (!valor) return setError("Completa todos los campos")
        const final = nombre === "cantidad" ? Number(valor) : valor
        if (accion.tipo === "crear" || final !== original?.[nombre]) pedido[nombre] = final
      }
      if (accion.tipo === "editar") {
        if (Object.keys(pedido).length === 0) return setError("No cambiaste ningún campo")
        url += `/${encodeURIComponent(String(original?.id))}`
        method = "PATCH"
        mensaje = `Pedido ${original?.id} actualizado`
      }
      headers["Content-Type"] = "application/json"
      body = JSON.stringify(pedido)
    }

    setEnviando(true)
    try {
      await consultar(url, { method, headers, body })
      onListo(mensaje)
    } catch (err) {
      const status = err instanceof ErrorApi ? err.status : 0
      setError(status === 401 ? "Usuario o contraseña incorrectos" : (err as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Sheet open onOpenChange={(abierto) => !abierto && !enviando && onCerrar()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b p-6">
          <SheetTitle>{titulo}</SheetTitle>
          <SheetDescription>{descripcion}</SheetDescription>
        </SheetHeader>
        <form onSubmit={enviar} className="grid gap-4 px-6 pb-6">
          {accion.tipo === "eliminar" && (
            <p className="text-sm">
              Vas a eliminar el pedido <strong>{original?.id}</strong>.
            </p>
          )}

          {accion.tipo === "cargar" && (
            <>
              <label className="grid gap-1.5 text-sm font-medium">
                Archivo
                <Input type="file" name="file" accept=".json,application/json" required />
              </label>
              <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
{`{"pedidos": [{
  "id": "PED-102",
  "codigo_lote": "L-200",
  "producto": "Producto B",
  "cantidad": 5,
  "estado": "pendiente",
  "centro_origen": "Medellin"
}]}`}
              </pre>
            </>
          )}

          {(accion.tipo === "crear" || accion.tipo === "editar") &&
            CAMPOS.map(({ nombre, etiqueta }) => (
              <label key={nombre} className="grid gap-1.5 text-sm font-medium">
                {etiqueta}
                <Input
                  name={nombre}
                  required
                  type={nombre === "cantidad" ? "number" : "text"}
                  min={nombre === "cantidad" ? 1 : undefined}
                  step={nombre === "cantidad" ? 1 : undefined}
                  list={nombre === "estado" ? "estados" : undefined}
                  defaultValue={String(original?.[nombre] ?? "")}
                  disabled={accion.tipo === "editar" && nombre === "id"}
                />
              </label>
            ))}
          <datalist id="estados">
            {["pendiente", "enviado", "entregado", "cancelado"].map((e) => <option key={e} value={e} />)}
          </datalist>

          <fieldset className="grid gap-3 rounded-lg border p-4">
            <legend className="px-1 text-sm text-muted-foreground">Autorización</legend>
            <Input
              aria-label="Usuario"
              placeholder="Usuario"
              autoComplete="username"
              required
              value={credenciales.usuario}
              onChange={(e) => onCredenciales({ ...credenciales, usuario: e.target.value })}
            />
            <Input
              aria-label="Contraseña"
              placeholder="Contraseña"
              type="password"
              autoComplete="current-password"
              required
              value={credenciales.clave}
              onChange={(e) => onCredenciales({ ...credenciales, clave: e.target.value })}
            />
          </fieldset>

          {error && (
            <Alert variant="destructive">
              <AlertDescription className="col-span-2">{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={enviando} variant={accion.tipo === "eliminar" ? "destructive" : "default"}>
            {enviando ? "Enviando…" : accion.tipo === "eliminar" ? "Eliminar definitivamente" : "Guardar"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
