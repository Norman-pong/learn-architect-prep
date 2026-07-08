import { Routes, Route } from "react-router";
import { AppThemeProvider } from "./theme/AppThemeProvider";
import { AppLayout } from "./components/layout/AppLayout";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { AIConfigPage } from "./pages/AIConfigPage";

export default function App() {
  return (
    <AppThemeProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="settings/ai" element={<AIConfigPage />} />
        </Route>
      </Routes>
    </AppThemeProvider>
  );
}
