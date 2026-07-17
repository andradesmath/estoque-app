import { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  FileText, 
  Trash2, 
  Package, 
  Box, 
  Move, 
  User, 
  Calendar, 
  ChevronDown, 
  ChevronUp,
  Database,
  Search,
  Filter,
  X
} from "lucide-react";
import { supabase } from "../supabaseClient";

const iconesTabela = {
  produtos: <Package size={16} />,
  itens: <Box size={16} />,
  movimentacoes: <Move size={16} />,
};

const coresTabela = {
  produtos: "bg-blue-100 text-blue-700 border-blue-300",
  itens: "bg-green-100 text-green-700 border-green-300",
  movimentacoes: "bg-purple-100 text-purple-700 border-purple-300",
};

export default function LogsExclusao({ onVoltar }) {
  const [logs, setLogs] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [filtroTabela, setFiltroTabela] = useState("todos");
  const [busca, setBusca] = useState("");
  const [expandido, setExpandido] = useState(null);

  useEffect(() => {
    carregarLogs();
  }, []);

  async function carregarLogs() {
    setCarregando(true);
    setErro(null);
    try {
      const { data, error } = await supabase
        .from("view_logs_exclusao")
        .select("*")
        .order("data_hora", { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }

  const tabelasUnicas = ["todos", ...new Set(logs.map((l) => l.tabela))];

  const logsFiltrados = logs.filter((log) => {
    const matchTabela = filtroTabela === "todos" || log.tabela === filtroTabela;
    const matchBusca = 
      log.usuario_nome?.toLowerCase().includes(busca.toLowerCase()) ||
      log.usuario_email?.toLowerCase().includes(busca.toLowerCase()) ||
      log.registro_id?.toLowerCase().includes(busca.toLowerCase());
    return matchTabela && matchBusca;
  });

  // Estatísticas
  const totalExclusoes = logs.length;
  const porTabela = logs.reduce((acc, log) => {
    acc[log.tabela] = (acc[log.tabela] || 0) + 1;
    return acc;
  }, {});

  const toggleExpandir = (id) => {
    setExpandido(expandido === id ? null : id);
  };

  const formatarData = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Carregando logs...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={onVoltar}
              className="p-2.5 bg-white rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-200"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <FileText size={28} className="text-purple-600" />
                Logs de Exclusão
              </h1>
              <p className="text-sm text-gray-500">
                Histórico completo de todos os registros removidos do sistema
              </p>
            </div>
          </div>
          <button
            onClick={carregarLogs}
            className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-200 text-sm font-medium text-gray-600"
          >
            <Database size={16} /> Atualizar
          </button>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-md p-4 border border-gray-100">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Total</p>
            <p className="text-2xl font-bold text-gray-800">{totalExclusoes}</p>
          </div>
          {Object.entries(porTabela).map(([tabela, total]) => (
            <div key={tabela} className="bg-white rounded-2xl shadow-md p-4 border border-gray-100">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                {tabela}
              </p>
              <p className="text-2xl font-bold text-gray-800">{total}</p>
            </div>
          ))}
        </div>

        {/* Filtros e Busca */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-md border border-gray-200 flex-1 w-full sm:w-auto">
            <Search size={18} className="text-gray-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por usuário ou ID..."
              className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400"
            />
            {busca && (
              <button onClick={() => setBusca("")} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-md border border-gray-200">
            <Filter size={18} className="text-gray-400" />
            <select
              value={filtroTabela}
              onChange={(e) => setFiltroTabela(e.target.value)}
              className="bg-transparent outline-none text-sm text-gray-700"
            >
              {tabelasUnicas.map((t) => (
                <option key={t} value={t}>
                  {t === "todos" ? "Todas as tabelas" : t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {erro && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <Trash2 className="text-red-500" size={20} />
            <p className="text-red-700">{erro}</p>
            <button
              onClick={carregarLogs}
              className="ml-auto px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {logsFiltrados.length === 0 && !erro && (
          <div className="bg-white rounded-2xl shadow-md p-12 text-center border border-gray-200">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">Nenhum log encontrado</p>
            <p className="text-sm text-gray-400 mt-1">
              {busca || filtroTabela !== "todos" 
                ? "Tente ajustar os filtros de busca." 
                : "Ainda não há registros de exclusão."}
            </p>
          </div>
        )}

        {/* Lista de Logs */}
        <div className="space-y-3">
          {logsFiltrados.map((log) => {
            const isExpandido = expandido === log.id;
            const corBadge = coresTabela[log.tabela] || "bg-gray-100 text-gray-700 border-gray-300";
            const Icon = iconesTabela[log.tabela] || <FileText size={16} />;

            return (
              <div
                key={log.id}
                className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden transition-all hover:shadow-lg"
              >
                <div
                  className="flex flex-wrap items-center gap-3 p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                  onClick={() => toggleExpandir(log.id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 flex-shrink-0">
                      <Trash2 size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${corBadge}`}>
                          {Icon} {log.tabela}
                        </span>
                        <span className="text-sm font-medium text-gray-800 truncate">
                          ID: {log.registro_id?.slice(0, 8)}...
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <User size={12} /> {log.usuario_nome || "Usuário desconhecido"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={12} /> {formatarData(log.data_hora)}
                        </span>
                        {log.usuario_email && (
                          <span className="text-gray-400">{log.usuario_email}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {log.dados_antigos && Object.keys(log.dados_antigos).length > 0 && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                        {Object.keys(log.dados_antigos).length} campos
                      </span>
                    )}
                    {isExpandido ? (
                      <ChevronUp size={18} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={18} className="text-gray-400" />
                    )}
                  </div>
                </div>

                {isExpandido && log.dados_antigos && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50/70">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      📦 Dados excluídos
                    </p>
                    <div className="bg-gray-900 rounded-xl p-4 overflow-auto max-h-80">
                      <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap break-all">
                        {JSON.stringify(log.dados_antigos, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}