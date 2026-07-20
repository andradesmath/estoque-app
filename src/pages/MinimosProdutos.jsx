import { useState, useEffect } from "react";
import { ArrowLeft, Save, Package, AlertCircle } from "lucide-react";
import { supabase } from "../supabaseClient";

export default function MinimosProdutos({ onVoltar }) {
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [categorias, setCategorias] = useState([]);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setCarregando(true);
    setErro("");
    try {
      // Buscar categorias
      const { data: cats, error: catsError } = await supabase
        .from("categorias")
        .select("id, nome")
        .order("nome");
      if (catsError) throw catsError;
      setCategorias(cats || []);

      // Opção 1: usar a view (mais eficiente)
      const { data: prods, error: prodsError } = await supabase
        .from("estoque_total_produto")
        .select("*")
        .order("nome");

      if (prodsError) {
        // Fallback: se a view não existir, busca manualmente
        console.warn("View não encontrada, buscando manualmente...");
        const { data: allProds, error: allError } = await supabase
          .from("produtos")
          .select(`
            id,
            codigo,
            nome,
            minimo_global,
            categorias (nome)
          `)
          .order("nome");

        if (allError) throw allError;

        const produtosComEstoque = await Promise.all(
          (allProds || []).map(async (prod) => {
            const { data: somaData } = await supabase
              .from("itens")
              .select("quantidade")
              .eq("produto_id", prod.id);
            const total = somaData?.reduce((acc, item) => acc + (item.quantidade || 0), 0) || 0;
            return {
              produto_id: prod.id,
              codigo: prod.codigo,
              nome: prod.nome,
              categoria: prod.categorias?.nome || "Sem categoria",
              minimo_global: prod.minimo_global || 0,
              quantidade_total: total,
            };
          })
        );
        setProdutos(produtosComEstoque);
      } else {
        setProdutos(prods || []);
      }
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }

  function handleMinimoChange(produtoId, novoValor) {
    setProdutos(prev =>
      prev.map(p =>
        p.produto_id === produtoId
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
        id: p.produto_id,
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

  const produtosFiltrados = filtroCategoria
    ? produtos.filter(p => p.categoria === filtroCategoria)
    : produtos;

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50">
        Carregando...
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
              <option value="">Todas as categorias</option>
              {categorias.map(c => (
                <option key={c.id} value={c.nome}>{c.nome}</option>
              ))}
            </select>
            <button
              onClick={salvarMinimos}
              disabled={salvando}
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
                    Categoria
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
                {produtosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                      Nenhum produto encontrado.
                    </td>
                  </tr>
                ) : (
                  produtosFiltrados.map((prod) => {
                    const total = parseFloat(prod.quantidade_total) || 0;
                    const minimo = parseFloat(prod.minimo_global) || 0;
                    const status = total < minimo ? "⚠️ Baixo" : "✅ OK";
                    const statusClass = total < minimo ? "text-red-600" : "text-green-600";

                    return (
                      <tr key={prod.produto_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {prod.codigo}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {prod.nome}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {prod.categoria}
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
                            onChange={(e) => handleMinimoChange(prod.produto_id, e.target.value)}
                            className="w-24 px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${statusClass}`}>
                          {status}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
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
