import { useState, useEffect } from "react";
import { Package, LogOut, Layers, ChevronLeft, Sprout, Tractor } from "lucide-react";
import { supabase } from "./supabaseClient";

export default function Dashboard({ sessao, onSelectCategoria }) {
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    carregarCategorias();
  }, []);

  async function carregarCategorias() {
    try {
      console.log("=== DEBUG START ===");
      console.log("User ID:", sessao.user.id);
      console.log("User Email:", sessao.user.email);

      // PASSO 1: Buscar IDs das categorias permitidas
      const { data: perms, error: errorPerms } = await supabase
        .from('user_categoria_permissao')
        .select('categoria_id')
        .eq('user_id', sessao.user.id);

      console.log("Permissões retornadas:", perms);
      console.log("Erro permissões:", errorPerms);

      if (errorPerms) {
        console.error("Erro ao buscar permissões:", errorPerms);
        setErro("Erro ao carregar permissões: " + errorPerms.message);
        return;
      }

      if (!perms || perms.length === 0) {
        console.log("Nenhuma permissão encontrada.");
        setCategorias([]);
        setCarregando(false);
        return;
      }

      const ids = perms.map(p => p.categoria_id);
      console.log("IDs das categorias:", ids);

      // PASSO 2: Buscar dados completos das categorias
      const { data: cats, error: errorCats } = await supabase
        .from('categorias')
        .select('*')
        .in('id', ids)
        .order('nome', { ascending: true });

      console.log("Categorias retornadas:", cats);
      console.log("Erro categorias:", errorCats);

      if (errorCats) {
        console.error("Erro ao buscar categorias:", errorCats);
        setErro("Erro ao carregar categorias: " + errorCats.message);
        return;
      }

      setCategorias(cats || []);
    } catch (err) {
      console.error("Erro inesperado:", err);
      setErro("Erro ao carregar permissões: " + err.message);
    } finally {
      setCarregando(false);
      console.log("=== DEBUG END ===");
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  if (carregando) {
    return <div className="min-h-screen flex items-center justify-center bg-amber-50">Carregando...</div>;
  }

  if (erro) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Erro</h2>
          <p className="text-gray-600">{erro}</p>
          <button
            onClick={carregarCategorias}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-green-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
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
                  Depósito Agrícola
                  <Tractor size={20} className="text-amber-300" />
                </h1>
                <p className="text-sm text-green-100">Sistema de Gestão de Estoque</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 bg-red-500/20 text-white hover:bg-red-500/30 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border border-white/10"
              >
                <LogOut size={18} /> Sair
              </button>
            </div>
          </div>
        </header>

        {/* GRID DE SETORES */}
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

        {categorias.length === 0 && (
          <div className="bg-white rounded-2xl p-10 text-center text-gray-500">
            <p>Nenhuma permissão encontrada para este usuário.</p>
            <p className="text-sm text-gray-400 mt-2">Entre em contato com o administrador.</p>
          </div>
        )}
      </div>
    </div>
  );
}
