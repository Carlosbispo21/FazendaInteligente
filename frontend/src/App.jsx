import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import ScrollToTop from "./components/ScrollToTop";
import Layout from "@/components/Layout";
import { SensorProvider } from "@/lib/SensorContext";
import Inicio from "@/pages/Inicio";
import Previsoes from "@/pages/Previsoes";
import Cultura from "@/pages/Cultura";

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <ScrollToTop />
        <Routes>
          <Route
            element={
              <SensorProvider>
                <Layout />
              </SensorProvider>
            }
          >
            <Route path="/inicio" element={<Inicio />} />
            <Route path="/previsoes" element={<Previsoes />} />
            <Route path="/cultura" element={<Cultura />} />
            <Route path="/" element={<Navigate to="/inicio" replace />} />
          </Route>
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
