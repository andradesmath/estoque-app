import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import Auth from "./Auth";
import Dashboard from "./Dashboard";
import Setor from "./Setor";
import LogsExclusao from "./pages/LogsExclusao";
import CadastroProduto from "./pages/CadastroProduto";
import MinimosProdutos from "./pages/MinimosProdutos";

export default function App() {
  const [sessao, setSessao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [tela, setTela] = useState("dashboard");
  const [categoriaAtiva, setCategoriaAtiva] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessao(session);
      setCarregando(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessao(session);
    });

    return () => listener?.subscription?.unsubscribe();
  }, []);

  function irParaSetor(categoria) {
    setCategoriaAtiva(categoria);
    setTela("setor");
  }

  function voltarDashboard() {
    setTela("dashboard");
    setCategoriaAtiva(null);
  }

  function abrirLogs() {
    setTela("logs");
  }

  function abrirCadastroProduto() {
    setTela("cadastroProduto");
  }

  function abrirMinimos() {
    setTela("minimos");
  }

  if (carregando) {
    return <div className="min-h-screen flex items-center justify-center bg-amber-50">Carregando...</div>;
  }

  if (!sessao) {
    return <Auth onLogin={() => {}} />;
  }

  if (tela === "dashboard") {
    return (
      <Dashboard
        sessao={sessao}
        onSelectCategoria={irParaSetor}
        onOpenLogs={abrirLogs}
        onOpenCadastroProduto={abrirCadastroProduto}
        onOpenMinimos={abrirMinimos}
      />
    );
  }

  if (tela === "setor" && categoriaAtiva) {
    return (
      <Setor
        sessao={sessao}
        categoria={categoriaAtiva}
        onVoltar={voltarDashboard}
        onOpenCadastroProduto={abrirCadastroProduto}
        onOpenMinimos={abrirMinimos}
      />
    );
  }

  if (tela === "logs") {
    return <LogsExclusao onVoltar={voltarDashboard} />;
  }

  if (tela === "cadastroProduto") {
    return <CadastroProduto onVoltar={voltarDashboard} />;
  }

  if (tela === "minimos") {
    return <MinimosProdutos onVoltar={voltarDashboard} />;
  }

  return (
    <Dashboard
      sessao={sessao}
      onSelectCategoria={irParaSetor}
      onOpenLogs={abrirLogs}
      onOpenCadastroProduto={abrirCadastroProduto}
      onOpenMinimos={abrirMinimos}
    />
  );
}
