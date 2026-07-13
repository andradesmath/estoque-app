import { useState, useEffect, useMemo } from "react";
import { AlertTriangle, AlertOctagon, PackageX, Plus, Trash2, Pencil, X, Check, Package, Search } from "lucide-react";
import { supabase } from "./supabaseClient";

const DIAS_ALERTA_VENCIMENTO = 90;
const UNIDADES = ["L", "mL", "kg", "g", "un"];
const vazio = { nome: "", lote: "", validade: "", quantidade: "", unidade: "L", minimo: "" };

function diasAte(dataStr) {
  if (!dataStr) return null;
  const [ano, mes, dia] = dataStr.split("-").map(Number);
  const alvo = new Date(ano, mes - 1, dia);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  alvo.setHours(0, 0, 0, 0);
  return Math.round((alvo - hoje) / 86400000);
}

function formatarDataBR(str) {
  if (!str) return "-";
  const [ano, mes, dia] = str.split("-");
  return `${dia}/${mes}/${ano}`;
}

function corProgresso(pct) {
  if (pct <= 25) return "bg-red-500";
  if (pct <= 60) return "bg-amber-500";
  return "bg-emerald-500";
}

export default function App() {
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(vazio);
  const [busca, setBusca] = useState("");
  const [filtroAlerta, setFiltroAlerta] = useState("todos");

  useEffect(() => { carregarItens(); }, []);

  async function carregarItens() {
    setCarregando(true);
    const { data, error } = await supabase.from("itens").select("*").order("validade", { ascending: true });
    if (error) setErro("Erro ao carregar itens.");
    else setItens(data || []);
    setCarregando(false);
  }

  function abrirNovo() { setForm(vazio); setEditandoId(null); setMostrarForm(true); }

  function abrirEdicao(item) {
    setForm({
      nome: item.nome, lote: item.lote, validade: item.validade,
      quantidade: String(item.quantidade), unidade: item.unidade, minimo: String(item.minimo),
    });
    setEditandoId(item.id);
    setMostrarForm(true);
  }

  function fecharForm() { setMostrarForm(false); setForm(vazio); setEditandoId(null); }

  async function salvarForm() {
    if (!form.nome.trim() || !form.lote.trim() || !form.validade || form.quantidade === "" || form.minimo === "") {
      setErro("Preencha todos os campos obrigatórios.");
      return;
    }
    setSalvando(true);
    setErro("");
    const dados = {
      nome: form.nome.trim(), lote: form.lote.trim(), validade: form.validade,
      quantidade: parseFloat(form.quantidade), unidade: form.unidade, minimo: parseFloat(form.minimo),
    };
    const { error } = editandoId
      ? await supabase.from("itens").update(dados).eq("id", editandoId)
      : await supabase.from("itens").insert(dados);
    if (error) setErro("Erro ao salvar.");
    else { await carregarItens(); fecharForm(); }
    setSalvando(false);
  }

  async function excluir(id) {
    if (!window.confirm("Excluir este item do depósito?")) return;
    const { error } = await supabase.from("itens").delete().eq("id", id);
    if (error) setErro("Erro ao excluir.");
    else carregarItens();
  }

  const itensComStatus = useMemo(() => itens.map((it) => {
    const dias = diasAte(it.validade);
    const vencido = dias !== null && dias < 0;
    const proximoVencimento = !vencido && dias !== null && dias <= DIAS_ALERTA_VENCIMENTO;
    const estoqueBaixo = it.quantidade <= it.minimo;
    return { ...it, dias, vencido, proximoVencimento, estoqueBaixo };
  }), [itens]);

  const alertas = useMemo(() => ({
    vencidos: itensComStatus.filter((i) => i.vencido).length,
    proximos: itensComStatus.filter((i) => i.proximoVencimento).length,
    baixos: itensComStatus.filter((i) => i.estoqueBaixo).length,
  }), [itensComStatus]);

  const listaFiltrada = useMemo(() => {
    let lista = itensComStatus;
    if (filtroAlerta === "vencidos") lista = lista.filter((i) => i.vencido);
    if (filtroAlerta === "proximos") lista = lista.filter((i) => i.proximoVencimento);
    if (filtroAlerta === "baixos") lista = lista.filter((i) => i.estoqueBaixo);
    if (busca.trim()) {
      const b = busca.trim().toLowerCase();
      lista = lista.filter((i) => i.nome.toLowerCase().includes(b) || i.lote.toLowerCase().includes(b));
    }
    return [...lista].sort((a, b) => (a.dias ?? 9999) - (b.dias ?? 9999));
  }, [itensComStatus, filtroAlerta, busca]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-600 text-white p-2 rounded-lg"><Package size={22} /></div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Controle de Depósito</h1>
              <p className="text-sm text-slate-500">Defensivos agrícolas</p>
            </div>
          </div>
          <button onClick={abrirNovo} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm font-medium">
            <Plus size={18} /> Novo item
          </button>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <button onClick={() => setFiltroAlerta(filtroAlerta === "vencidos" ? "todos" : "vencidos")}
            className={`flex items-center gap-3 p-4 rounded-xl border text-left ${alertas.vencidos > 0 ? "bg-red-50 border-red-200" : "bg-white border-slate-200"} ${filtroAlerta === "vencidos" ? "ring-2 ring-red-400" : ""}`}>
            <PackageX className={alertas.vencidos > 0 ? "text-red-600" : "text-slate-300"} size={24} />
            <div><p className="text-2xl font-bold text-slate-800">{alertas.vencidos}</p><p className="text-xs text-slate-500">Produtos vencidos</p></div>
          </button>
          <button onClick={() => setFiltroAlerta(filtroAlerta === "proximos" ? "todos" : "proximos")}
            className={`flex items-center gap-3 p-4 rounded-xl border text-left ${alertas.proximos > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200"} ${filtroAlerta === "proximos" ? "ring-2 ring-amber-400" : ""}`}>
            <AlertTriangle className={alertas.proximos > 0 ? "text-amber-600" : "text-slate-300"} size={24} />
            <div><p className="text-2xl font-bold text-slate-800">{alertas.proximos}</p><p className="text-xs text-slate-500">Vencendo em {DIAS_ALERTA_VENCIMENTO} dias</p></div>
          </button>
          <button onClick={() => setFiltroAlerta(filtroAlerta === "baixos" ? "todos" : "baixos")}
            className={`flex items-center gap-3 p-4 rounded-xl border text-left ${alertas.baixos > 0 ? "bg-orange-50 border-orange-200" : "bg-white border-slate-200"} ${filtroAlerta === "baixos" ? "ring-2 ring-orange-400" : ""}`}>
            <AlertOctagon className={alertas.baixos > 0 ? "text-orange-600" : "text-slate-300"} size={24} />
            <div><p className="text-2xl font-bold text-slate-800">{alertas.baixos}</p><p className="text-xs text-slate-500">Estoque baixo</p></div>
          </button>
        </div>

        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou lote..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>

        {erro && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">{erro}</div>}

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {carregando ? (
            <div className="p-8 text-center text-slate-400 text-sm">Carregando itens...</div>
          ) : listaFiltrada.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">{itens.length === 0 ? "Nenhum item cadastrado ainda." : "Nenhum item corresponde ao filtro."}</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {listaFiltrada.map((it) => (
                <div key={it.id} className="flex items-center justify-between gap-3 p-4 hover:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-slate-800 truncate">{it.nome}</p>
                      {it.vencido && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Vencido</span>}
                      {it.proximoVencimento && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Vence em {it.dias}d</span>}
                      {it.estoqueBaixo && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">Estoque baixo</span>}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Lote {it.lote} · Validade {formatarDataBR(it.validade)} · {it.quantidade} {it.unidade} (mín. {it.minimo} {it.unidade})</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => abrirEdicao(it)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"><Pencil size={16} /></button>
                    <button onClick={() => excluir(it.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {mostrarForm && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">{editandoId ? "Editar item" : "Novo item"}</h2>
              <button onClick={fecharForm} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600">Nome do produto *</label>
                <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" placeholder="Ex: Glifosato 480" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Lote *</label>
                  <input value={form.lote} onChange={(e) => setForm({ ...form, lote: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" placeholder="Ex: L2024-08" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Validade *</label>
                  <input type="date" value={form.validade} onChange={(e) => setForm({ ...form, validade: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Quantidade *</label>
                  <input type="number" step="any" min="0" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Unidade</label>
                  <select value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                    {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Mínimo *</label>
                  <input type="number" step="any" min="0" value={form.minimo} onChange={(e) => setForm({ ...form, minimo: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={fecharForm} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">Cancelar</button>
                <button onClick={salvarForm} disabled={salvando}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-60">
                  <Check size={16} /> {salvando ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}