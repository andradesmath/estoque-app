import { useState, useEffect } from "react";
import { Package, LogOut, Layers, ChevronLeft, Sprout, Tractor } from "lucide-react";
import { supabase } from "./supabaseClient";

// Lista de categorias (para fallback e seed)
const CATEGORIAS_PADRAO = [
  { nome: 'ADUBO', descricao: 'Adubos e fertilizantes' },
  { nome: 'BOMBAS', descricao: 'Bombas e acessórios' },
  { nome: 'CAÇA/PESCA', descricao: 'Artigos de caça e pesca' },
  { nome: 'CALÇADOS', descricao: 'Calçados e botas' },
  { nome: 'CORDAS/LONA', descricao: 'Cordas, lonas e coberturas' },
  { nome: 'DEFENSIVOS', descricao: 'Defensivos agrícolas' },
  { nome: 'DIVERSOS', descricao: 'Diversos' },
  { nome: 'ELÉTRICO', descricao: 'Materiais elétricos' },
  { nome: 'EMBALAGENS', descricao: 'Embalagens' },
  { nome: 'EPI', descricao: 'Equipamentos de proteção individual' },
  { nome: 'FERRAGENS E FERRAMENTAS', descricao: 'Ferragens e ferramentas' },
  { nome: 'FERTILIZANTES', descricao: 'Fertilizantes' },
  { nome: 'HIDRAULICA', descricao: 'Hidráulica' },
  { nome: 'IRRIGAÇÃO', descricao: 'Irrigação' },
  { nome: 'JARDINAGEM', descricao: 'Jardinagem' },
  { nome: 'MADEIRAS', descricao: 'Madeiras e derivados' },
  { nome: 'MAQUINAS', descricao: 'Máquinas e equipamentos' },
  { nome: 'PRODUTOS PARA USO LOJA', descricao: 'Produtos para uso em loja' },
  { nome: 'PULVERIZADORES', descricao: 'Pulverizadores' },
  { nome: 'RAÇÕES E PET', descricao: 'Rações e produtos pet' },
  { nome: 'SACARIA', descricao: 'Sacaria e embalagens' },
  { nome: 'SELARIA', descricao: 'Selaria e artefatos de couro' },
  { nome: 'SEM GRUPO', descricao: 'Sem grupo definido' },
  { nome: 'SEMENTES', descricao: 'Sementes' },
  { nome: 'UTILIDADES DO LAR', descricao: 'Utilidades domésticas' },
  { nome: 'VETERINÁRIO', descricao: 'Produtos veterinários' },
];

export default function Dashboard({ sessao, onSelectCategoria }) {
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [inserindo, setInserindo] = useState(false);

  useEffect(() => {
    carregarCategorias();
  }, []);

  async function carregarCategorias() {
    setCarregando(true);
    setErro("");
    try {
      // 1. Tentar buscar do Supabase
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setCategorias(data);
        return;
      }

      // 2. Se tabela vazia, exibir mensagem
      setCategorias([]);
    } catch (err) {
      console.error("Erro na consulta:", err);
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }

  // Função para inserir categorias automaticamente
  async function inserirCategorias() {
    setInserindo(true);
    setErro("");
    try {
      // Inserir cada categoria uma por uma (para evitar conflitos)
      for (const cat of CATEGORIAS_PADRAO) {
        const { error } = await supabase
          .from('categorias')
          .insert({ nome: cat.nome, descricao: cat.descricao })
          .select();
        if (error && error.code !== '23505') { // ignorar duplicados
          throw error;
        }
      }
      // Recarregar a lista
      await carregarCategorias();
    } catch (err) {
      console.error("Erro ao inserir categorias:", err);
      setErro("Erro ao inserir categorias: " + err.message);
    } finally {
      setInserindo(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  // Enquanto carrega
  if (carregando) {
    return <div className="min-h-screen flex items-center justify-center bg-amber-50">Carregando...</div>;
  }

  // Se erro
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

  // Se não há categorias, mostrar botão para inserir
  if (categorias.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-green-50 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <header className="relative overflow-hidden bg-gradient-to-r from-green-800 to-green-700 rounded-2xl p-5 sm:p-7 mb-8 shadow-xl shadow-green-900/30 border border-green-600/30">
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
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 bg-red-500/20 text-white hover:bg-red-500/30 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border border-white/10"
              >
                <LogOut size={18} /> Sair
              </button>
            </div>
          </header>

          <div className="bg-white rounded-2xl p-10 text-center shadow-md">
            <p className="text-gray-600 mb-4">Nenhuma categoria encontrada no banco de dados.</p>
            <button
              onClick={inserirCategorias}
              disabled={inserindo}
              className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {inserindo ? 'Inserindo...' : 'Inserir categorias automaticamente'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Tela principal com categorias
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
      </div>
    </div>
  );
}
