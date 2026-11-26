"use client"

import { useCallback, useEffect, useState } from "react"
import { Activity, ChevronRight, Database, Package, RefreshCw, Search, Server, TriangleAlert } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type Pedido = Record<string, unknown> & { id?: string }
type Lista = {
  pedidos?: Pedido[]
  total?: number
  version_datos?: string
  ultima_actualizacion?: string
  instancia_id?: string
}

async function consultar(url: string) {
  const res = await fetch(url, { cache: "no-store" })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `Error ${res.status}`)
  return body
}

const titulo = (k: string) => (k.charAt(0).toUpperCase() + k.slice(1)).replaceAll("_", " ")
const texto = (v: unknown) => (v !== null && typeof v === "object" ? JSON.stringify(v) : String(v ?? "—"))

function fecha(v?: string) {
  const d = new Date(v ?? "")
  return Number.isNaN(d.getTime()) ? (v ?? "—") : d.toLocaleString("es", { dateStyle: "medium", timeStyle: "short" })
}

const COLORES: Record<string, string> = {
  entregado: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  enviado: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  pendiente: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  cancelado: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
}

function Valor({ campo, valor }: { campo: string; valor: unknown }) {
  if (campo !== "estado" || valor == null) return <>{texto(valor)}</>
  const estado = texto(valor)
  return (
    <Badge variant="secondary" className={COLORES[estado.toLowerCase()]}>
      {titulo(estado)}
    </Badge>
  )
}

