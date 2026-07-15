import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import Auth from "./Auth";
import DashboardPrincipal from "./pages/DashboardPrincipal";
import Estoque from "./pages/Estoque";
import Financeiro from "./pages/Financeiro";

export default function App() {
  const [sessao, setSessao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [tela, setTela] = useState("dashboard");

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

  function navegarPara(tela) {
    setTela(tela);
  }

  if (carregando) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  if (!sessao) return <Auth onLogin={() => {}} />;

  if (tela === "dashboard") {
    return <DashboardPrincipal sessao={sessao} onNavigate={navegarPara} />;
  }

  if (tela === "estoque") {
    return <Estoque sessao={sessao} onNavigate={navegarPara} />;
  }

  if (tela === "financeiro") {
    return <Financeiro onNavigate={navegarPara} />;
  }

  return <DashboardPrincipal sessao={sessao} onNavigate={navegarPara} />;
}