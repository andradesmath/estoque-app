import { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle, AlertOctagon, PackageX, PackageMinus,
  ArrowLeftRight, Plus, Trash2, Pencil, X, Check,
  Search, History, MapPin, LogOut, ChevronLeft,
  Sprout
} from "lucide-react";
import { supabase } from "./supabaseClient";

const DIAS_ALERTA_VENCIMENTO = 90;
const UNIDADES = ["L", "mL", "kg", "g", "un"];
const LOCAIS = [
  "Casa de Adubo - Depósito",
  "Casa de Adubo - Balcão",
  "Porteira - Depósito",
  "Porteira - Balcão",
  "Sérgio - Depósito",
  "Luciano - Depósito",
  "Piatã - Depósito",
  "Piatã - Balcão",
];
const MOTIVOS_SAIDA = [
  "Aplicação",
  "Perda por Deterioração",
  "Perda por Validade",
  "Não Localizado",
  "Vendido",
  "Outro"
];

const vazio = {
  produto_id: "",
  nome: "",
  lote: "",
  validade: "",
  quantidade: "",
  unidade: "L",
  minimo: "",
  local: LOCAIS[2],
};

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

function formatarDataHoraBR(iso) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function corProgresso(pct) {
  if (pct <= 25) return "bg-red-500";
  if (pct <= 60) return "bg-amber-500";
  return "bg-green-600";
}

function getStatusInfo(item) {
  if (item.vencido) return { label: "Vencido", class: "bg-red-100 text-red-700 border-red-300" };
  if (item.proximoVencimento) return { label: `Vence em ${item.dias}d`, class: "bg-amber-100 text-amber-700 border-amber-300" };
  if (item.estoqueBaixo) return { label: "Estoque baixo", class: "bg-orange-100 text-orange-700 border-orange-300" };
  return { label: "OK", class: "bg-green-100 text-green-700 border-green-300" };
}