export default function Home() {
  const [lista, setLista] = useState<Lista | null>(null)
  const [error, setError] = useState("")
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [abierto, setAbierto] = useState<string | null>(null)
  const [detalle, setDetalle] = useState<Pedido | null>(null)
  const [errorDetalle, setErrorDetalle] = useState("")

  const [salud, setSalud] = useState<Record<string, unknown> | null>(null)
  const [errorSalud, setErrorSalud] = useState("")
  const [revisando, setRevisando] = useState(true)
  const [verSalud, setVerSalud] = useState(false)

  const revisarSalud = useCallback(async () => {
    setRevisando(true)
    setErrorSalud("")
    try {
      setSalud(await consultar("/api/health"))
    } catch (e) {
      setSalud(null)
      setErrorSalud((e as Error).message)
    } finally {
      setRevisando(false)
    }
  }, [])

  const cargar = useCallback(async () => {
    setCargando(true)
    setError("")
    try {
      setLista(await consultar("/api/pedidos"))
    } catch (e) {
      setLista(null)
      setError((e as Error).message)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
    revisarSalud()
  }, [cargar, revisarSalud])

  useEffect(() => {
    if (!abierto) return
    let vigente = true
    setDetalle(null)
    setErrorDetalle("")
    consultar(`/api/pedidos/${encodeURIComponent(abierto)}`)
      .then((r) => vigente && setDetalle(r.pedido))
      .catch((e) => vigente && setErrorDetalle(e.message))
    return () => {
      vigente = false
    }
  }, [abierto])

  const pedidos = lista?.pedidos ?? []
  const columnas = [...new Set(pedidos.flatMap((p) => Object.keys(p)))]
  const q = busqueda.trim().toLowerCase()
  const visibles = pedidos.filter((p) => Object.values(p).some((v) => texto(v).toLowerCase().includes(q)))

  const resumen = [
    { nombre: "Total de pedidos", valor: lista?.total, Icono: Package },
    { nombre: "Versión de datos", valor: lista?.version_datos, Icono: Database },
    { nombre: "Instancia", valor: lista?.instancia_id, Icono: Server },
  ]

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2.5 font-semibold">
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Package className="size-4" />
            </span>
            Pedidos
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => {
              setVerSalud(true)
              revisarSalud()
            }}
          >
            <span className={`size-2 rounded-full ${revisando ? "bg-amber-500" : salud?.status === "healthy" ? "bg-emerald-500" : "bg-rose-500"}`} />
            {revisando ? "Revisando" : salud?.status === "healthy" ? "En línea" : "Con problemas"}
            <Activity />
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)] gap-6 px-4 py-8 sm:px-6 sm:py-12">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Todos tus pedidos, al instante</h1>
            <p className="mt-2 text-muted-foreground">Consulta el detalle de cada pedido desde cualquier dispositivo.</p>
          </div>
          <Button onClick={() => {
              cargar()
              revisarSalud()
            }} disabled={cargando} className="w-full sm:w-auto">
            <RefreshCw className={cargando ? "animate-spin" : ""} />
            Actualizar
          </Button>
        </section>

        {error && (
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertTitle>No pudimos cargar los pedidos</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <section className="grid gap-3 sm:grid-cols-3">
          {resumen.map(({ nombre, valor, Icono }) => (
            <Card key={nombre} className="gap-2 p-5">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                {nombre}
                <Icono className="size-4 text-primary" />
              </div>
              {cargando ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-semibold break-all">{valor ?? "—"}</div>}
            </Card>
          ))}
        </section>

        <Card className="gap-0 overflow-hidden py-0">
          <div className="border-b p-4">
            <div className="relative sm:max-w-xs">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar pedido…"
                aria-label="Buscar pedido"
                className="pl-9"
              />
            </div>
          </div>

          {cargando ? (
            <div className="grid gap-3 p-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : visibles.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">
              {error ? "Intenta actualizar en unos segundos." : q ? "Ningún pedido coincide con la búsqueda." : "Aún no hay pedidos."}
            </p>
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {columnas.map((c) => <TableHead key={c} className="px-4">{titulo(c)}</TableHead>)}
                      <TableHead><span className="sr-only">Acciones</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibles.map((p, i) => (
                      <TableRow key={p.id ?? i}>
                        {columnas.map((c) => (
                          <TableCell key={c} className="px-4 py-3"><Valor campo={c} valor={p[c]} /></TableCell>
                        ))}
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => setAbierto(p.id ?? null)}>
                            Ver <ChevronRight />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <ul className="divide-y md:hidden">
                {visibles.map((p, i) => (
                  <li key={p.id ?? i}>
                    <button className="flex w-full items-center gap-3 p-4 text-left active:bg-muted" onClick={() => setAbierto(p.id ?? null)}>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{texto(p.cliente ?? p.id)}</div>
                        <div className="truncate text-sm text-muted-foreground">
                          {[p.id, p.producto].filter(Boolean).map(texto).join(" · ")}
                        </div>
                      </div>
                      {p.estado != null && <Valor campo="estado" valor={p.estado} />}
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        {lista && (
          <footer className="text-center text-sm text-muted-foreground">
            Última actualización: {fecha(lista.ultima_actualizacion)}
          </footer>
        )}
      </main>

      <Sheet open={verSalud} onOpenChange={setVerSalud}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader className="border-b p-6">
            <SheetTitle>Estado del servicio</SheetTitle>
            <SheetDescription>Respuesta de /health</SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 px-6 pb-6">
            {revisando ? (
              <Skeleton className="h-32" />
            ) : errorSalud ? (
              <p className="text-sm text-destructive">{errorSalud}</p>
            ) : (
              <dl className="divide-y">
                {Object.entries(salud ?? {}).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-3 text-sm">
                    <dt className="text-muted-foreground">{titulo(k)}</dt>
                    <dd className="min-w-0 text-right font-medium break-all">{texto(v)}</dd>
                  </div>
                ))}
              </dl>
            )}
            <Button variant="outline" onClick={revisarSalud} disabled={revisando}>
              <RefreshCw /> Volver a consultar
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={abierto !== null} onOpenChange={(o) => !o && setAbierto(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader className="border-b p-6">
            <SheetTitle>Pedido {abierto}</SheetTitle>
            <SheetDescription>Detalle del pedido</SheetDescription>
          </SheetHeader>
          <div className="px-6 pb-6">
            {errorDetalle ? (
              <p className="text-sm text-destructive">{errorDetalle}</p>
            ) : !detalle ? (
              <Skeleton className="h-32" />
            ) : (
              <dl className="divide-y">
                {Object.entries(detalle).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-3 text-sm">
                    <dt className="text-muted-foreground">{titulo(k)}</dt>
                    <dd className="min-w-0 text-right font-medium break-words"><Valor campo={k} valor={v} /></dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
