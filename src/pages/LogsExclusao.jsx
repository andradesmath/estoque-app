import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Trash2, User, Calendar, Database, ArrowLeft } from 'lucide-react';

export default function LogsExclusao({ onBack }) {
  const [logs, setLogs] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [filtro, setFiltro] = useState(''); // filtro por nome de tabela ou usuário

  useEffect(() => {
    carregarLogs();
  }, []);

  async function carregarLogs() {
    setCarregando(true);
    setErro(null);
    try {
      // Buscar logs com dados do usuário (via view)
      const { data, error } = await supabase
        .from('view_logs_exclusao')
        .select('*')
        .order('data_hora', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error(err);
      setErro('Erro ao carregar logs de exclusão.');
    } finally {
      setCarregando(false);
    }
  }

  // Formatar data/hora
  function formatarData(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Dados antigos como JSON legível
  function renderizarDadosAntigos(dados) {
    if (!dados) return '—';
    try {
      const obj = typeof dados === 'string' ? JSON.parse(dados) : dados;
      return (
        <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto max-h-32">
          {JSON.stringify(obj, null, 2)}
        </pre>
      );
    } catch {
      return <span className="text-gray-500">Dados inválidos</span>;
    }
  }

  // Filtrar logs
  const logsFiltrados = logs.filter((log) => {
    if (!filtro.trim()) return true;
    const termo = filtro.toLowerCase();
    return (
      log.tabela?.toLowerCase().includes(termo) ||
      log.usuario_email?.toLowerCase().includes(termo) ||
      log.usuario_nome?.toLowerCase().includes(termo)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft size={24} />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Trash2 className="text-red-500" size={28} />
                Logs de Exclusão
              </h1>
              <p className="text-sm text-gray-500">
                Histórico de exclusões realizadas no sistema
              </p>
            </div>
          </div>
          <button
            onClick={carregarLogs}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Atualizar
          </button>
        </div>

        {/* Filtro */}
        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Filtrar por tabela, usuário ou email..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <span className="text-sm text-gray-500">
              {logsFiltrados.length} registro(s)
            </span>
          </div>
        </div>

        {/* Estado de carregamento/erro */}
        {carregando && (
          <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
            Carregando logs...
          </div>
        )}

        {erro && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
            {erro}
          </div>
        )}

        {/* Lista de logs */}
        {!carregando && !erro && (
          <div className="space-y-4">
            {logsFiltrados.length === 0 ? (
              <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
                {filtro ? 'Nenhum log corresponde ao filtro.' : 'Nenhuma exclusão registrada ainda.'}
              </div>
            ) : (
              logsFiltrados.map((log) => (
                <div
                  key={log.id}
                  className="bg-white rounded-xl shadow p-4 border border-gray-100 hover:shadow-md transition"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-red-100 text-red-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {log.tabela}
                      </span>
                      <span className="text-sm font-medium text-gray-700">
                        ID: <span className="font-mono">{log.registro_id}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <User size={14} />
                        {log.usuario_nome || log.usuario_email || 'Usuário desconhecido'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {formatarData(log.data_hora)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2">
                    <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                      <Database size={14} />
                      Dados excluídos:
                    </span>
                    <div className="mt-1">{renderizarDadosAntigos(log.dados_antigos)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}