export default function Setor({ sessao, categoria, onVoltar }) {
  // ===== ESTADOS =====
  const [itens, setItens] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [estoqueTotal, setEstoqueTotal] = useState([]);
  const [estoquePorLocal, setEstoquePorLocal] = useState([]);
  const [totalProduto, setTotalProduto] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(vazio);

  const [busca, setBusca] = useState("");
  const [filtroAlerta, setFiltroAlerta] = useState("todos");
  const [filtroLocal, setFiltroLocal] = useState("todos");

  const [mostrarRetirar, setMostrarRetirar] = useState(false);
  const [itemRetirar, setItemRetirar] = useState(null);
  const [qtdRetirar, setQtdRetirar] = useState("");
  const [motivoRetirar, setMotivoRetirar] = useState("");
  const [motivoPersonalizado, setMotivoPersonalizado] = useState("");

  const [mostrarTransferir, setMostrarTransferir] = useState(false);
  const [itemTransferir, setItemTransferir] = useState(null);
  const [localDestino, setLocalDestino] = useState("");
  const [qtdTransferir, setQtdTransferir] = useState("");
  const [motivoTransferir, setMotivoTransferir] = useState("");

  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [historico, setHistorico] = useState([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [filtroHistorico, setFiltroHistorico] = useState('todos');

  // ============================================================
  // CARREGAR DADOS DA CATEGORIA
  // ============================================================
  useEffect(() => {
    if (categoria) {
      carregarProdutos();
      carregarItens();
      carregarEstoqueTotal();
    }
  }, [categoria]);

  useEffect(() => {
    if (form.produto_id) {
      carregarQuantidadesProduto(form.produto_id);
    } else {
      setEstoquePorLocal([]);
      setTotalProduto(0);
    }
  }, [form.produto_id]);

  async function carregarProdutos() {
    const { data, error } = await supabase
      .from("produtos")
      .select("*")
      .eq("categoria_id", categoria.id)
      .order("nome", { ascending: true });
    if (!error) setProdutos(data || []);
  }

  async function carregarItens() {
    setCarregando(true);
    const { data, error } = await supabase
      .from("itens")
      .select(`
        *,
        produtos!inner (categoria_id)
      `)
      .eq("produtos.categoria_id", categoria.id)
      .order("validade", { ascending: true });
    if (error) {
      console.error(error);
      setErro("Erro ao carregar itens.");
      setItens([]);
    } else {
      setItens(data || []);
    }
    setCarregando(false);
  }

  async function carregarEstoqueTotal() {
    const { data, error } = await supabase
      .from("estoque_total_produto")
      .select("*")
      .eq("categoria", categoria.nome)
      .order("nome", { ascending: true });
    if (!error) setEstoqueTotal(data || []);
  }

  async function carregarQuantidadesProduto(produtoId) {
    if (!produtoId) return;
    const { data: localData } = await supabase
      .from("estoque_por_local")
      .select("*")
      .eq("produto_id", produtoId);
    if (localData) setEstoquePorLocal(localData || []);

    const { data: totalData } = await supabase
      .from("estoque_total_produto")
      .select("quantidade_total")
      .eq("produto_id", produtoId)
      .maybeSingle();
    setTotalProduto(totalData?.quantidade_total || 0);
  }

  // ============================================================
  // LOGOUT
  // ============================================================
  async function handleLogout() {
    await supabase.auth.signOut();
  }

  // ============================================================
  // FORMULÁRIO
  // ============================================================
  function abrirNovo() {
    setForm({ ...vazio });
    setEditandoId(null);
    setMostrarForm(true);
  }

  function abrirEdicao(item) {
    setForm({
      produto_id: item.produto_id || "",
      nome: item.nome,
      lote: item.lote,
      validade: item.validade,
      quantidade: String(item.quantidade),
      unidade: item.unidade,
      minimo: String(item.minimo),
      local: item.local || LOCAIS[2],
    });
    setEditandoId(item.id);
    setMostrarForm(true);
  }

  function fecharForm() {
    setMostrarForm(false);
    setForm(vazio);
    setEditandoId(null);
    setEstoquePorLocal([]);
    setTotalProduto(0);
  }

  function handleProdutoSelecionado(produtoId) {
    const produto = produtos.find(p => p.id === produtoId);
    if (produto) {
      setForm({
        ...form,
        produto_id: produto.id,
        nome: produto.nome,
      });
    } else {
      setForm({ ...form, produto_id: "", nome: "" });
    }
  }

  async function salvarForm() {
    if (
      !form.produto_id ||
      !form.lote.trim() ||
      !form.validade ||
      form.quantidade === "" ||
      form.minimo === "" ||
      !form.local
    ) {
      setErro("Preencha todos os campos obrigatórios.");
      return;
    }
    setSalvando(true);
    setErro("");
    const dados = {
      produto_id: form.produto_id,
      nome: form.nome.trim(),
      lote: form.lote.trim(),
      validade: form.validade,
      quantidade: parseFloat(form.quantidade),
      unidade: form.unidade,
      minimo: parseFloat(form.minimo),
      local: form.local,
      updated_by: sessao.user.id,
    };
    let error;
    if (editandoId) {
      const { error: e } = await supabase
        .from("itens")
        .update(dados)
        .eq("id", editandoId);
      error = e;
    } else {
      dados.created_by = sessao.user.id;
      const { error: e } = await supabase.from("itens").insert(dados);
      error = e;
    }
    if (error) setErro("Erro ao salvar.");
    else {
      await carregarItens();
      await carregarEstoqueTotal();
      fecharForm();
    }
    setSalvando(false);
  }

  async function excluir(id) {
    if (!window.confirm("Excluir este item do depósito?")) return;
    const { error } = await supabase.from("itens").delete().eq("id", id);
    if (error) setErro("Erro ao excluir.");
    else {
      await carregarItens();
      await carregarEstoqueTotal();
    }
  }

  // ============================================================
  // RETIRADA
  // ============================================================
  function abrirRetirar(item) {
    setItemRetirar(item);
    setQtdRetirar("");
    setMotivoRetirar("");
    setMotivoPersonalizado("");
    setErro("");
    setMostrarRetirar(true);
  }

  function fecharRetirar() {
    setMostrarRetirar(false);
    setItemRetirar(null);
    setQtdRetirar("");
    setMotivoRetirar("");
    setMotivoPersonalizado("");
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

    let motivoFinal = motivoRetirar;
    if (motivoRetirar === "Outro") {
      if (!motivoPersonalizado.trim()) {
        setErro("Por favor, descreva o motivo.");
        return;
      }
      motivoFinal = motivoPersonalizado.trim();
    }

    setSalvando(true);
    setErro("");
    const { error: erroUpdate } = await supabase
      .from("itens")
      .update({
        quantidade: itemRetirar.quantidade - qtd,
        updated_by: sessao.user.id
      })
      .eq("id", itemRetirar.id);

    if (erroUpdate) {
      setErro("Erro ao dar baixa no estoque.");
      setSalvando(false);
      return;
    }

    await supabase.from("movimentacoes").insert({
      item_id: itemRetirar.id,
      item_nome: itemRetirar.nome,
      tipo: "saida",
      quantidade: qtd,
      unidade: itemRetirar.unidade,
      local_origem: itemRetirar.local,
      local_destino: null,
      motivo: motivoFinal,
      created_by: sessao.user.id,
    });

    await carregarItens();
    await carregarEstoqueTotal();
    setSalvando(false);
    fecharRetirar();
  }

  // ============================================================
  // TRANSFERÊNCIA
  // ============================================================
  function abrirTransferir(item) {
    setItemTransferir(item);
    setLocalDestino(LOCAIS.find((l) => l !== item.local) || "");
    setQtdTransferir("");
    setMotivoTransferir("");
    setErro("");
    setMostrarTransferir(true);
    if (item.produto_id) {
      carregarEstoquePorProduto(item.produto_id);
    }
  }

  async function carregarEstoquePorProduto(produtoId) {
    if (!produtoId) return;
    const { data } = await supabase
      .from("estoque_por_local")
      .select("*")
      .eq("produto_id", produtoId);
    if (data) setEstoquePorLocal(data || []);
  }

  function fecharTransferir() {
    setMostrarTransferir(false);
    setItemTransferir(null);
    setLocalDestino("");
    setQtdTransferir("");
    setMotivoTransferir("");
    setEstoquePorLocal([]);
  }

  async function confirmarTransferencia() {
    const qtd = parseFloat(qtdTransferir);
    if (!qtd || qtd <= 0) {
      setErro("Informe uma quantidade válida para transferir.");
      return;
    }
    if (qtd > itemTransferir.quantidade) {
      setErro(`Só há ${itemTransferir.quantidade} ${itemTransferir.unidade} disponível.`);
      return;
    }
    if (!localDestino || localDestino === itemTransferir.local) {
      setErro("Escolha um local de destino diferente do atual.");
      return;
    }

    setSalvando(true);
    setErro("");

    const { error: erroOrigem } = await supabase
      .from("itens")
      .update({
        quantidade: itemTransferir.quantidade - qtd,
        updated_by: sessao.user.id
      })
      .eq("id", itemTransferir.id);

    if (erroOrigem) {
      setErro("Erro ao atualizar o local de origem.");
      setSalvando(false);
      return;
    }

    const { data: existente } = await supabase
      .from("itens")
      .select("*")
      .eq("nome", itemTransferir.nome)
      .eq("lote", itemTransferir.lote)
      .eq("local", localDestino)
      .maybeSingle();

    let erroDestino = null;
    if (existente) {
      const r = await supabase
        .from("itens")
        .update({
          quantidade: existente.quantidade + qtd,
          updated_by: sessao.user.id
        })
        .eq("id", existente.id);
      erroDestino = r.error;
    } else {
      const r = await supabase.from("itens").insert({
        produto_id: itemTransferir.produto_id,
        nome: itemTransferir.nome,
        lote: itemTransferir.lote,
        validade: itemTransferir.validade,
        quantidade: qtd,
        unidade: itemTransferir.unidade,
        minimo: itemTransferir.minimo,
        local: localDestino,
        created_by: sessao.user.id,
        updated_by: sessao.user.id,
      });
      erroDestino = r.error;
    }

    if (erroDestino) {
      setErro("Erro ao criar/atualizar item no destino.");
      setSalvando(false);
      return;
    }

    await supabase.from("movimentacoes").insert({
      item_id: itemTransferir.id,
      item_nome: itemTransferir.nome,
      tipo: "transferencia",
      quantidade: qtd,
      unidade: itemTransferir.unidade,
      local_origem: itemTransferir.local,
      local_destino: localDestino,
      motivo: motivoTransferir.trim() || null,
      created_by: sessao.user.id,
      produto_id: itemTransferir.produto_id,
    });

    await carregarItens();
    await carregarEstoqueTotal();
    setSalvando(false);
    fecharTransferir();
  }

  // ============================================================
  // HISTÓRICO
  // ============================================================
  async function abrirHistorico(filtro = 'todos') {
    setMostrarHistorico(true);
    setCarregandoHistorico(true);

    let query = supabase
      .from("movimentacoes")
      .select(`
        *,
        profiles!created_by (nome),
        itens!inner (
          produtos!inner (categoria_id)
        )
      `)
      .eq("itens.produtos.categoria_id", categoria.id)
      .order("criado_em", { ascending: false })
      .limit(50);

    if (filtro !== 'todos') {
      query = query.eq('tipo', filtro);
    }

    const { data, error } = await query;
    if (!error) setHistorico(data || []);
    setCarregandoHistorico(false);
  }

  // ============================================================
  // CÁLCULOS
  // ============================================================
  const itensComStatus = useMemo(
    () =>
      itens.map((it) => {
        const dias = diasAte(it.validade);
        const vencido = dias !== null && dias < 0;
        const proximoVencimento = !vencido && dias !== null && dias <= DIAS_ALERTA_VENCIMENTO;
        const estoqueBaixo = it.quantidade <= it.minimo;
        return { ...it, dias, vencido, proximoVencimento, estoqueBaixo };
      }),
    [itens]
  );

  const alertas = useMemo(
    () => ({
      vencidos: itensComStatus.filter((i) => i.vencido).length,
      proximos: itensComStatus.filter((i) => i.proximoVencimento).length,
      baixos: itensComStatus.filter((i) => i.estoqueBaixo).length,
    }),
    [itensComStatus]
  );

  const listaFiltrada = useMemo(() => {
    let lista = itensComStatus;
    if (filtroAlerta === "vencidos") lista = lista.filter((i) => i.vencido);
    if (filtroAlerta === "proximos") lista = lista.filter((i) => i.proximoVencimento);
    if (filtroAlerta === "baixos") lista = lista.filter((i) => i.estoqueBaixo);
    if (filtroLocal !== "todos") lista = lista.filter((i) => i.local === filtroLocal);
    if (busca.trim()) {
      const b = busca.trim().toLowerCase();
      lista = lista.filter(
        (i) => i.nome.toLowerCase().includes(b) || i.lote.toLowerCase().includes(b)
      );
    }
    return [...lista].sort((a, b) => a.nome.localeCompare(b.nome));
  }, [itensComStatus, filtroAlerta, filtroLocal, busca]);

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-green-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <header className="relative overflow-hidden bg-gradient-to-r from-green-800 to-green-700 rounded-2xl p-5 sm:p-7 mb-6 shadow-xl shadow-green-900/30 border border-green-600/30">
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-yellow-500/10 rounded-full blur-2xl" />
          <div className="absolute -left-10 bottom-0 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl" />
          <div className="relative flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={onVoltar}
                className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-xl transition-colors border border-white/20"
                title="Voltar ao Dashboard"
              >
                <ChevronLeft size={24} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  {categoria.nome}
                  <Sprout size={20} className="text-amber-300" />
                </h1>
                <p className="text-sm text-green-100">Gestão de Estoque</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => abrirHistorico(filtroHistorico)}
                className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 border border-white/20 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all"
              >
                <History size={18} /> Histórico
              </button>
              <button
                onClick={abrirNovo}
                className="flex items-center gap-1.5 bg-amber-500 text-green-900 hover:bg-amber-400 px-4 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5"
              >
                <Plus size={18} /> Novo item
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 bg-red-500/20 text-white hover:bg-red-500/30 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border border-white/10"
              >
                <LogOut size={18} /> Sair
              </button>
            </div>
          </div>
        </header>

        {/* ALERTAS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <button
            onClick={() =>
              setFiltroAlerta(filtroAlerta === "vencidos" ? "todos" : "vencidos")
            }
            className={`group flex items-center gap-4 p-5 rounded-2xl border-2 bg-white transition-all hover:shadow-lg hover:scale-[1.02] ${
              alertas.vencidos > 0
                ? "border-red-300 shadow-red-100/50"
                : "border-gray-200"
            } ${
              filtroAlerta === "vencidos"
                ? "ring-2 ring-red-400 ring-offset-2"
                : ""
            }`}
          >
            <div className={`p-3 rounded-xl ${alertas.vencidos > 0 ? "bg-red-50" : "bg-gray-50"}`}>
              <PackageX size={24} className={alertas.vencidos > 0 ? "text-red-600" : "text-gray-300"} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{alertas.vencidos}</p>
              <p className="text-xs text-gray-500 font-medium">Produtos vencidos</p>
            </div>
          </button>
          <button
            onClick={() =>
              setFiltroAlerta(filtroAlerta === "proximos" ? "todos" : "proximos")
            }
            className={`group flex items-center gap-4 p-5 rounded-2xl border-2 bg-white transition-all hover:shadow-lg hover:scale-[1.02] ${
              alertas.proximos > 0
                ? "border-amber-300 shadow-amber-100/50"
                : "border-gray-200"
            } ${
              filtroAlerta === "proximos"
                ? "ring-2 ring-amber-400 ring-offset-2"
                : ""
            }`}
          >
            <div className={`p-3 rounded-xl ${alertas.proximos > 0 ? "bg-amber-50" : "bg-gray-50"}`}>
              <AlertTriangle size={24} className={alertas.proximos > 0 ? "text-amber-600" : "text-gray-300"} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{alertas.proximos}</p>
              <p className="text-xs text-gray-500 font-medium">Vencendo em {DIAS_ALERTA_VENCIMENTO} dias</p>
            </div>
          </button>
          <button
            onClick={() =>
              setFiltroAlerta(filtroAlerta === "baixos" ? "todos" : "baixos")
            }
            className={`group flex items-center gap-4 p-5 rounded-2xl border-2 bg-white transition-all hover:shadow-lg hover:scale-[1.02] ${
              alertas.baixos > 0
                ? "border-orange-300 shadow-orange-100/50"
                : "border-gray-200"
            } ${
              filtroAlerta === "baixos"
                ? "ring-2 ring-orange-400 ring-offset-2"
                : ""
            }`}
          >
            <div className={`p-3 rounded-xl ${alertas.baixos > 0 ? "bg-orange-50" : "bg-gray-50"}`}>
              <AlertOctagon size={24} className={alertas.baixos > 0 ? "text-orange-600" : "text-gray-300"} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{alertas.baixos}</p>
              <p className="text-xs text-gray-500 font-medium">Estoque baixo</p>
            </div>
          </button>
        </div>

        {/* BUSCA E FILTRO */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou lote..."
              className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-2xl text-sm bg-white shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-shadow"
            />
          </div>
          <div className="relative sm:w-64">
            <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              value={filtroLocal}
              onChange={(e) => setFiltroLocal(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-2xl text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 appearance-none"
            >
              <option value="todos">Todos os locais</option>
              {LOCAIS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        {erro && (
          <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
            {erro}
          </div>
        )}

        {/* RESUMO ESTOQUE */}
        {estoqueTotal.length > 0 && (
          <div className="mb-6 bg-white rounded-2xl border border-gray-200 shadow-md p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">📦 Resumo de Estoque - {categoria.nome}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-60 overflow-y-auto">
              {estoqueTotal.slice(0, 20).map((item) => (
                <div key={item.produto_id} className="flex justify-between items-center border-b border-gray-100 py-1 px-2 text-sm">
                  <span className="text-gray-700 truncate">{item.codigo} - {item.nome}</span>
                  <span className="font-semibold text-green-700">{item.quantidade_total}</span>
                </div>
              ))}
              {estoqueTotal.length > 20 && (
                <div className="col-span-full text-center text-xs text-gray-400">
                  + {estoqueTotal.length - 20} produtos
                </div>
              )}
            </div>
          </div>
        )}

        {/* LISTA DE ITENS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {carregando ? (
            <div className="col-span-full bg-white border border-gray-200 rounded-2xl p-10 text-center text-gray-400 text-sm">Carregando itens...</div>
          ) : listaFiltrada.length === 0 ? (
            <div className="col-span-full bg-white border border-gray-200 rounded-2xl p-10 text-center text-gray-400 text-sm">
              {itens.length === 0 ? `Nenhum item cadastrado na categoria ${categoria.nome}.` : "Nenhum item corresponde ao filtro."}
            </div>
          ) : (
            listaFiltrada.map((it) => {
              const pct = it.minimo > 0 ? Math.min(100, Math.round((it.quantidade / (it.minimo * 2)) * 100)) : 100;
              const status = getStatusInfo(it);
              return (
                <div key={it.id} className="bg-white rounded-2xl border border-gray-200 shadow-md hover:shadow-lg transition-all overflow-hidden flex flex-col">
                  <div className="p-4 pb-2 flex items-start justify-between gap-2 border-b border-gray-100">
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg leading-tight">{it.nome}</h3>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                        <MapPin size={12} /><span>{it.local}</span>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${status.class}`}>{status.label}</span>
                  </div>
                  <div className="p-4 space-y-2 flex-1">
                    <div className="grid grid-cols-2 gap-1 text-sm">
                      <span className="text-gray-500">Lote:</span><span className="font-medium text-gray-700 text-right">{it.lote}</span>
                      <span className="text-gray-500">Validade:</span><span className="font-medium text-gray-700 text-right">{formatarDataBR(it.validade)}</span>
                      <span className="text-gray-500">Quantidade:</span><span className="font-medium text-gray-700 text-right">{it.quantidade} {it.unidade}</span>
                      <span className="text-gray-500">Mínimo:</span><span className="font-medium text-gray-700 text-right">{it.minimo} {it.unidade}</span>
                    </div>
                    <div className="mt-1 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${corProgresso(pct)}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                    <div className="flex gap-1">
                      <button onClick={() => abrirTransferir(it)} className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Transferir"><ArrowLeftRight size={16} /></button>
                      <button onClick={() => abrirRetirar(it)} className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Dar baixa"><PackageMinus size={16} /></button>
                      <button onClick={() => abrirEdicao(it)} className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Editar"><Pencil size={16} /></button>
                    </div>
                    <button onClick={() => excluir(it.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir"><Trash2 size={16} /></button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ===== MODAIS ===== */}

      {/* MODAL FORMULÁRIO */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-white/20">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-green-800 to-green-700">
              <h2 className="font-semibold text-white text-lg">{editandoId ? "Editar item" : "Novo item"} - {categoria.nome}</h2>
              <button onClick={fecharForm} className="text-white/80 hover:text-white hover:bg-white/20 p-1.5 rounded-lg transition-colors"><X size={20} /></button>
            </div>
            <div className="px-6 py-6 space-y-5 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="text-xs font-medium text-gray-600">Produto *</label>
                <select
                  value={form.produto_id}
                  onChange={(e) => handleProdutoSelecionado(e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                >
                  <option value="">Selecione um produto...</option>
                  {produtos.map((p) => (
                    <option key={p.id} value={p.id}>{p.codigo} - {p.nome}</option>
                  ))}
                </select>
              </div>
              {form.produto_id && (
                <div className="bg-green-50 rounded-xl p-3 border border-green-200">
                  <p className="text-xs font-medium text-green-700 mb-1">📦 Quantidade atual por local:</p>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    {estoquePorLocal.length > 0 ? (
                      estoquePorLocal.map((item) => (
                        <div key={item.local} className="flex justify-between">
                          <span className="text-gray-600 truncate">{item.local}:</span>
                          <span className="font-semibold text-green-700">{item.quantidade_total}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-gray-500 col-span-2 text-center">Nenhum registro encontrado</span>
                    )}
                  </div>
                  <div className="mt-2 pt-2 border-t border-green-200 flex justify-between text-xs font-semibold">
                    <span className="text-gray-700">Total geral:</span>
                    <span className="text-green-700">{totalProduto}</span>
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-600">Local de armazenamento *</label>
                <select
                  value={form.local}
                  onChange={(e) => setForm({ ...form, local: e.target.value })}
                  className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                >
                  {LOCAIS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Lote *</label>
                  <input
                    value={form.lote}
                    onChange={(e) => setForm({ ...form, lote: e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-shadow"
                    placeholder="Ex: L2024-08"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Validade *</label>
                  <input
                    type="date"
                    value={form.validade}
                    onChange={(e) => setForm({ ...form, validade: e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Quantidade *</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={form.quantidade}
                    onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Unidade</label>
                  <select
                    value={form.unidade}
                    onChange={(e) => setForm({ ...form, unidade: e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  >
                    {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Mínimo *</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={form.minimo}
                    onChange={(e) => setForm({ ...form, minimo: e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>
              </div>
              {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-xl">{erro}</div>}
              <div className="flex gap-2 pt-1">
                <button onClick={fecharForm} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
                <button onClick={salvarForm} disabled={salvando} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-60">
                  <Check size={16} /> {salvando ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RETIRAR */}
      {mostrarRetirar && itemRetirar && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-white/20">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-teal-700 to-green-700">
              <h2 className="font-semibold text-white text-lg flex items-center gap-2"><PackageMinus size={20} /> Dar baixa no estoque</h2>
              <button onClick={fecharRetirar} className="text-white/80 hover:text-white hover:bg-white/20 p-1.5 rounded-lg transition-colors"><X size={20} /></button>
            </div>
            <div className="px-6 py-6 space-y-5">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="font-medium text-gray-800">{itemRetirar.nome}</p>
                <p className="text-xs text-gray-500">{itemRetirar.local} · Lote {itemRetirar.lote} · Disponível: {itemRetirar.quantidade} {itemRetirar.unidade}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Quantidade a retirar *</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max={itemRetirar.quantidade}
                    value={qtdRetirar}
                    onChange={(e) => setQtdRetirar(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-shadow"
                  />
                  <span className="text-sm text-gray-500 shrink-0">{itemRetirar.unidade}</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Motivo da saída *</label>
                <select
                  value={motivoRetirar}
                  onChange={(e) => {
                    setMotivoRetirar(e.target.value);
                    if (e.target.value !== "Outro") setMotivoPersonalizado("");
                  }}
                  className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  <option value="">Selecione um motivo...</option>
                  {MOTIVOS_SAIDA.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              {motivoRetirar === "Outro" && (
                <div>
                  <label className="text-xs font-medium text-gray-600">Descreva o motivo *</label>
                  <input
                    value={motivoPersonalizado}
                    onChange={(e) => setMotivoPersonalizado(e.target.value)}
                    placeholder="Ex: Devolução ao fornecedor"
                    className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-shadow"
                  />
                </div>
              )}
              {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-xl">{erro}</div>}
              <div className="flex gap-2 pt-1">
                <button onClick={fecharRetirar} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
                <button onClick={confirmarRetirada} disabled={salvando} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-60">
                  <Check size={16} /> {salvando ? "Salvando..." : "Confirmar baixa"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TRANSFERIR */}
      {mostrarTransferir && itemTransferir && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-white/20">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-700 to-purple-700">
              <h2 className="font-semibold text-white text-lg flex items-center gap-2"><ArrowLeftRight size={20} /> Transferir entre locais</h2>
              <button onClick={fecharTransferir} className="text-white/80 hover:text-white hover:bg-white/20 p-1.5 rounded-lg transition-colors"><X size={20} /></button>
            </div>
            <div className="px-6 py-6 space-y-5">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="font-medium text-gray-800">{itemTransferir.nome}</p>
                <p className="text-xs text-gray-500">Lote {itemTransferir.lote} · Disponível: {itemTransferir.quantidade} {itemTransferir.unidade}</p>
                <p className="text-xs text-gray-500 mt-1">De: <span className="font-medium text-gray-700">{itemTransferir.local}</span></p>
              </div>
              {estoquePorLocal.length > 0 && (
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                  <p className="text-xs font-medium text-blue-700 mb-1">📦 Quantidade disponível por local:</p>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    {estoquePorLocal.map((item) => (
                      <div key={item.local} className="flex justify-between">
                        <span className="text-gray-600">{item.local}:</span>
                        <span className="font-semibold text-blue-700">{item.quantidade_total}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-600">Transferir para *</label>
                <select
                  value={localDestino}
                  onChange={(e) => setLocalDestino(e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  {LOCAIS.filter((l) => l !== itemTransferir.local).map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Quantidade a transferir *</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max={itemTransferir.quantidade}
                    value={qtdTransferir}
                    onChange={(e) => setQtdTransferir(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-shadow"
                  />
                  <span className="text-sm text-gray-500 shrink-0">{itemTransferir.unidade}</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Observação (opcional)</label>
                <input
                  value={motivoTransferir}
                  onChange={(e) => setMotivoTransferir(e.target.value)}
                  placeholder="Ex: Reposição de balcão"
                  className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-shadow"
                />
              </div>
              {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-xl">{erro}</div>}
              <div className="flex gap-2 pt-1">
                <button onClick={fecharTransferir} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
                <button onClick={confirmarTransferencia} disabled={salvando} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-60">
                  <Check size={16} /> {salvando ? "Transferindo..." : "Confirmar transferência"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HISTÓRICO */}
      {mostrarHistorico && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[80vh] flex flex-col border border-white/20">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-green-800 to-green-700 shrink-0">
              <h2 className="font-semibold text-white text-lg flex items-center gap-2"><History size={20} /> Histórico de movimentações - {categoria.nome}</h2>
              <button onClick={() => setMostrarHistorico(false)} className="text-white/80 hover:text-white hover:bg-white/20 p-1.5 rounded-lg transition-colors"><X size={20} /></button>
            </div>
            <div className="px-6 py-4 overflow-y-auto">
              <div className="flex items-center gap-2 mb-3">
                <label className="text-xs font-medium text-gray-600">Filtrar por:</label>
                <select
                  value={filtroHistorico}
                  onChange={(e) => {
                    setFiltroHistorico(e.target.value);
                    abrirHistorico(e.target.value);
                  }}
                  className="px-3 py-1.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                >
                  <option value="todos">Todos</option>
                  <option value="saida">Saídas (Baixas)</option>
                  <option value="transferencia">Transferências</option>
                </select>
              </div>
              {carregandoHistorico ? (
                <p className="text-sm text-gray-400 text-center py-8">Carregando...</p>
              ) : historico.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Nenhuma movimentação registrada nesta categoria.</p>
              ) : (
                <div className="space-y-2">
                  {historico.map((h) => (
                    <div key={h.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-gray-100 last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{h.item_nome}</p>
                        <p className="text-xs text-gray-500 flex flex-wrap items-center gap-1">
                          <span>{formatarDataHoraBR(h.criado_em)}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${h.tipo === "transferencia" ? "bg-indigo-100 text-indigo-700" : "bg-teal-100 text-teal-700"}`}>
                            {h.tipo === "transferencia" ? "Transferência" : "Saída"}
                          </span>
                          {h.tipo === "transferencia" ? (
                            <span>{h.local_origem} → {h.local_destino}</span>
                          ) : (
                            <span>{h.local_origem || ""}</span>
                          )}
                          {h.motivo && <span className="text-gray-400">· {h.motivo}</span>}
                          {h.profiles?.nome && <span className="text-gray-400">· {h.profiles.nome}</span>}
                        </p>
                      </div>
                      <span className={`text-sm font-semibold shrink-0 ${h.tipo === "transferencia" ? "text-indigo-700" : "text-teal-700"}`}>
                        {h.tipo === "transferencia" ? "" : "-"}{h.quantidade} {h.unidade}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
