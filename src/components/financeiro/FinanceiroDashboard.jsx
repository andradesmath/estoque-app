import { useState, useEffect, useMemo } from "react";
import {
  Wallet, TrendingUp, TrendingDown, AlertTriangle, ArrowLeft,
  DollarSign, PiggyBank,
} from "lucide-react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";
import { supabase } from "../supabaseClient";

const MESES_PREVISAO = 3;
const JANELA_REGRESSAO = 6;

function formatarMoeda(v) {
  return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function nomeMes(dataISO) {
  const d = new Date(dataISO + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
}

function regressaoLinear(valores) {
  const n = valores.length;
  if (n < 2) return { slope: 0, intercept: valores[0] || 0 };
  const somaX = valores.reduce((s, _, i) => s + i, 0);
  const somaY = valores.reduce((s, v) => s + v, 0);
  const somaXY = valores.reduce((s, v, i) => s + i * v, 0);
  const somaX2 = valores.reduce((s, _, i) => s + i * i, 0);
  const slope = (n * somaXY - somaX * somaY) / (n * somaX2 - somaX * somaX || 1);
  const intercept = (somaY - slope * somaX) / n;
  return { slope, intercept };
}

export default function FinanceiroDashboard({ onVoltar }) {
  const [fluxo, setFluxo] = useState([]);
  const [saldo, setSaldo] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const [fluxoRes, saldoRes] = await Promise.all([
        supabase.from("fluxo_caixa_mensal").select("*").order("mes", { ascending: true }),
        supabase.from("saldo_previsto").select("*").single(),
      ]);
      if (fluxoRes.error) throw fluxoRes.error;
      if (saldoRes.error) throw saldoRes.error;
      setFluxo(fluxoRes.data || []);
      setSaldo(saldoRes.data || { a_receber: 0, a_pagar: 0, saldo_realizado: 0 });
    } catch (err) {
      setErro(`Erro ao carregar dados: ${err.message}`);
    } finally {
      setCarregando(false);
    }
  }

  const dadosGrafico = useMemo(() => {
    if (fluxo.length === 0) return [];

    const historico = fluxo.map((f) => ({
      mes: nomeMes(f.mes),
      entradas: Number(f.entradas) || 0,
      saidas: Number(f.saidas) || 0,
      saldo: Number(f.saldo_mes) || 0,
    }));

    const janela = fluxo.slice(-JANELA_REGRESSAO);
    const entradasHist = janela.map((f) => Number(f.entradas) || 0);
    const saidasHist = janela.map((f) => Number(f.saidas) || 0);

    const regEntradas = regressaoLinear(entradasHist);
    const regSaidas = regressaoLinear(saidasHist);

    const ultimoMes = new Date(fluxo[fluxo.length - 1].mes + "T00:00:00");
    const futuro = [];
    for (let i = 1; i <= MESES_PREVISAO; i++) {
      const idx = janela.length - 1 + i;
      const entradasProj = Math.max(0, regEntradas.slope * idx + regEntradas.intercept);
      const saidasProj = Math.max(0, regSaidas.slope * idx + regSaidas.intercept);
      const dataFutura = new Date(ultimoMes);
      dataFutura.setMonth(dataFutura.getMonth() + i);
      futuro.push({
        mes: nomeMes(dataFutura.toISOString().slice(0, 10)),
        entradasPrevistas: Math.round(entradasProj * 100) / 100,
        saidasPrevistas: Math.round(saidasProj * 100) / 100,
        saldoPrevisto: Math.round((entradasProj - saidasProj) * 100) / 100,
      });
    }

    if (historico.length > 0) {
      historico[historico.length - 1].saldoPrevisto = historico[historico.length - 1].saldo;
    }

    return [...historico, ...futuro];
  }, [fluxo]);

  const tendenciaSaldo = useMemo(() => {
    if (fluxo.length < 2) return null;
    const ultimos = fluxo.slice(-2);
    const anterior = Number(ultimos[0].saldo_mes) || 0;
    const atual = Number(ultimos[1].saldo_mes) || 0;
    return atual - anterior;
  }, [fluxo]);

  const saldoProjetado = saldo
    ? Number(saldo.saldo_realizado) + Number(saldo.a_receber) - Number(saldo.a_pagar)
    : 0;

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Carregando painel financeiro...
      </div>
    );
  }

  return (
    <div>
      {erro && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 mb-6 flex gap-3">
          <AlertTriangle className="text-red-500 flex-shrink-0" size={22} />
          <div>
            <p className="font-semibold text-red-700">{erro}</p>
            <button
              onClick={carregar}
              className="mt-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-md p-5">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold uppercase mb-1">
            <PiggyBank size={16} /> Saldo realizado
          </div>
          <p className={`text-xl font-bold ${saldo?.saldo_realizado >= 0 ? "text-green-700" : "text-red-600"}`}>
            {formatarMoeda(saldo?.saldo_realizado)}
          </p>
        </div>
        <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-md p-5">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold uppercase mb-1">
            <TrendingUp size={16} /> A receber
          </div>
          <p className="text-xl font-bold text-green-600">{formatarMoeda(saldo?.a_receber)}</p>
        </div>
        <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-md p-5">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold uppercase mb-1">
            <TrendingDown size={16} /> A pagar
          </div>
          <p className="text-xl font-bold text-red-600">{formatarMoeda(saldo?.a_pagar)}</p>
        </div>
        <div className="bg-white rounded-2xl border-2 border-green-300 shadow-md p-5">
          <div className="flex items-center gap-2 text-green-700 text-xs font-semibold uppercase mb-1">
            <DollarSign size={16} /> Saldo projetado
          </div>
          <p className={`text-xl font-bold ${saldoProjetado >= 0 ? "text-green-700" : "text-red-600"}`}>
            {formatarMoeda(saldoProjetado)}
          </p>
        </div>
      </div>

      {/* Gráfico */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-md p-5 mb-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-lg font-bold text-gray-800">Fluxo de caixa mensal</h2>
          <span className="text-xs text-gray-400">
            Linha pontilhada = previsão baseada na tendência dos últimos {JANELA_REGRESSAO} meses
          </span>
        </div>

        {dadosGrafico.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            Ainda não há lançamentos suficientes (contas pagas/recebidas) para gerar o fluxo de caixa.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={dadosGrafico}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatarMoeda(v)} />
              <Legend />
              <Bar dataKey="entradas" name="Entradas" fill="#4E7A44" radius={[4, 4, 0, 0]} />
              <Bar dataKey="saidas" name="Saídas" fill="#A83E2C" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="saldo" name="Saldo (realizado)" stroke="#2F4A34" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line
                type="monotone"
                dataKey="saldoPrevisto"
                name="Saldo (previsto)"
                stroke="#B9791E"
                strokeWidth={2.5}
                strokeDasharray="6 4"
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {tendenciaSaldo !== null && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
          tendenciaSaldo >= 0 ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"
        }`}>
          {tendenciaSaldo >= 0 ? "📈" : "📉"} O saldo mensal {tendenciaSaldo >= 0 ? "melhorou" : "piorou"} em{" "}
          {formatarMoeda(Math.abs(tendenciaSaldo))} em relação ao mês anterior.
        </div>
      )}
    </div>
  );
}