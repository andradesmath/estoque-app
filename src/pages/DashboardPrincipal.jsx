import { Package, DollarSign, LogOut, Tractor } from "lucide-react";
import { supabase } from "../supabaseClient";

const MODULOS = [
  {
    id: "estoque",
    nome: "Gestão de Estoque",
    descricao: "Controle de produtos, categorias e movimentações",
    icon: Package,
    cor: "green",
  },
  {
    id: "financeiro",
    nome: "Módulo Financeiro",
    descricao: "Vendas, contas a pagar/receber e indicadores",
    icon: DollarSign,
    cor: "blue",
  },
];

export default function DashboardPrincipal({ sessao, onNavigate }) {
  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-green-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="relative overflow-hidden bg-gradient-to-r from-green-800 to-green-700 rounded-2xl p-5 sm:p-7 mb-8 shadow-xl">
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-yellow-500/10 rounded-full blur-2xl" />
          <div className="relative flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 backdrop-blur-sm text-white p-3 rounded-2xl border border-white/20">
                <Package size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  Porteira Agrocomercial
                  <Tractor size={20} className="text-amber-300" />
                </h1>
                <p className="text-sm text-green-100">Sistema Integrado de Gestão</p>
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

        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-800">Selecione um módulo</h2>
          <p className="text-gray-500 mt-2">Escolha a área que deseja gerenciar</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {MODULOS.map((mod) => {
            const Icon = mod.icon;
            const corClasses = {
              green: "border-green-400 hover:shadow-green-200",
              blue: "border-blue-400 hover:shadow-blue-200",
            };
            return (
              <button
                key={mod.id}
                onClick={() => onNavigate(mod.id)}
                className={`bg-white rounded-2xl border-2 ${corClasses[mod.cor]} shadow-md hover:shadow-xl transition-all p-8 text-center group hover:-translate-y-1`}
              >
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-gray-50 rounded-full group-hover:bg-opacity-20 transition-colors">
                    <Icon size={48} className="text-gray-700" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-800">{mod.nome}</h3>
                <p className="text-sm text-gray-500 mt-2">{mod.descricao}</p>
                <div className="mt-4 text-xs font-medium text-green-600 flex items-center justify-center gap-1">
                  Acessar <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}