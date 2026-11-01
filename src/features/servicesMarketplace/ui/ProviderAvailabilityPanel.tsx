import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import {
  addProviderAvailabilityPeriod,
  addProviderCoverage,
  addProviderWeeklySchedule,
  deleteProviderAvailabilityPeriod,
  deleteProviderCoverage,
  deleteProviderWeeklySchedule,
  getProviderAvailability,
  getProviderAvailabilityOptions,
  saveProviderSupplySettings,
  updateProviderAvailabilityPeriod,
  updateProviderWeeklySchedule,
} from "../api/servicesMarketplaceApi";
import type {
  AvailabilityOptions,
  ProviderAvailability,
} from "../api/servicesMarketplaceApi";
import "./providerAvailability.css";

const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
type Coverage = ProviderAvailability["coverage"][number];
type Weekly = ProviderAvailability["weekly"][number];
type Period = ProviderAvailability["periods"][number];
type Editor =
  | { type: "coverage"; value?: Coverage }
  | { type: "weekly"; value?: Weekly }
  | { type: "period"; value?: Period };
type DeleteTarget = {
  type: "coverage" | "weekly" | "period";
  id: string;
  label: string;
};
type AvailabilityView = "settings" | "coverage" | "hours" | "exceptions";
const availabilityViews: Array<{
  id: AvailabilityView;
  label: string;
  icon: string;
}> = [
  { id: "settings", label: "Booking settings", icon: "tune" },
  { id: "coverage", label: "Service coverage", icon: "location_on" },
  { id: "hours", label: "Weekly hours", icon: "date_range" },
  { id: "exceptions", label: "Exceptions", icon: "event_busy" },
];

const localDateTime = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

function paginationTokens(current: number, total: number) {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const valid = [...pages]
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b);
  const tokens: Array<number | string> = [];
  valid.forEach((page, index) => {
    if (index && page - valid[index - 1] > 1) tokens.push(`ellipsis-${page}`);
    tokens.push(page);
  });
  return tokens;
}

