import { useState, useEffect } from "react";
import { ArrowLeft, Save, Package, AlertCircle } from "lucide-react";
import { supabase } from "../supabaseClient";

export default function MinimosProdutos({ onVoltar }) {
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);

  const [categorias, setCategorias] = useState([]);
  const [filtroCategoria, setFiltroCategoria] = useState("");

  useEffect(() => {
    carregarCategorias();
  }, []);

  // Quando a categoria mudar, carregar os produtos
  useEffect(() => {
    if (filtroCategoria !== "") {
      carregarProdutos();
    } else {
      setProdutos([]);
    }
  }, [filtroCategoria]);

  async function carregarCategorias() {
    const { data, error } = await supabase
      .from("categorias")
      .select("id, nome")
      .order("nome");
    if (!error) setCategorias(data || []);
  }

  async function carregarProdutos() {
    setCarregando(true);
    setErro("");
    setProdutos([]);

    try {
      // 1. Buscar produtos da categoria selecionada
      let query = supabase.from("produtos").select(`
        id,
        codigo,
        nome,
        minimo_global,
        categoria_id,
        categorias (nome)
      `);

      if (filtroCategoria !== "TODAS") {
        query = query.eq("categorias.nome", filtroCategoria);
      }

      const { data: prods, error: prodsError } = await query.order("nome");

      if (prodsError) throw prodsError;

      if (!prods || prods.length === 0) {
        setProdutos([]);
        setCarregando(false);
        return;
      }

      // 2. Buscar todos os itens de estoque (uma única consulta)
      const produtoIds = prods.map(p => p.id);
      const { data: itens, error: itensError } = await supabase
        .from("itens")
        .select("produto_id, quantidade")
        .in("produto_id", produtoIds);

      if (itensError) {
        console.warn("Erro ao buscar itens:", itensError);
      }

      // 3. Calcular o total por produto
      const totais = {};
      if (itens) {
        itens.forEach(item => {
          const id = item.produto_id;
          totais[id] = (totais[id] || 0) + (item.quantidade || 0);
        });
      }

      // 4. Montar a lista final com os totais
      const produtosComEstoque = prods.map(prod => ({
        ...prod,
        quantidade_total: totais[prod.id] || 0,
        categoria: prod.categorias?.nome || "Sem categoria",
      }));

      setProdutos(produtosComEstoque);
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }

  function handleMinimoChange(produtoId, novoValor) {
    setProdutos(prev =>
      prev.map(p =>
        p.id === produtoId
          ? { ...p, minimo_global: parseFloat(novoValor) || 0 }
          : p
      )
    );
  }

  async function salvarMinimos() {
    setSalvando(true);
    setErro("");
    setSucesso(false);

    try {
      const updates = produtos.map(p => ({
        id: p.id,
        minimo_global: p.minimo_global,
      }));

      const { error } = await supabase
        .from("produtos")
        .upsert(updates, { onConflict: "id" });

      if (error) throw error;

      setSucesso(true);
      setTimeout(() => setSucesso(false), 3000);
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  // Se nenhuma categoria selecionada, mostrar tela de seleção
  if (!filtroCategoria) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-green-50 p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={onVoltar}
              className="bg-white p-2 rounded-xl shadow-md hover:shadow-lg transition border border-gray-200"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Package size={28} className="text-blue-600" />
              Mínimos de Estoque
            </h1>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100">
            <p className="text-gray-500">Selecione uma categoria para visualizar os produtos.</p>
            <div className="mt-4">
              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Selecione uma categoria...</option>
                <option value="TODAS">Todas as categorias</option>
                {categorias.map(c => (
                  <option key={c.id} value={c.nome}>{c.nome}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-green-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onVoltar}
              className="bg-white p-2 rounded-xl shadow-md hover:shadow-lg transition border border-gray-200"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Package size={28} className="text-blue-600" />
              Mínimos de Estoque
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="TODAS">Todas as categorias</option>
              {categorias.map(c => (
                <option key={c.id} value={c.nome}>{c.nome}</option>
              ))}
            </select>
            <button
              onClick={salvarMinimos}
              disabled={salvando || carregando}
              className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold px-4 py-2 rounded-xl shadow-md transition disabled:opacity-60"
            >
              <Save size={18} />
              {salvando ? "Salvando..." : "Salvar Mínimos"}
            </button>
          </div>
        </div>

        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
            {erro}
          </div>
        )}
        {sucesso && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl mb-4">
            ✅ Mínimos salvos com sucesso!
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            {carregando ? (
              <div className="p-8 text-center text-gray-500">Carregando produtos...</div>
            ) : produtos.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Nenhum produto encontrado nesta categoria.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Código
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estoque Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mínimo Global
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {produtos.map((prod) => {
                    const total = parseFloat(prod.quantidade_total) || 0;
                    const minimo = parseFloat(prod.minimo_global) || 0;
                    const status = total < minimo ? "⚠️ Baixo" : "✅ OK";
                    const statusClass = total < minimo ? "text-red-600" : "text-green-600";

                    return (
                      <tr key={prod.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {prod.codigo}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {prod.nome}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-700">
                          {total}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={prod.minimo_global}
                            onChange={(e) => handleMinimoChange(prod.id, e.target.value)}
                            className="w-24 px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${statusClass}`}>
                          {status}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-500 flex items-center gap-2">
          <AlertCircle size={16} />
          O mínimo global define a quantidade mínima que deve haver em estoque para todo o produto (somando todos os lotes e locais).
        </div>
      </div>
    </div>
  );
}
