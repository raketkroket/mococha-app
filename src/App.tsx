import { useEffect } from "react";
import { BrowserRouter, Navigate, Routes, Route, useLocation } from "react-router-dom";
import { Header, TabBar } from "./components/Nav";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { useAuth } from "./store/auth";
import { useTheme } from "./store/theme";
import { usePrefs } from "./store/prefs";
import { useViewMode } from "./store/viewMode";

import Home from "./screens/Home";
import BuildParty from "./screens/BuildParty";
import Concepts from "./screens/Concepts";
import Inspiration from "./screens/Inspiration";
import Account from "./screens/Account";
import Checkout from "./screens/Checkout";
import OrderConfirmation from "./screens/OrderConfirmation";
import Auth from "./screens/Auth";
import InfoPage from "./screens/InfoPage";
import NotFound from "./screens/NotFound";
import Contact from "./screens/Contact";
import ConceptDetail from "./screens/ConceptDetail";
import Quotes from "./screens/Quotes";
import Messages from "./screens/Messages";
import Conversation from "./screens/Conversation";
import Settings from "./screens/Settings";
import ProfileEdit from "./screens/ProfileEdit";
import Appearance from "./screens/Appearance";
import Addresses from "./screens/Addresses";
import Security from "./screens/Security";
import MfaChallenge from "./screens/MfaChallenge";
import NotificationsSettings from "./screens/NotificationsSettings";
import Privacy from "./screens/Privacy";
import ResetPassword from "./screens/ResetPassword";

import { AdminLayout } from "./admin/AdminLayout";
import { useAdminAuth } from "./admin/auth";
import AdminLogin from "./admin/screens/AdminLogin";
import AdminOverview from "./admin/screens/AdminOverview";
import AdminConcepts from "./admin/screens/AdminConcepts";
import AdminConceptDetail from "./admin/screens/AdminConceptDetail";
import AdminMessages from "./admin/screens/AdminMessages";
import AdminConversationDetail from "./admin/screens/AdminConversationDetail";
import AdminContent from "./admin/screens/AdminContent";
import AdminMore from "./admin/screens/AdminMore";
import AdminStaff from "./admin/screens/AdminStaff";
import AdminAuditLog from "./admin/screens/AdminAuditLog";
import AdminSettings from "./admin/screens/AdminSettings";
import AdminAgenda from "./admin/screens/AdminAgenda";
import AdminQuotations from "./admin/screens/AdminQuotations";
import AdminPayments from "./admin/screens/AdminPayments";
import AdminCustomers from "./admin/screens/AdminCustomers";
import AdminOnboarding from "./admin/screens/AdminOnboarding";

import "./admin/admin.css";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.body.classList.remove("no-scroll");
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function TabLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <OfflineIndicator />
      <main className="screen">{children}</main>
      <TabBar />
    </>
  );
}

function HeaderLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <>
      <Header showBack title={title} />
      <OfflineIndicator />
      <main className="screen-full screen-full-deep">{children}</main>
    </>
  );
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAdminAuth();
  const mode = useViewMode((state) => state.mode);

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-loading-dot" />
      </div>
    );
  }

  if (!isAdmin) {
    return <AdminLogin />;
  }

  if (mode !== "admin") {
    return <Navigate to="/account" replace />;
  }

  return <AdminLayout>{children}</AdminLayout>;
}

