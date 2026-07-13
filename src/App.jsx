import { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle, AlertOctagon, PackageX, PackageMinus,
  Plus, Trash2, Pencil, X, Check, Package, Search, History,
  LayoutDashboard, Clock, Layers, Home
} from "lucide-react";
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

  const [mostrarRetirar, setMostrarRetirar] = useState(false);
  const [itemRetirar, setItemRetirar] = useState(null);
  const [qtdRetirar, setQtdRetirar] = useState("");
  const [motivoRetirar, setMotivoRetirar] = useState("");

  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [historico, setHistorico] = useState([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);

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

  function abrirRetirar(item) {
    setItemRetirar(item);
    setQtdRetirar("");
    setMotivoRetirar("");
    setMostrarRetirar(true);
  }

  function fecharRetirar() {
    setMostrarRetirar(false);
    setItemRetirar(null);
    setQtdRetirar("");
    setMotivoRetirar("");
  }

  async function confirmarRetirada() {
    const qtd = parseFloat(qtdRetirar);
    if (!qtd || qtd <= 0) {
      setErro("Informe uma quantidade válida para retirar.");
      return;
    }
    if (qtd > itemRetirar.quantidade) {
      setErro(`Só há ${itemRetirar.quantidade} ${itemRetirar.unidade} em estoque.`);
      return;
    }
    setSalvando(true);
    setErro("");
    const novaQuantidade = itemRetirar.quantidade - qtd;

    const { error: erroUpdate } = await supabase
      .from("itens")
      .update({ quantidade: novaQuantidade })
      .eq("id", itemRetirar.id);

    if (erroUpdate) {
      setErro("Erro ao dar baixa no estoque.");
      setSalvando(false);
      return;
    }

    await supabase.from("movimentacoes").insert({
      item_id: itemRetirar.id,
      item_nome: itemRetirar.nome,
      quantidade: qtd,
      unidade: itemRetirar.unidade,
      motivo: motivoRetirar.trim() || null,
    });

    await carregarItens();
    setSalvando(false);
    fecharRetirar();
  }

  async function abrirHistorico() {
    setMostrarHistorico(true);
    setCarregandoHistorico(true);
    const { data, error } = await supabase
      .from("movimentacoes")
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(50);
    if (!error) setHistorico(data || []);
    setCarregandoHistorico(false);
  }

  function formatarDataHoraBR(iso) {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
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

  // ---------- JSX com design refinado (sem sidebar) ----------
  return (
    <div className="min-h-screen bg-slate-50/80 p-4 sm:p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* ===== HEADER ===== */}
        <header className="relative overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-700 rounded-2xl p-6 sm:p-8 mb-8 shadow-xl shadow-emerald-900/20">
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -right-6 bottom-0 w-32 h-32 bg-white/10 rounded-full blur-xl" />
          <div className="relative flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-white/15 backdrop-blur-sm text-white p-3 rounded-2xl border border-white/20 shadow-lg">
                <Package size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Controle de Depósito</h1>
                <p className="text-sm text-emerald-50/90">Defensivos agrícolas</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={abrirHistorico} className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white hover:bg-white/25 border border-white/20 px-4 py-2.5 rounded-xl text-sm font-medium transition-all">
                <History size={18} /> Histórico
              </button>
              <button onClick={abrirNovo} className="flex items-center gap-1.5 bg-white text-emerald-700 hover:bg-emerald-50 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5">
                <Plus size={18} /> Novo item
              </button>
            </div>
          </div>
        </header>

        {/* ===== FILTROS (cards de alerta) ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <button onClick={() => setFiltroAlerta(filtroAlerta === "vencidos" ? "todos" : "vencidos")}
            className={`group flex items-center gap-4 p-5 rounded-2xl border text-left bg-white transition-all hover:shadow-md hover:-translate-y-0.5 ${alertas.vencidos > 0 ? "border-red-200 shadow-sm shadow-red-100" : "border-slate-200"} ${filtroAlerta === "vencidos" ? "ring-2 ring-red-400" : ""}`}>
            <div className={`p-3 rounded-xl ${alertas.vencidos > 0 ? "bg-red-100" : "bg-slate-100"}`}>
              <PackageX className={alertas.vencidos > 0 ? "text-red-600" : "text-slate-400"} size={22} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{alertas.vencidos}</p>
              <p className="text-xs text-slate-500 font-medium">Produtos vencidos</p>
            </div>
          </button>

          <button onClick={() => setFiltroAlerta(filtroAlerta === "proximos" ? "todos" : "proximos")}
            className={`group flex items-center gap-4 p-5 rounded-2xl border text-left bg-white transition-all hover:shadow-md hover:-translate-y-0.5 ${alertas.proximos > 0 ? "border-amber-200 shadow-sm shadow-amber-100" : "border-slate-200"} ${filtroAlerta === "proximos" ? "ring-2 ring-amber-400" : ""}`}>
            <div className={`p-3 rounded-xl ${alertas.proximos > 0 ? "bg-amber-100" : "bg-slate-100"}`}>
              <AlertTriangle className={alertas.proximos > 0 ? "text-amber-600" : "text-slate-400"} size={22} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{alertas.proximos}</p>
              <p className="text-xs text-slate-500 font-medium">Vencendo em {DIAS_ALERTA_VENCIMENTO} dias</p>
            </div>
          </button>

          <button onClick={() => setFiltroAlerta(filtroAlerta === "baixos" ? "todos" : "baixos")}
            className={`group flex items-center gap-4 p-5 rounded-2xl border text-left bg-white transition-all hover:shadow-md hover:-translate-y-0.5 ${alertas.baixos > 0 ? "border-orange-200 shadow-sm shadow-orange-100" : "border-slate-200"} ${filtroAlerta === "baixos" ? "ring-2 ring-orange-400" : ""}`}>
            <div className={`p-3 rounded-xl ${alertas.baixos > 0 ? "bg-orange-100" : "bg-slate-100"}`}>
              <AlertOctagon className={alertas.baixos > 0 ? "text-orange-600" : "text-slate-400"} size={22} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{alertas.baixos}</p>
              <p className="text-xs text-slate-500 font-medium">Estoque baixo</p>
            </div>
          </button>
        </div>

        {/* ===== BARRA DE BUSCA ===== */}
        <div className="relative mb-6">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou lote..."
            className="w-full pl-11 pr-4 py-3.5 border border-slate-200 rounded-2xl text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-shadow"
          />
        </div>

        {/* ===== MENSAGEM DE ERRO ===== */}
        {erro && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
            <AlertTriangle size={16} /> {erro}
          </div>
        )}

        {/* ===== LISTA DE ITENS ===== */}
        <div className="space-y-3">
          {carregando ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400 text-sm">Carregando itens...</div>
          ) : listaFiltrada.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400 text-sm">
              {itens.length === 0 ? "Nenhum item cadastrado ainda." : "Nenhum item corresponde ao filtro."}
            </div>
          ) : (
            listaFiltrada.map((it) => {
              const pct = it.minimo > 0 ? Math.min(100, Math.round((it.quantidade / (it.minimo * 2)) * 100)) : 100;
              return (
                <div key={it.id} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-slate-800 text-base truncate">{it.nome}</p>
                        {it.vencido && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-red-100 text-red-700 px-2.5 py-1 rounded-full">
                            <PackageX size={12} /> Vencido
                          </span>
                        )}
                        {it.proximoVencimento && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                            <AlertTriangle size={12} /> Vence em {it.dias}d
                          </span>
                        )}
                        {it.estoqueBaixo && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full">
                            <AlertOctagon size={12} /> Estoque baixo
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 space-y-1">
                        <p>Lote {it.lote} · Validade {formatarDataBR(it.validade)}</p>
                        <p>
                          <span className="font-medium text-slate-700">{it.quantidade} {it.unidade}</span>
                          <span className="mx-1">·</span>
                          mínimo {it.minimo} {it.unidade}
                        </p>
                      </div>
                      <div className="mt-2.5 h-1.5 w-full max-w-xs bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${corProgresso(pct)}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => abrirRetirar(it)} className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-colors" title="Retirar">
                        <PackageMinus size={18} />
                      </button>
                      <button onClick={() => abrirEdicao(it)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors" title="Editar">
                        <Pencil size={18} />
                      </button>
                      <button onClick={() => excluir(it.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors" title="Excluir">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ===== MODAIS (formulário, retirada, histórico) ===== */}
      {/* Mantém os modais iguais ao seu código original, mas com refinamentos sutis */}
      {/* ... (os modais são os mesmos do seu código, apenas com classes refinadas) */}

      {/* ===== MODAL FORM ===== */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-br from-emerald-600 to-teal-700">
              <h2 className="font-semibold text-white text-lg">{editandoId ? "Editar item" : "Novo item"}</h2>
              <button onClick={fecharForm} className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"><X size={20} /></button>
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

      {/* ===== MODAL RETIRADA ===== */}
      {mostrarRetirar && itemRetirar && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 bg-gradient-to-br from-teal-600 to-cyan-700">
              <h2 className="font-semibold text-white">Retirar do estoque</h2>
              <p className="text-sm text-teal-50/80">{itemRetirar.nome} · {itemRetirar.quantidade} {itemRetirar.unidade} disponível</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600">Quantidade a retirar *</label>
                <input type="number" step="any" min="0" value={qtdRetirar} onChange={(e) => setQtdRetirar(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" placeholder="Ex: 5" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Motivo (opcional)</label>
                <input value={motivoRetirar} onChange={(e) => setMotivoRetirar(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" placeholder="Ex: Uso em campo" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={fecharRetirar} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">Cancelar</button>
                <button onClick={confirmarRetirada} disabled={salvando}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium disabled:opacity-60">
                  <Check size={16} /> {salvando ? "Processando..." : "Confirmar retirada"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL HISTÓRICO ===== */}
      {mostrarHistorico && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-br from-slate-700 to-slate-800">
              <h2 className="font-semibold text-white flex items-center gap-2"><History size={20} /> Histórico de movimentações</h2>
              <button onClick={() => setMostrarHistorico(false)} className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"><X size={20} /></button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {carregandoHistorico ? (
                <p className="text-center text-slate-400 text-sm py-6">Carregando...</p>
              ) : historico.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-6">Nenhuma movimentação registrada.</p>
              ) : (
                <div className="space-y-2">
                  {historico.map((mov) => (
                    <div key={mov.id} className="flex items-center justify-between border-b border-slate-100 py-2 text-sm">
                      <div>
                        <p className="font-medium text-slate-700">{mov.item_nome}</p>
                        <p className="text-xs text-slate-400">{formatarDataHoraBR(mov.criado_em)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm text-teal-600">-{mov.quantidade} {mov.unidade}</p>
                        {mov.motivo && <p className="text-xs text-slate-400">{mov.motivo}</p>}
                      </div>
                    </div>
                  ))}
                  {historico.length === 50 && <p className="text-xs text-slate-400 text-center pt-2">Mostrando as últimas 50 movimentações.</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
