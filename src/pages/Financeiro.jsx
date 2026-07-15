import { useState } from 'react';
import { ArrowLeft, ChartColumn, FileSpreadsheet, LayoutDashboard, Users } from 'lucide-react';
import VendasForm from '../components/financeiro/VendasForm';
import ContasForm from '../components/financeiro/ContasForm';
import VendedoresDashboard from '../components/financeiro/VendedoresDashboard';
import FinanceiroDashboard from '../components/FinanceiroDashboard';

export default function Financeiro({ onNavigate }) {
  const [aba, setAba] = useState('dashboard');

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">📊 Módulo Financeiro</h1>
            <p className="text-gray-500">Gestão de vendas, contas e indicadores</p>
          </div>
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-xl"
          >
            <ArrowLeft size={18} /> Voltar
          </button>
        </div>

        <div className="flex gap-2 mb-6 border-b border-gray-200 pb-2 flex-wrap">
          <button
            onClick={() => setAba('dashboard')}
            className={`px-4 py-2 rounded-t-lg font-medium ${
              aba === 'dashboard' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <LayoutDashboard size={18} className="inline mr-2" />
            Dashboard
          </button>
          <button
            onClick={() => setAba('vendas')}
            className={`px-4 py-2 rounded-t-lg font-medium ${
              aba === 'vendas' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <ChartColumn size={18} className="inline mr-2" />
            Vendas
          </button>
          <button
            onClick={() => setAba('contas')}
            className={`px-4 py-2 rounded-t-lg font-medium ${
              aba === 'contas' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FileSpreadsheet size={18} className="inline mr-2" />
            Contas
          </button>
          <button
            onClick={() => setAba('vendedores')}
            className={`px-4 py-2 rounded-t-lg font-medium ${
              aba === 'vendedores' ? 'bg-orange-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Users size={18} className="inline mr-2" />
            Vendedores
          </button>
        </div>

        {aba === 'dashboard' && <FinanceiroDashboard />}
        {aba === 'vendas' && <VendasForm />}
        {aba === 'contas' && <ContasForm />}
        {aba === 'vendedores' && <VendedoresDashboard />}
      </div>
    </div>
  );
}