import { useMemo, useState, useEffect, useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "../components/Field";
import { useApi } from "../lib/api";

type Result = { email: string; status: string; link?: string };
export function BulkInvitations({ base, owner, onComplete }: {base: string; owner: boolean; onComplete: () => Promise<void>}) {
  const { api } = useApi();
  const roleId = useId();
  const modeId = useId();
  const [text, setText] = useState("");
  const [role, setRole] = useState("member");
  const [mode, setMode] = useState("links");
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  useEffect(() => { void api<{email_enabled: boolean}>(`${base}/invitations/config`).then(r => setEnabled(r.email_enabled)).catch(() => setError("Não foi possível consultar o envio de e-mails.")); }, [api, base]);
  const entries = useMemo(() => text.split(/[\s,;]+/).map(e => e.trim().toLowerCase()).filter(Boolean), [text]);
  const emails = [...new Set(entries)];
  const invalid = emails.filter(e => !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@executive\.com\.br$/.test(e));
  const submit = async () => {
    setBusy(true); setError(""); setResults([]);
    try { const r = await api<{data: Result[]}>(`${base}/invitations/bulk`, {method: "POST", body: JSON.stringify({emails, role, mode})}); setResults(r.data); await onComplete(); }
    catch(e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };
  const labels: Record<string,string> = {sent: "Enviado", created: "Link criado", failed: "Falha no envio — pode tentar novamente", member: "Já é membro", pending: "Convite pendente — revogue antes de gerar outro"};
  return <section className="space-y-4 rounded-xl border border-border p-5" aria-labelledby="bulk-title">
    <div><h2 id="bulk-title" className="text-base font-semibold">Convidar colaboradores em lote</h2><p className="text-sm text-fg-muted">Até 100 contas @executive.com.br. Cada convite fica vinculado ao e-mail e expira em 7 dias.</p></div>
    <Field label="Lista de e-mails">
      <Textarea aria-label="Lista de e-mails" className="min-h-36" placeholder="nome@executive.com.br" value={text} disabled={busy} onChange={e => setText(e.target.value)} />
    </Field>
    <Field label="Importar lista TXT ou CSV">
      <Input type="file" accept=".txt,.csv,text/plain,text/csv" disabled={busy} onChange={async e => {const f=e.target.files?.[0]; if(f){ if(f.size>100000){setError("Arquivo muito grande; limite de 100 KB.");return;} setText(await f.text());}}} />
    </Field>
    <p className="text-sm">{emails.length} e-mails únicos · {entries.length-emails.length} duplicados removidos</p>
    {invalid.length>0 && <p role="alert" className="text-sm text-destructive">Corrija: {invalid.join(", ")}</p>}
    <div className="flex flex-wrap gap-4">
      <div className="space-y-1.5">
        <Label htmlFor={roleId}>Perfil</Label>
        <Select disabled={busy} value={role} onValueChange={setRole}>
          <SelectTrigger id={roleId} aria-label="Perfil do lote"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="member">Colaborador</SelectItem>
            {owner && <SelectItem value="admin">Administrador</SelectItem>}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={modeId}>Entrega</Label>
        <Select disabled={busy} value={mode} onValueChange={setMode}>
          <SelectTrigger id={modeId} aria-label="Entrega dos convites"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="links">Gerar links individuais</SelectItem>
            <SelectItem value="email" disabled={!enabled}>Enviar por e-mail</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
    {!enabled && <p className="text-sm text-fg-muted">O envio por e-mail estará disponível após configurar o SMTP no servidor.</p>}
    {emails.length>0 && <details><summary className="cursor-pointer text-sm">Revisar destinatários</summary><ul className="max-h-52 overflow-auto text-sm">{emails.map(e=><li key={e}>{e} · {role==="admin"?"Administrador":"Colaborador"}</li>)}</ul></details>}
    <Button disabled={busy || !emails.length || emails.length>100 || !!invalid.length || (mode==="email" && !enabled)} onClick={()=>void submit()}>{busy?"Processando…":mode==="email"?`Enviar ${emails.length} convites`:`Gerar ${emails.length} convites`}</Button>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {results.length>0 && <div className="space-y-3"><h3 className="text-sm font-semibold">Resultado do lote</h3><ul className="space-y-2">{results.map(r=><li key={r.email} className="text-sm"><p>{r.email} · {labels[r.status] ?? r.status}</p>{r.link && <Input aria-label={`Link para ${r.email}`} readOnly value={r.link} onFocus={e=>e.target.select()} />}</li>)}</ul><p className="text-xs text-fg-muted">Guarde os links agora: os tokens não são armazenados em texto no servidor.</p></div>}
  </section>;
}
