import { useState, useEffect } from "react";
import { ArrowLeft, Save, Package } from "lucide-react";
import { supabase } from "../supabaseClient";

export default function CadastroProduto({ onVoltar }) {
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    carregarCategorias();
  }, []);

  async function carregarCategorias() {
    const { data, error } = await supabase
      .from("categorias")
      .select("id, nome")
      .order("nome");
    if (!error) setCategorias(data || []);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setSucesso(false);

    if (!codigo.trim() || !nome.trim() || !categoriaId) {
      setErro("Preencha todos os campos obrigatórios.");
      return;
    }

    setCarregando(true);

    // Verifica se o código já existe
    const { data: existente, error: checkError } = await supabase
      .from("produtos")
      .select("codigo")
      .eq("codigo", codigo.trim())
      .maybeSingle();

    if (checkError) {
      setErro("Erro ao verificar código: " + checkError.message);
      setCarregando(false);
      return;
    }

    if (existente) {
      setErro(`Já existe um produto com o código ${codigo.trim()}.`);
      setCarregando(false);
      return;
    }

    // Insere o novo produto
    const { error: insertError } = await supabase
      .from("produtos")
      .insert({
        codigo: codigo.trim(),
        nome: nome.trim(),
        categoria_id: categoriaId,
      });

    if (insertError) {
      setErro("Erro ao cadastrar produto: " + insertError.message);
      setCarregando(false);
      return;
    }

    setSucesso(true);
    setCodigo("");
    setNome("");
    setCategoriaId("");
    setCarregando(false);

    // Limpa a mensagem de sucesso após 3 segundos
    setTimeout(() => setSucesso(false), 3000);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-green-50 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onVoltar}
            className="bg-white p-2 rounded-xl shadow-md hover:shadow-lg transition border border-gray-200"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Package size={28} className="text-green-700" />
            Novo Produto
          </h1>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código *
              </label>
              <input
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ex: 9441"
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Produto *
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: PADRON 5 LT"
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoria *
              </label>
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
              >
                <option value="">Selecione uma categoria...</option>
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nome}
                  </option>
                ))}
              </select>
            </div>

            {erro && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-xl">
                {erro}
              </div>
            )}

            {sucesso && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded-xl">
                ✅ Produto cadastrado com sucesso!
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onVoltar}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={carregando}
                className="flex-1 flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 text-white font-semibold px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition disabled:opacity-60"
              >
                <Save size={18} />
                {carregando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