export function ProviderAvailabilityPanel() {
  const initialView = new URLSearchParams(window.location.search).get(
    "section",
  );
  const [activeView, setActiveView] = useState<AvailabilityView>(
    availabilityViews.some((view) => view.id === initialView)
      ? (initialView as AvailabilityView)
      : "settings",
  );
  const [data, setData] = useState<ProviderAvailability | null>(null);
  const [options, setOptions] = useState<AvailabilityOptions>({
    services: [],
    areas: [],
  });
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success",
  );
  const [editor, setEditor] = useState<Editor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [busy, setBusy] = useState(false);
  const [weeklyPage, setWeeklyPage] = useState(1);
  const [coveragePage, setCoveragePage] = useState(1);

  async function load() {
    const [availability, availabilityOptions] = await Promise.all([
      getProviderAvailability(),
      getProviderAvailabilityOptions(),
    ]);
    setData(availability);
    setOptions(availabilityOptions);
  }
  useEffect(() => {
    void load().catch(() => show("Availability could not be loaded.", "error"));
  }, []);
  const weeklyPageSize = 9;
  const weeklyItems = [...(data?.weekly || [])].sort(
    (left, right) =>
      left.dayOfWeek - right.dayOfWeek ||
      left.startLocalTime.localeCompare(right.startLocalTime) ||
      serviceNameForSort(left.serviceId).localeCompare(
        serviceNameForSort(right.serviceId),
      ),
  );
  const weeklyPageCount = Math.max(
    1,
    Math.ceil(weeklyItems.length / weeklyPageSize),
  );
  const visibleWeeklyItems = weeklyItems.slice(
    (weeklyPage - 1) * weeklyPageSize,
    weeklyPage * weeklyPageSize,
  );
  const weeklyPagination = paginationTokens(weeklyPage, weeklyPageCount);
  const coveragePageSize = 9;
  const coverageItems = [...(data?.coverage || [])].sort(
    (left, right) =>
      left.serviceName.localeCompare(right.serviceName) ||
      left.areaName.localeCompare(right.areaName),
  );
  const coveragePageCount = Math.max(
    1,
    Math.ceil(coverageItems.length / coveragePageSize),
  );
  const visibleCoverageItems = coverageItems.slice(
    (coveragePage - 1) * coveragePageSize,
    coveragePage * coveragePageSize,
  );
  const coveragePagination = paginationTokens(coveragePage, coveragePageCount);
  useEffect(() => {
    setWeeklyPage((current) => Math.min(current, weeklyPageCount));
  }, [weeklyPageCount]);
  useEffect(() => {
    setCoveragePage((current) => Math.min(current, coveragePageCount));
  }, [coveragePageCount]);
  function serviceNameForSort(id?: string | null) {
    return options.services.find((item) => item.id === id)?.name || "";
  }
  function show(text: string, type: "success" | "error" = "success") {
    setMessage(text);
    setMessageType(type);
  }
  async function perform(action: () => Promise<unknown>, ok: string) {
    try {
      setBusy(true);
      await action();
      await load();
      show(ok);
      return true;
    } catch (error) {
      const apiMessage = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : undefined;
      show(
        apiMessage ||
          "The change was not saved. Check the values and overlapping times.",
        "error",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function settings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await perform(
      () =>
        saveProviderSupplySettings({
          timeZoneId: String(form.get("timeZoneId")),
          isOnline: form.get("isOnline") === "on",
          minimumLeadTimeMinutes: Number(form.get("lead")),
          maximumAdvanceBookingDays: Number(form.get("advance")),
        }),
      "Availability settings saved.",
    );
  }
  async function saveEditor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor) return;
    const form = new FormData(event.currentTarget);
    const optionalNumber = (key: string) =>
      String(form.get(key) || "") ? Number(form.get(key)) : null;
    let saved = false;
    if (editor.type === "coverage")
      saved = await perform(
        () =>
          addProviderCoverage({
            serviceId: String(form.get("serviceId")),
            areaId: String(form.get("areaId")),
            originLatitude: optionalNumber("latitude"),
            originLongitude: optionalNumber("longitude"),
            maximumRadiusKm: optionalNumber("radius"),
            isActive: true,
          }),
        editor.value ? "Coverage updated." : "Coverage added.",
      );
    if (editor.type === "weekly") {
      const payload = {
        serviceId: String(form.get("serviceId")) || null,
        dayOfWeek: Number(form.get("day")),
        startLocalTime: String(form.get("start")),
        endLocalTime: String(form.get("end")),
        isActive: true,
      };
      saved = await perform(
        () =>
          editor.value
            ? updateProviderWeeklySchedule(editor.value.publicId, payload)
            : addProviderWeeklySchedule(payload),
        editor.value ? "Working hours updated." : "Working hours added.",
      );
    }
    if (editor.type === "period") {
      const payload = {
        serviceId: String(form.get("serviceId")) || null,
        periodType: String(form.get("type")),
        startAtUtc: new Date(String(form.get("start"))).toISOString(),
        endAtUtc: new Date(String(form.get("end"))).toISOString(),
        reason: String(form.get("reason")) || null,
      };
      saved = await perform(
        () =>
          editor.value
            ? updateProviderAvailabilityPeriod(editor.value.publicId, payload)
            : addProviderAvailabilityPeriod(payload),
        editor.value ? "Exception updated." : "Exception added.",
      );
    }
    if (saved) setEditor(null);
  }
  async function confirmDelete() {
    if (!deleteTarget) return;
    const action =
      deleteTarget.type === "coverage"
        ? () => deleteProviderCoverage(deleteTarget.id)
        : deleteTarget.type === "weekly"
          ? () => deleteProviderWeeklySchedule(deleteTarget.id)
          : () => deleteProviderAvailabilityPeriod(deleteTarget.id);
    if (await perform(action, `${deleteTarget.label} removed.`))
      setDeleteTarget(null);
  }
  const serviceName = (id?: string | null) =>
    options.services.find((item) => item.id === id)?.name || "All services";

  function selectView(view: AvailabilityView) {
    setActiveView(view);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", "availability");
    url.searchParams.set("section", view);
    window.history.replaceState({}, "", url);
  }

  if (!data)
    return (
      <section className="provider-availability provider-availability-loading">
        <span className="material-icons">event_available</span>
        <h2>Coverage and availability</h2>
        <p>{message || "Loading availability…"}</p>
      </section>
    );
  return (
    <section className="provider-availability">
      <header className="availability-page-heading">
        <div>
          <span>WORK PREFERENCES</span>
          <h2>Coverage and availability</h2>
          <p>Control where and when customers can book your services.</p>
        </div>
        <div
          className={`availability-live-status ${data.isOnline ? "is-online" : ""}`}
        >
          <i />
          {data.isOnline ? "Accepting work" : "Offline"}
        </div>
      </header>
      <nav className="availability-submenu" aria-label="Availability sections">
        {availabilityViews.map((view) => (
          <button
            type="button"
            key={view.id}
            className={activeView === view.id ? "is-active" : ""}
            onClick={() => selectView(view.id)}
          >
            <span className="availability-submenu-icon material-icons">
              {view.icon}
            </span>
            <span className="availability-submenu-label">{view.label}</span>
          </button>
        ))}
      </nav>
      {data.isAdminSuspended ? (
        <div className="availability-notice is-error">
          <span className="material-icons">warning</span>
          <div>
            <b>Availability suspended</b>
            <p>{data.adminSuspensionReason}</p>
          </div>
        </div>
      ) : null}
      {message ? (
        <div
          className={`availability-notice ${messageType === "error" ? "is-error" : "is-success"}`}
          role="status"
        >
          <span className="material-icons">
            {messageType === "error" ? "error" : "check_circle"}
          </span>
          <div>{message}</div>
        </div>
      ) : null}

      {activeView === "settings" ? (
        <form className="availability-settings-card" onSubmit={settings}>
          <div className="availability-section-heading">
            <span className="availability-section-icon material-icons">
              tune
            </span>
            <div>
              <h3>Booking settings</h3>
              <p>Set your timezone and how far ahead customers may book.</p>
            </div>
          </div>
          <label>
            <span>Timezone</span>
            <input
              name="timeZoneId"
              defaultValue={
                data.timeZoneId ||
                Intl.DateTimeFormat().resolvedOptions().timeZone
              }
              required
            />
          </label>
          <label>
            <span>Minimum notice</span>
            <div className="availability-input-suffix">
              <input
                name="lead"
                type="number"
                min="0"
                max="10080"
                defaultValue={data.minimumLeadTimeMinutes}
              />
              <small>minutes</small>
            </div>
          </label>
          <label>
            <span>Advance booking window</span>
            <div className="availability-input-suffix">
              <input
                name="advance"
                type="number"
                min="1"
                max="365"
                defaultValue={data.maximumAdvanceBookingDays}
              />
              <small>days</small>
            </div>
          </label>
          <label className="availability-online-toggle">
            <input
              name="isOnline"
              type="checkbox"
              defaultChecked={data.isOnline}
            />
            <i />
            <span>
              <b>Go online</b>
              <small>Accept new matching offers and assignments</small>
            </span>
          </label>
          <button className="availability-primary-button" disabled={busy}>
            <span className="material-icons">save</span>Save settings
          </button>
        </form>
      ) : null}

      {activeView === "coverage" ? (
        <AvailabilitySection
          icon="location_on"
          title="Service coverage"
          description="Areas where you can provide each qualified service."
          action="Add coverage"
          onAdd={() => setEditor({ type: "coverage" })}
        >
          {data.coverage.length ? (
            <div className="availability-card-grid">
              {visibleCoverageItems.map((item) => (
                <article className="availability-item-card" key={item.publicId}>
                  <span className="availability-item-icon material-icons">
                    map
                  </span>
                  <div>
                    <h4>{item.serviceName}</h4>
                    <p>{item.areaName}</p>
                    <small>
                      {item.maximumRadiusKm
                        ? `${item.maximumRadiusKm} km service radius`
                        : "Entire selected service area"}
                    </small>
                  </div>
                  <ItemActions
                    onEdit={() => setEditor({ type: "coverage", value: item })}
                    onDelete={() =>
                      setDeleteTarget({
                        type: "coverage",
                        id: item.publicId,
                        label: `${item.serviceName} coverage`,
                      })
                    }
                  />
                </article>
              ))}
            </div>
          ) : (
            <EmptyState icon="public" text="No service coverage added yet." />
          )}
          {coveragePageCount > 1 ? (
            <Pagination
              currentPage={coveragePage}
              pageCount={coveragePageCount}
              pageSize={coveragePageSize}
              totalItems={coverageItems.length}
              tokens={coveragePagination}
              itemLabel="coverage areas"
              onChange={setCoveragePage}
            />
          ) : null}
        </AvailabilitySection>
      ) : null}

      {activeView === "hours" ? (
        <AvailabilitySection
          icon="date_range"
          title="Weekly working hours"
          description={`Recurring hours shown in ${data.timeZoneId}.`}
          action="Add time slot"
          onAdd={() => setEditor({ type: "weekly" })}
        >
          <div className="availability-slot-guidance">
            <span className="material-icons">info</span>
            <div>
              <b>Add only the times you can accept jobs</b>
              <p>
                You can create multiple slots on one day, such as 9:00–12:00 and
                14:00–18:00. Assigned jobs automatically block overlapping
                times, so you cannot be double-booked.
              </p>
            </div>
          </div>
          {data.weekly.length ? (
            <div className="availability-card-grid">
              {visibleWeeklyItems.map((item) => (
                <article className="availability-item-card" key={item.publicId}>
                  <span className="availability-item-icon material-icons">
                    schedule
                  </span>
                  <div>
                    <h4>{days[item.dayOfWeek]}</h4>
                    <p>
                      {item.startLocalTime.slice(0, 5)} –{" "}
                      {item.endLocalTime.slice(0, 5)}
                    </p>
                    <small>{serviceName(item.serviceId)}</small>
                  </div>
                  <ItemActions
                    onEdit={() => setEditor({ type: "weekly", value: item })}
                    onDelete={() =>
                      setDeleteTarget({
                        type: "weekly",
                        id: item.publicId,
                        label: `${days[item.dayOfWeek]} hours`,
                      })
                    }
                  />
                </article>
              ))}
            </div>
          ) : (
            <EmptyState icon="schedule" text="No weekly hours added yet." />
          )}
          {weeklyPageCount > 1 ? (
            <nav
              className="availability-pagination"
              aria-label="Weekly hours pages"
            >
              <span className="availability-pagination-summary">
                Showing {(weeklyPage - 1) * weeklyPageSize + 1}–
                {Math.min(weeklyPage * weeklyPageSize, weeklyItems.length)} of{" "}
                {weeklyItems.length} slots
              </span>
              <div className="availability-pagination-controls">
                <button
                  type="button"
                  disabled={weeklyPage === 1}
                  onClick={() => setWeeklyPage((page) => page - 1)}
                  aria-label="Previous page"
                >
                  <span className="material-icons">chevron_left</span>
                </button>
                {weeklyPagination.map((token) =>
                  typeof token === "number" ? (
                    <button
                      type="button"
                      key={token}
                      className={token === weeklyPage ? "is-active" : ""}
                      onClick={() => setWeeklyPage(token)}
                      aria-label={`Page ${token}`}
                      aria-current={token === weeklyPage ? "page" : undefined}
                    >
                      {token}
                    </button>
                  ) : (
                    <span
                      className="availability-pagination-ellipsis"
                      key={token}
                    >
                      …
                    </span>
                  ),
                )}
                <button
                  type="button"
                  disabled={weeklyPage === weeklyPageCount}
                  onClick={() => setWeeklyPage((page) => page + 1)}
                  aria-label="Next page"
                >
                  <span className="material-icons">chevron_right</span>
                </button>
              </div>
            </nav>
          ) : null}
        </AvailabilitySection>
      ) : null}

      {activeView === "exceptions" ? (
        <AvailabilitySection
          icon="event_busy"
          title="Exceptions and time off"
          description="Breaks, blackouts, time off, or temporary available hours."
          action="Add exception"
          onAdd={() => setEditor({ type: "period" })}
        >
          {data.periods.length ? (
            <div className="availability-card-grid">
              {data.periods.map((item) => (
                <article className="availability-item-card" key={item.publicId}>
                  <span className="availability-item-icon material-icons">
                    event
                  </span>
                  <div>
                    <h4>{item.periodType.replace(/_/g, " ")}</h4>
                    <p>
                      {new Date(item.startAtUtc).toLocaleString()} –{" "}
                      {new Date(item.endAtUtc).toLocaleString()}
                    </p>
                    <small>{item.reason || serviceName(item.serviceId)}</small>
                  </div>
                  {item.isAdminOverride ? (
                    <span className="availability-admin-badge">Admin</span>
                  ) : (
                    <ItemActions
                      onEdit={() => setEditor({ type: "period", value: item })}
                      onDelete={() =>
                        setDeleteTarget({
                          type: "period",
                          id: item.publicId,
                          label: "Availability exception",
                        })
                      }
                    />
                  )}
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="event_available"
              text="No upcoming exceptions or time off."
            />
          )}
        </AvailabilitySection>
      ) : null}

      {editor
        ? createPortal(
            <div
              className="availability-modal-backdrop"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget && !busy)
                  setEditor(null);
              }}
            >
              <section
                className="availability-modal"
                role="dialog"
                aria-modal="true"
              >
                <header>
                  <div>
                    <span>{editor.value ? "EDIT" : "ADD"}</span>
                    <h3>
                      {editor.type === "coverage"
                        ? "Service coverage"
                        : editor.type === "weekly"
                          ? "Working hours"
                          : "Availability exception"}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditor(null)}
                    aria-label="Close"
                  >
                    <span className="material-icons">close</span>
                  </button>
                </header>
                <form onSubmit={saveEditor}>
                  {editor.type === "coverage" ? (
                    <CoverageFields value={editor.value} options={options} />
                  ) : null}
                  {editor.type === "weekly" ? (
                    <WeeklyFields value={editor.value} options={options} />
                  ) : null}
                  {editor.type === "period" ? (
                    <PeriodFields value={editor.value} options={options} />
                  ) : null}
                  <div className="availability-modal-actions">
                    <button
                      type="button"
                      className="is-secondary"
                      onClick={() => setEditor(null)}
                    >
                      Cancel
                    </button>
                    <button disabled={busy}>
                      <span className="material-icons">save</span>
                      {editor.value ? "Save changes" : "Add"}
                    </button>
                  </div>
                </form>
              </section>
            </div>,
            document.body,
          )
        : null}

      {deleteTarget
        ? createPortal(
            <div className="availability-modal-backdrop">
              <section
                className="availability-modal availability-delete-modal"
                role="alertdialog"
                aria-modal="true"
              >
                <span className="availability-delete-icon material-icons">
                  delete_outline
                </span>
                <h3>Remove this item?</h3>
                <p>
                  {deleteTarget.label} will be removed from your availability
                  settings.
                </p>
                <div className="availability-modal-actions">
                  <button
                    type="button"
                    className="is-secondary"
                    onClick={() => setDeleteTarget(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="is-danger"
                    disabled={busy}
                    onClick={() => void confirmDelete()}
                  >
                    Yes, remove
                  </button>
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}

function Pagination({
  currentPage,
  pageCount,
  pageSize,
  totalItems,
  tokens,
  itemLabel,
  onChange,
}: {
  currentPage: number;
  pageCount: number;
  pageSize: number;
  totalItems: number;
  tokens: Array<number | string>;
  itemLabel: string;
  onChange: (page: number) => void;
}) {
  return (
    <nav className="availability-pagination" aria-label={`${itemLabel} pages`}>
      <span className="availability-pagination-summary">
        Showing {(currentPage - 1) * pageSize + 1}–
        {Math.min(currentPage * pageSize, totalItems)} of {totalItems}{" "}
        {itemLabel}
      </span>
      <div className="availability-pagination-controls">
        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => onChange(currentPage - 1)}
          aria-label="Previous page"
        >
          <span className="material-icons">chevron_left</span>
        </button>
        {tokens.map((token) =>
          typeof token === "number" ? (
            <button
              type="button"
              key={token}
              className={token === currentPage ? "is-active" : ""}
              onClick={() => onChange(token)}
              aria-label={`Page ${token}`}
              aria-current={token === currentPage ? "page" : undefined}
            >
              {token}
            </button>
          ) : (
            <span className="availability-pagination-ellipsis" key={token}>
              …
            </span>
          ),
        )}
        <button
          type="button"
          disabled={currentPage === pageCount}
          onClick={() => onChange(currentPage + 1)}
          aria-label="Next page"
        >
          <span className="material-icons">chevron_right</span>
        </button>
      </div>
    </nav>
  );
}

function AvailabilitySection({
  icon,
  title,
  description,
  action,
  onAdd,
  children,
}: {
  icon: string;
  title: string;
  description: string;
  action: string;
  onAdd: () => void;
  children: ReactNode;
}) {
  return (
    <section className="availability-section">
      <header>
        <div>
          <span className="availability-section-icon material-icons">
            {icon}
          </span>
          <div>
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
        </div>
        <button type="button" onClick={onAdd}>
          <span className="material-icons">add</span>
          {action}
        </button>
      </header>
      {children}
    </section>
  );
}
function ItemActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="availability-item-actions">
      <button type="button" onClick={onEdit} aria-label="Edit" title="Edit">
        <span className="material-icons">edit</span>
      </button>
      <button
        type="button"
        className="is-danger"
        onClick={onDelete}
        aria-label="Delete"
        title="Delete"
      >
        <span className="material-icons">delete_outline</span>
      </button>
    </div>
  );
}
function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="availability-empty">
      <span className="material-icons">{icon}</span>
      <p>{text}</p>
    </div>
  );
}
function CoverageFields({
  value,
  options,
}: {
  value?: Coverage;
  options: AvailabilityOptions;
}) {
  return (
    <>
      {value ? (
        <>
          <input type="hidden" name="serviceId" value={value.serviceId} />
          <input type="hidden" name="areaId" value={value.areaId} />
        </>
      ) : null}
      <label>
        <span>Service</span>
        <select
          name={value ? undefined : "serviceId"}
          required
          defaultValue={value?.serviceId || ""}
          disabled={Boolean(value)}
        >
          <option value="">Choose a service</option>
          {options.services.map((item) => (
            <option value={item.id} key={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Service area</span>
        <select
          name={value ? undefined : "areaId"}
          required
          defaultValue={value?.areaId || ""}
          disabled={Boolean(value)}
        >
          <option value="">Choose an area</option>
          {options.areas.map((item) => (
            <option value={item.publicId} key={item.publicId}>
              {item.name} · {item.countryCode}
            </option>
          ))}
        </select>
      </label>
      <div className="availability-form-grid">
        <label>
          <span>
            Origin latitude <small>optional</small>
          </span>
          <input
            name="latitude"
            type="number"
            step="0.000001"
            defaultValue={value?.originLatitude ?? ""}
          />
        </label>
        <label>
          <span>
            Origin longitude <small>optional</small>
          </span>
          <input
            name="longitude"
            type="number"
            step="0.000001"
            defaultValue={value?.originLongitude ?? ""}
          />
        </label>
      </div>
      <label>
        <span>
          Maximum radius <small>optional</small>
        </span>
        <div className="availability-input-suffix">
          <input
            name="radius"
            type="number"
            step="0.1"
            min="0.1"
            max="1000"
            defaultValue={value?.maximumRadiusKm ?? ""}
          />
          <small>km</small>
        </div>
      </label>
      <p className="availability-form-help">
        Leave coordinates and radius empty to cover the entire selected service
        area.
      </p>
    </>
  );
}
function WeeklyFields({
  value,
  options,
}: {
  value?: Weekly;
  options: AvailabilityOptions;
}) {
  return (
    <>
      <label>
        <span>Applies to</span>
        <select name="serviceId" defaultValue={value?.serviceId || ""}>
          <option value="">All qualified services</option>
          {options.services.map((item) => (
            <option value={item.id} key={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Day</span>
        <select name="day" defaultValue={value?.dayOfWeek ?? 1}>
          {days.map((day, index) => (
            <option value={index} key={day}>
              {day}
            </option>
          ))}
        </select>
      </label>
      <div className="availability-form-grid">
        <label>
          <span>Start time</span>
          <input
            name="start"
            type="time"
            required
            defaultValue={value?.startLocalTime.slice(0, 5) || "09:00"}
          />
        </label>
        <label>
          <span>End time</span>
          <input
            name="end"
            type="time"
            required
            defaultValue={value?.endLocalTime.slice(0, 5) || "17:00"}
          />
        </label>
      </div>
      <p className="availability-form-help">
        For an overnight shift, create two separate time ranges.
      </p>
    </>
  );
}
function PeriodFields({
  value,
  options,
}: {
  value?: Period;
  options: AvailabilityOptions;
}) {
  return (
    <>
      <label>
        <span>Applies to</span>
        <select name="serviceId" defaultValue={value?.serviceId || ""}>
          <option value="">All services</option>
          {options.services.map((item) => (
            <option value={item.id} key={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Exception type</span>
        <select name="type" defaultValue={value?.periodType || "TIME_OFF"}>
          <option value="BREAK">Break</option>
          <option value="BLACKOUT">Blackout</option>
          <option value="TIME_OFF">Time off</option>
          <option value="AVAILABLE_OVERRIDE">Available override</option>
        </select>
      </label>
      <div className="availability-form-grid">
        <label>
          <span>Starts</span>
          <input
            name="start"
            type="datetime-local"
            required
            defaultValue={localDateTime(value?.startAtUtc)}
          />
        </label>
        <label>
          <span>Ends</span>
          <input
            name="end"
            type="datetime-local"
            required
            defaultValue={localDateTime(value?.endAtUtc)}
          />
        </label>
      </div>
      <label>
        <span>
          Reason <small>optional</small>
        </span>
        <input
          name="reason"
          defaultValue={value?.reason || ""}
          placeholder="Example: Personal appointment"
        />
      </label>
    </>
  );
}
