import { Routes, Route } from "react-router";
import { AppThemeProvider } from "./theme/AppThemeProvider";
import { AppLayout } from "./components/layout/AppLayout";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { AIConfigPage } from "./pages/AIConfigPage";
import { TemplatesPage } from "./pages/TemplatesPage";
import { SamplesPage } from "./pages/SamplesPage";
import { WritingWorkbench } from "./pages/WritingWorkbench";
import KnowledgePage from "./pages/KnowledgePage";
import ReviewPage from "./pages/ReviewPage";
import QuizPage from "./pages/QuizPage";
import StatsPage from "./pages/StatsPage";
import ErrorBookPage from "./pages/ErrorBookPage";
import WeaknessPage from "./pages/WeaknessPage";

export default function App() {
  return (
    <AppThemeProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="settings/ai" element={<AIConfigPage />} />
          <Route path="writing/templates" element={<TemplatesPage />} />
          <Route path="writing/samples" element={<SamplesPage />} />
          <Route path="writing" element={<WritingWorkbench />} />
          <Route path="learn" element={<KnowledgePage />} />
          <Route path="review" element={<ReviewPage />} />
          <Route path="quiz" element={<QuizPage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="error-book" element={<ErrorBookPage />} />
          <Route path="weakness" element={<WeaknessPage />} />
        </Route>
      </Routes>
    </AppThemeProvider>
  );
}
