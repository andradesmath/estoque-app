import { useState, useEffect } from "react";
import { Package, LogOut, Layers, ChevronLeft, Tractor, AlertTriangle, ArrowLeft } from "lucide-react";
import { supabase } from "../supabaseClient";

const CATEGORIAS_PADRAO = [
  { id: '1', nome: 'ADUBO', descricao: 'Adubos e fertilizantes' },
  { id: '2', nome: 'BOMBAS', descricao: 'Bombas e acessórios' },
  // ... (insira as 26 categorias aqui)
];

export default function Estoque({ sessao, onNavigate }) {
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [usandoFallback, setUsandoFallback] = useState(false);

  useEffect(() => {
    carregarCategorias();
  }, []);

  async function carregarCategorias() {
    setCarregando(true);
    setErro(null);
    setUsandoFallback(false);

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      setErro("Sessão ausente. Faça login novamente.");
      setCarregando(false);
      return;
    }

    const { data, error } = await supabase
      .from("categorias")
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      setErro(`Erro: ${error.message}`);
      setCarregando(false);
      return;
    }

    if (!data || data.length === 0) {
      setErro("Nenhuma categoria encontrada. Verifique RLS.");
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
    return <div className="min-h-screen flex items-center justify-center">Carregando categorias...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-green-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="relative overflow-hidden bg-gradient-to-r from-green-800 to-green-700 rounded-2xl p-5 sm:p-7 mb-8 shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigate("dashboard")}
                className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-xl border border-white/20"
              >
                <ArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Gestão de Estoque</h1>
                <p className="text-sm text-green-100">Categorias e produtos</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 bg-red-500/20 text-white hover:bg-red-500/30 px-3 py-2.5 rounded-xl text-sm font-medium border border-white/10"
            >
              <LogOut size={18} /> Sair
            </button>
          </div>
        </header>

        {erro && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 mb-6 flex gap-3">
            <AlertTriangle className="text-red-500" size={22} />
            <div>
              <p className="font-semibold text-red-700">{erro}</p>
              <button onClick={usarFallback} className="mt-2 px-3 py-1 bg-gray-200 rounded-lg text-sm">
                Usar lista local
              </button>
            </div>
          </div>
        )}

        {usandoFallback && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-xl px-4 py-2 mb-4">
            Exibindo lista local — os dados podem estar desatualizados.
          </div>
        )}

        {categorias.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categorias.map((cat) => (
              <button
                key={cat.id}
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