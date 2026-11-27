import { NextResponse } from "next/server";
import { listTickets, updateTicketStatus } from "@/lib/server/serverStore";
import { HandoffTicketStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUSES: HandoffTicketStatus[] = ["aguardando", "a_caminho", "em_atendimento", "resolvido"];

// Chamados sao criados pela rota /api/chat, no servidor; aqui so leitura e mudanca de status.
export async function GET() {
  const { rows, demo } = await listTickets();
  return NextResponse.json({ tickets: rows, demo });
}

export async function PATCH(req: Request) {
  let body: { id?: unknown; status?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const status = STATUSES.find((s) => s === body?.status);
  if (typeof body?.id !== "string" || !status) {
    return NextResponse.json({ error: "id e status são obrigatórios" }, { status: 400 });
  }
  const found = await updateTicketStatus(body.id.slice(0, 40), status);
  return NextResponse.json({ ok: found }, { status: found ? 200 : 404 });
}