export default function App() {
  const init = useAuth((s) => s.init);
  const initTheme = useTheme((s) => s.init);
  const initPrefs = usePrefs((s) => s.init);
  const initViewMode = useViewMode((s) => s.init);
  const initAdmin = useAdminAuth((s) => s.init);

  useEffect(() => {
    initTheme();
    initPrefs();
    initViewMode();
    const u = init();
    const ua = initAdmin();
    return () => { u(); ua(); };
  }, [init, initTheme, initPrefs, initViewMode, initAdmin]);

  return (
    <BrowserRouter>
      <div className="shell">
        <ScrollToTop />
        <Routes>
          {/* Customer App Routes */}
          <Route path="/" element={<TabLayout><Home /></TabLayout>} />
          <Route path="/bouwen" element={<TabLayout><BuildParty /></TabLayout>} />
          <Route path="/concepten" element={<TabLayout><Concepts /></TabLayout>} />
          <Route path="/concepten/:id" element={<HeaderLayout><ConceptDetail /></HeaderLayout>} />
          <Route path="/inspiratie" element={<TabLayout><Inspiration /></TabLayout>} />
          <Route path="/account" element={<TabLayout><Account /></TabLayout>} />
          <Route path="/account/inloggen" element={<HeaderLayout><Auth /></HeaderLayout>} />
          <Route path="/account/wachtwoord-herstellen" element={<HeaderLayout><ResetPassword /></HeaderLayout>} />
          <Route path="/account/profiel" element={<HeaderLayout><ProfileEdit /></HeaderLayout>} />
          <Route path="/account/instellingen" element={<HeaderLayout><Settings /></HeaderLayout>} />
          <Route path="/account/weergave" element={<HeaderLayout><Appearance /></HeaderLayout>} />
          <Route path="/account/meldingen" element={<HeaderLayout><NotificationsSettings /></HeaderLayout>} />
          <Route path="/account/privacy" element={<HeaderLayout><Privacy /></HeaderLayout>} />
          <Route path="/account/adressen" element={<HeaderLayout><Addresses /></HeaderLayout>} />
          <Route path="/account/beveiliging" element={<HeaderLayout><Security /></HeaderLayout>} />
          <Route path="/account/beveiliging/mfa" element={<HeaderLayout title="MFA"><MfaChallenge onSuccess={() => window.history.back()} /></HeaderLayout>} />
          <Route path="/account/berichten" element={<HeaderLayout><Messages /></HeaderLayout>} />
          <Route path="/account/berichten/:id" element={<HeaderLayout><Conversation /></HeaderLayout>} />
          <Route path="/account/contact" element={<HeaderLayout><Contact /></HeaderLayout>} />
          <Route path="/quotes" element={<TabLayout><Quotes /></TabLayout>} />
          <Route path="/afrekenen" element={<HeaderLayout><Checkout /></HeaderLayout>} />
          <Route path="/bevestiging/:id" element={<HeaderLayout><OrderConfirmation /></HeaderLayout>} />
          <Route path="/contact" element={<HeaderLayout><Contact /></HeaderLayout>} />
          <Route path="/info/:slug" element={<TabLayout><InfoPage /></TabLayout>} />

          {/* Admin App Routes */}
          <Route path="/admin" element={<AdminRoute><AdminOverview /></AdminRoute>} />
          <Route path="/admin/onboarding" element={<AdminRoute><AdminOnboarding /></AdminRoute>} />
          <Route path="/admin/concepten" element={<AdminRoute><AdminConcepts /></AdminRoute>} />
          <Route path="/admin/concepten/:id" element={<AdminRoute><AdminConceptDetail /></AdminRoute>} />
          <Route path="/admin/berichten" element={<AdminRoute><AdminMessages /></AdminRoute>} />
          <Route path="/admin/berichten/:id" element={<AdminRoute><AdminConversationDetail /></AdminRoute>} />
          <Route path="/admin/content" element={<AdminRoute><AdminContent /></AdminRoute>} />
          <Route path="/admin/meer" element={<AdminRoute><AdminMore /></AdminRoute>} />
          <Route path="/admin/medewerkers" element={<AdminRoute><AdminStaff /></AdminRoute>} />
          <Route path="/admin/audit" element={<AdminRoute><AdminAuditLog /></AdminRoute>} />
          <Route path="/admin/instellingen" element={<AdminRoute><AdminSettings /></AdminRoute>} />
          <Route path="/admin/agenda" element={<AdminRoute><AdminAgenda /></AdminRoute>} />
          <Route path="/admin/offertes" element={<AdminRoute><AdminQuotations /></AdminRoute>} />
          <Route path="/admin/betalingen" element={<AdminRoute><AdminPayments /></AdminRoute>} />
          <Route path="/admin/klanten" element={<AdminRoute><AdminCustomers /></AdminRoute>} />
          <Route path="/admin/themas" element={<AdminRoute><AdminContent /></AdminRoute>} />
          <Route path="/admin/onderdelen" element={<AdminRoute><AdminContent /></AdminRoute>} />
          <Route path="/admin/media" element={<AdminRoute><AdminContent /></AdminRoute>} />
          <Route path="/admin/inspiratie" element={<AdminRoute><AdminContent /></AdminRoute>} />
          <Route path="/admin/notificaties" element={<AdminRoute><AdminMore /></AdminRoute>} />

          <Route path="*" element={<TabLayout><NotFound /></TabLayout>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
