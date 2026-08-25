import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n";

export default function NotFound() {
  const navigate = useNavigate();
  const { t } = useI18n();
  return (
    <div className="empty">
      <div className="empty-monogram">M</div>
      <h3>{t("notfound.title")}</h3>
      <p>{t("notfound.body")}</p>
      <button className="btn bp blk" style={{ maxWidth: 220, margin: "0 auto", marginTop: "var(--s3)" }} onClick={() => navigate("/")}>{t("notfound.to_home")}</button>
    </div>
  );
}
