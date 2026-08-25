import { useState, useEffect } from "react";
import { adminApi } from "../api";
import { usePrefs } from "../../store/prefs";
import { createAdminT } from "../i18n";
import type { StaffMember } from "../types";
import { ROLE_LABELS, type StaffRole } from "../types";

export default function AdminStaff() {
  const { language } = usePrefs();
  const t = createAdminT(language);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getStaff().then((data) => {
      setStaff(data);
      setLoading(false);
    });
  }, []);

  const handleToggleActive = async (member: StaffMember) => {
    const newActive = !member.is_active;
    await adminApi.updateStaffRole(member.user_id, member.role, newActive);
    setStaff(staff.map((s) => (s.user_id === member.user_id ? { ...s, is_active: newActive } : s)));
  };

  const handleRoleChange = async (member: StaffMember, newRole: StaffRole) => {
    await adminApi.updateStaffRole(member.user_id, newRole, member.is_active);
    setStaff(staff.map((s) => (s.user_id === member.user_id ? { ...s, role: newRole } : s)));
  };

  if (loading) {
    return <div className="admin-loading"><div className="admin-loading-dot" /></div>;
  }

  const roles: StaffRole[] = ["owner", "admin", "stylist", "customer_service", "finance", "content_manager"];

  return (
    <div className="admin-staff">
      <div className="admin-page-header">
        <h1 className="admin-page-title">{t("admin.staff.title")}</h1>
      </div>

      {staff.length === 0 ? (
        <div className="admin-empty">{t("admin.staff.empty")}</div>
      ) : (
        <div className="admin-list">
          {staff.map((member) => (
            <div key={member.id} className="admin-staff-row">
              <div className="admin-staff-avatar">
                {(member.email ?? "M").charAt(0).toUpperCase()}
              </div>
              <div className="admin-staff-info">
                <span className="admin-staff-email">{member.email ?? "Onbekend"}</span>
                <span className={`admin-status-badge ${member.is_active ? "admin-status-published" : "admin-status-draft"}`}>
                  {member.is_active ? t("admin.staff.active") : t("admin.staff.inactive")}
                </span>
              </div>
              <div className="admin-staff-controls">
                <select
                  className="admin-select"
                  value={member.role}
                  onChange={(e) => handleRoleChange(member, e.target.value as StaffRole)}
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]?.[language] ?? r}
                    </option>
                  ))}
                </select>
                <button
                  className="admin-btn-secondary admin-btn-sm"
                  onClick={() => handleToggleActive(member)}
                >
                  {member.is_active ? t("admin.staff.deactivate") : t("admin.staff.activate")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
