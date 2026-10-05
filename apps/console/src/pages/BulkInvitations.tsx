import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useApi } from "../lib/api";

type Result = { email: string; status: string; link?: string };
export function BulkInvitations({ base, owner, onComplete }: {base: string; owner: boolean; onComplete: () => Promise<void>}) {
  const { api } = useApi();
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
    <label className="block text-sm">Lista de e-mails<textarea aria-label="Lista de e-mails" className="mt-2 block min-h-36 w-full rounded-md border border-border bg-transparent p-3" placeholder="nome@executive.com.br" value={text} disabled={busy} onChange={e => setText(e.target.value)} /></label>
    <label className="block text-sm">Importar lista TXT ou CSV<input type="file" accept=".txt,.csv,text/plain,text/csv" disabled={busy} className="ml-3" onChange={async e => {const f=e.target.files?.[0]; if(f){ if(f.size>100000){setError("Arquivo muito grande; limite de 100 KB.");return;} setText(await f.text());}}} /></label>
    <p className="text-sm">{emails.length} e-mails únicos · {entries.length-emails.length} duplicados removidos</p>
    {invalid.length>0 && <p role="alert" className="text-sm text-destructive">Corrija: {invalid.join(", ")}</p>}
    <div className="flex flex-wrap gap-4"><label className="text-sm">Perfil <select aria-label="Perfil do lote" disabled={busy} value={role} onChange={e=>setRole(e.target.value)} className="rounded border border-border bg-bg p-2"><option value="member">Colaborador</option>{owner && <option value="admin">Administrador</option>}</select></label>
    <label className="text-sm">Entrega <select aria-label="Entrega dos convites" disabled={busy} value={mode} onChange={e=>setMode(e.target.value)} className="rounded border border-border bg-bg p-2"><option value="links">Gerar links individuais</option><option value="email" disabled={!enabled}>Enviar por e-mail</option></select></label></div>
    {!enabled && <p className="text-sm text-fg-muted">O envio por e-mail estará disponível após configurar o SMTP no servidor.</p>}
    {emails.length>0 && <details><summary className="cursor-pointer text-sm">Revisar destinatários</summary><ul className="max-h-52 overflow-auto text-sm">{emails.map(e=><li key={e}>{e} · {role==="admin"?"Administrador":"Colaborador"}</li>)}</ul></details>}
    <Button disabled={busy || !emails.length || emails.length>100 || !!invalid.length || (mode==="email" && !enabled)} onClick={()=>void submit()}>{busy?"Processando…":mode==="email"?`Enviar ${emails.length} convites`:`Gerar ${emails.length} convites`}</Button>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {results.length>0 && <div className="space-y-3"><h3 className="text-sm font-semibold">Resultado do lote</h3><ul className="space-y-2">{results.map(r=><li key={r.email} className="text-sm"><p>{r.email} · {labels[r.status] ?? r.status}</p>{r.link && <input aria-label={`Link para ${r.email}`} readOnly value={r.link} onFocus={e=>e.target.select()} className="w-full rounded border border-border bg-transparent p-2" />}</li>)}</ul><p className="text-xs text-fg-muted">Guarde os links agora: os tokens não são armazenados em texto no servidor.</p></div>}
  </section>;
}
