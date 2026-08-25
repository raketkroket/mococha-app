import { useParams } from "react-router-dom";

import { useI18n } from "../i18n";

export default function InfoPage() {
  const { slug = "" } = useParams();
  const { t } = useI18n();
  return (
    <div>
      <h1 className="screen-title mb16">{t("info.title")}</h1>
      <p className="muted">{t("info.placeholder", { slug })}</p>
    </div>
  );
}
