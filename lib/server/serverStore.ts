import { neon } from "@neondatabase/serverless";
import { SEED_EVENTS, SEED_TICKETS } from "../telemetry";
import type { AnalyticsEvent, HandoffTicket, HandoffTicketStatus } from "../types";

const MAX_ROWS = 500;
const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

export const storageMode = sql ? "postgres" : "memoria";

// ponytail: sem DATABASE_URL os dados ficam na memoria da instancia e zeram no cold start
const memEvents: AnalyticsEvent[] = [];
const memTickets: HandoffTicket[] = [];

let schema: Promise<unknown> | null = null;
// ponytail: CREATE IF NOT EXISTS na primeira chamada; migracoes versionadas quando o schema mudar
function ready() {
  schema ??= Promise.all([
    sql!`CREATE TABLE IF NOT EXISTS eventos (id text PRIMARY KEY, store_id text NOT NULL, type text NOT NULL, ts bigint NOT NULL, data jsonb NOT NULL)`,
    sql!`CREATE TABLE IF NOT EXISTS chamados (id text PRIMARY KEY, store_id text NOT NULL, status text NOT NULL, ts bigint NOT NULL, data jsonb NOT NULL)`,
  ]).catch((err) => {
    schema = null;
    throw err;
  });
  return schema;
}

/** Sem nenhum dado real ainda, devolve o exemplo marcado como demo. */
function withDemo<T>(rows: T[], seed: T[]) {
  return rows.length > 0 ? { rows, demo: false } : { rows: seed, demo: true };
}

export async function saveEvent(event: AnalyticsEvent): Promise<void> {
  if (!sql) {
    memEvents.unshift(event);
    memEvents.splice(MAX_ROWS);
    return;
  }
  await ready();
  await sql`INSERT INTO eventos (id, store_id, type, ts, data)
    VALUES (${event.id}, ${event.storeId}, ${event.type}, ${event.timestamp}, ${JSON.stringify(event)}::jsonb)
    ON CONFLICT (id) DO NOTHING`;
}

export async function listEvents() {
  if (!sql) return withDemo(memEvents, SEED_EVENTS);
  await ready();
  const rows = await sql`SELECT data FROM eventos ORDER BY ts DESC LIMIT ${MAX_ROWS}`;
  return withDemo(rows.map((r) => r.data as AnalyticsEvent), SEED_EVENTS);
}

export async function saveTicket(ticket: HandoffTicket): Promise<void> {
  if (!sql) {
    memTickets.unshift(ticket);
    memTickets.splice(MAX_ROWS);
    return;
  }
  await ready();
  await sql`INSERT INTO chamados (id, store_id, status, ts, data)
    VALUES (${ticket.id}, ${ticket.storeId}, ${ticket.status}, ${ticket.createdAt}, ${JSON.stringify(ticket)}::jsonb)
    ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, data = EXCLUDED.data`;
}

export async function listTickets() {
  if (!sql) return withDemo(memTickets, SEED_TICKETS);
  await ready();
  const rows = await sql`SELECT data FROM chamados ORDER BY ts DESC LIMIT ${MAX_ROWS}`;
  return withDemo(rows.map((r) => r.data as HandoffTicket), SEED_TICKETS);
}

/** false quando o chamado nao existe (ex.: chamado de exemplo). */
export async function updateTicketStatus(id: string, status: HandoffTicketStatus): Promise<boolean> {
  if (!sql) {
    const ticket = memTickets.find((t) => t.id === id);
    if (ticket) ticket.status = status;
    return !!ticket;
  }
  await ready();
  const rows = await sql`UPDATE chamados
    SET status = ${status}, data = jsonb_set(data, '{status}', to_jsonb(${status}::text))
    WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}
