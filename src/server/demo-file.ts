import "server-only";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { publishAdminEvent } from "@/server/admin-events/event-bus";
import { demoFileEvent } from "@/server/admin-events/demo-file-event";

/**
 * Modo demonstração: guarda o estado em data/*.json para sobreviver a reinícios do servidor local.
 * A pasta data/ fica fora do git. Apagar o arquivo volta ao estado inicial.
 */
const dir = () => join(/* turbopackIgnore: true */ process.cwd(), "data");

export function readDemo<T>(name: string): T | null {
  const file = join(dir(), name);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch (e) {
    console.error(`[demo] ${name} ilegível, começando do zero:`, e instanceof Error ? e.message : e);
    return null;
  }
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();

/** Grava logo depois da última mudança (agrupa várias mudanças seguidas numa escrita só). */
export function writeDemoSoon(name: string, data: () => unknown) {
  const event = demoFileEvent(name);
  if (event) publishAdminEvent(event.topics, event.workspace);
  clearTimeout(timers.get(name));
  timers.set(
    name,
    setTimeout(() => {
      try {
        mkdirSync(dir(), { recursive: true });
        const file = join(dir(), name);
        writeFileSync(`${file}.tmp`, JSON.stringify(data()));
        renameSync(`${file}.tmp`, file);
      } catch (e) {
        console.error(`[demo] não consegui gravar ${name}:`, e instanceof Error ? e.message : e);
      }
    }, 250),
  );
}
