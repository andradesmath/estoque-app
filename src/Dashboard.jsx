import { useState, useEffect } from "react";
import { Package, LogOut, Layers, ChevronLeft, Tractor, AlertTriangle } from "lucide-react";
import { supabase } from "./supabaseClient";

// Fallback local (caso o Supabase falhe)
const CATEGORIAS_PADRAO = [
  { id: '1', nome: 'ADUBO', descricao: 'Adubos e fertilizantes' },
  { id: '2', nome: 'BOMBAS', descricao: 'Bombas e acessórios' },
  { id: '3', nome: 'CAÇA/PESCA', descricao: 'Artigos de caça e pesca' },
  { id: '4', nome: 'CALÇADOS', descricao: 'Calçados e botas' },
  { id: '5', nome: 'CORDAS/LONA', descricao: 'Cordas, lonas e coberturas' },
  { id: '6', nome: 'DEFENSIVOS', descricao: 'Defensivos agrícolas' },
  { id: '7', nome: 'DIVERSOS', descricao: 'Diversos' },
  { id: '8', nome: 'ELÉTRICO', descricao: 'Materiais elétricos' },
  { id: '9', nome: 'EMBALAGENS', descricao: 'Embalagens' },
  { id: '10', nome: 'EPI', descricao: 'Equipamentos de proteção individual' },
  { id: '11', nome: 'FERRAGENS E FERRAMENTAS', descricao: 'Ferragens e ferramentas' },
  { id: '12', nome: 'FERTILIZANTES', descricao: 'Fertilizantes' },
  { id: '13', nome: 'HIDRAULICA', descricao: 'Hidráulica' },
  { id: '14', nome: 'IRRIGAÇÃO', descricao: 'Irrigação' },
  { id: '15', nome: 'JARDINAGEM', descricao: 'Jardinagem' },
  { id: '16', nome: 'MADEIRAS', descricao: 'Madeiras e derivados' },
  { id: '17', nome: 'MAQUINAS', descricao: 'Máquinas e equipamentos' },
  { id: '18', nome: 'PRODUTOS PARA USO LOJA', descricao: 'Produtos para uso em loja' },
  { id: '19', nome: 'PULVERIZADORES', descricao: 'Pulverizadores' },
  { id: '20', nome: 'RAÇÕES E PET', descricao: 'Rações e produtos pet' },
  { id: '21', nome: 'SACARIA', descricao: 'Sacaria e embalagens' },
  { id: '22', nome: 'SELARIA', descricao: 'Selaria e artefatos de couro' },
  { id: '23', nome: 'SEM GRUPO', descricao: 'Sem grupo definido' },
  { id: '24', nome: 'SEMENTES', descricao: 'Sementes' },
  { id: '25', nome: 'UTILIDADES DO LAR', descricao: 'Utilidades domésticas' },
  { id: '26', nome: 'VETERINÁRIO', descricao: 'Produtos veterinários' },
];

export default function Dashboard({ sessao, onSelectCategoria }) {
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [usandoFallback, setUsandoFallback] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);

  useEffect(() => {
    carregarCategorias();
  }, []);

  async function carregarCategorias() {
    setCarregando(true);
    setErro(null);
    setUsandoFallback(false);

    // Verifica sessão ativa
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData?.session) {
      setDebugInfo({ motivo: "Sem sessão ativa", sessionError: sessionError?.message || null });
      setErro("Você não está autenticado. Faça login novamente.");
      setCarregando(false);
      return;
    }

    const { data, error } = await supabase
      .from("categorias")
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      setDebugInfo({ supabaseError: error });
      setErro(`Erro ao consultar categorias: ${error.message}`);
      setCarregando(false);
      return;
    }

    if (!data || data.length === 0) {
      setDebugInfo({ aviso: "Consulta OK, mas 0 linhas — verifique RLS" });
      setCategorias([]);
      setCarregando(false);
      return;
    }

    setCategorias(data);
    setCarregando(false);
  }

  function usarFallback() {
    setCategorias(CATEGORIAS_PADRAO);
    setUsandoFallback(true);
    setErro(null);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  if (carregando) {
    return <div className="min-h-screen flex items-center justify-center bg-amber-50">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-green-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="relative overflow-hidden bg-gradient-to-r from-green-800 to-green-700 rounded-2xl p-5 sm:p-7 mb-8 shadow-xl shadow-green-900/30 border border-green-600/30">
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-yellow-500/10 rounded-full blur-2xl" />
          <div className="absolute -left-10 bottom-0 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl" />
          <div className="relative flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 backdrop-blur-sm text-white p-3 rounded-2xl border border-white/20">
                <Package size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  Estoque - Porteira Agrocomercial
                  <Tractor size={20} className="text-amber-300" />
                </h1>
                <p className="text-sm text-green-100">Sistema de Gestão de Estoque</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 bg-red-500/20 text-white hover:bg-red-500/30 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border border-white/10"
            >
              <LogOut size={18} /> Sair
            </button>
          </div>
        </header>

        {/* Erros e fallback */}
        {erro && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 mb-6 flex gap-3">
            <AlertTriangle className="text-red-500 flex-shrink-0" size={22} />
            <div className="flex-1">
              <p className="font-semibold text-red-700">{erro}</p>
              {debugInfo && (
                <pre className="text-xs text-red-500 mt-2 whitespace-pre-wrap break-all">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              )}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={carregarCategorias}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                >
                  Tentar novamente
                </button>
                <button
                  onClick={usarFallback}
                  className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
                >
                  Usar lista local
                </button>
              </div>
            </div>
          </div>
        )}

        {!erro && categorias.length === 0 && (
          <div className="bg-white rounded-2xl shadow-md p-8 text-center">
            <p className="font-semibold text-gray-700">Nenhuma categoria retornada.</p>
            <p className="text-sm text-gray-500 mt-1">Verifique as políticas RLS ou use a lista local.</p>
            <button
              onClick={usarFallback}
              className="mt-4 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
            >
              Usar lista local
            </button>
          </div>
        )}

        {usandoFallback && categorias.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-xl px-4 py-2 mb-4">
            Exibindo lista local — os dados podem estar desatualizados.
          </div>
        )}

        {categorias.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categorias.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onSelectCategoria(cat)}
                className="bg-white rounded-2xl border-2 border-gray-200 shadow-md hover:shadow-xl hover:border-green-400 transition-all p-6 text-left group hover:-translate-y-1"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-green-100 rounded-xl group-hover:bg-green-200 transition-colors">
                    <Layers size={24} className="text-green-700" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">{cat.nome}</h3>
                </div>
                <p className="text-sm text-gray-500">{cat.descricao || "Gerenciar estoque"}</p>
                <div className="mt-3 text-xs text-green-600 font-medium flex items-center gap-1">
                  Acessar <ChevronLeft size={14} className="rotate-180" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}