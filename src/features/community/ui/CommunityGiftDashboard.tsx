import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { communityApi } from "../api/communityApi";
import { getAddressPlaceDetail, searchAddressPredictions, type AddressPrediction } from "../../../shared/api/addressAutocompleteApi";
import { getLocationCities, getLocationCountries, getLocationStates, type CityOption, type CountryOption, type StateOption } from "../../../shared/api/locationMastersApi";
import "./giftSetup.css";
type Data = Record<string, unknown>;
export default function CommunityGiftDashboard({
  items,
  done,
}: {
  items: Data[];
  done: () => Promise<void>;
}) {
  const [showCreate, setShowCreate] = useState(false),
    [selected, setSelected] = useState<Data>(),
    [detail, setDetail] = useState<Data>(),
    [showItem, setShowItem] = useState(false),
    [showRegistryEdit, setShowRegistryEdit] = useState(false),
    [editingItem, setEditingItem] = useState<Data>(),
    [confirmAction, setConfirmAction] = useState<{
      kind: "registry" | "item";
      item?: Data;
    }>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function open(item: Data) {
    setSelected(item);
    setError("");
    try {
      setDetail(await communityApi.giftRegistry(Number(item.id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to open registry.");
    }
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const imageUrl = await giftImageFrom(form);
      const registry = await communityApi.createRegistry({
        title: form.get("title"),
        recipientName: form.get("recipientName"),
        recipientPhone: form.get("recipientPhone"),
        description: form.get("description"),
        visibility: form.get("visibility"),
        recipientAddress: form.get("recipientAddress"),
        deliveryCountry: form.get("deliveryCountry"),
        deliveryState: form.get("deliveryState"),
        deliveryCity: form.get("deliveryCity"),
        deliveryPostalCode: form.get("deliveryPostalCode"),
      });
      await communityApi.addGiftRegistryItem(registry.id, {
        name: form.get("giftName"),
        description: form.get("giftDescription"),
        imageUrl,
        externalUrl: form.get("externalUrl") || undefined,
        desiredAmount: Number(form.get("desiredAmount")) || undefined,
        desiredQuantity: Number(form.get("desiredQuantity")) || 1,
      });
      setShowCreate(false);
      await done();
      const created = { id: registry.id, title: form.get("title") };
      setSelected(created);
      setDetail(await communityApi.giftRegistry(registry.id));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to create gift registry.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const imageUrl = await giftImageFrom(form);
      await communityApi.addGiftRegistryItem(Number(selected.id), {
        name: form.get("name"),
        description: form.get("description"),
        imageUrl,
        externalUrl: form.get("externalUrl") || undefined,
        desiredAmount: Number(form.get("desiredAmount")) || undefined,
        desiredQuantity: Number(form.get("desiredQuantity")) || 1,
      });
      setDetail(await communityApi.giftRegistry(Number(selected.id)));
      setShowItem(false);
      await done();
    } finally {
      setBusy(false);
    }
  }
  async function editRegistry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await communityApi.updateGiftRegistry(Number(selected.id), {
        title: form.get("title"),
        recipientName: form.get("recipientName"),
        recipientPhone: form.get("recipientPhone"),
        description: form.get("description"),
        visibility: form.get("visibility"),
        recipientAddress:
          String(form.get("recipientAddress") || "").trim() || undefined,
        deliveryCountry: form.get("deliveryCountry"),
        deliveryState: form.get("deliveryState"),
        deliveryCity: form.get("deliveryCity"),
        deliveryPostalCode: form.get("deliveryPostalCode"),
      });
      await done();
      setDetail(await communityApi.giftRegistry(Number(selected.id)));
      setShowRegistryEdit(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update registry.");
    } finally {
      setBusy(false);
    }
  }
  async function archiveRegistry() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      await communityApi.archiveGiftRegistry(Number(selected.id));
      setSelected(undefined);
      setDetail(undefined);
      await done();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Complete or cancel active gift orders before archiving.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function editItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingItem) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const imageUrl = await giftImageFrom(form);
      await communityApi.updateGiftItem(Number(editingItem.id), {
        name: form.get("name"),
        description: form.get("description"),
        imageUrl,
        externalUrl: form.get("externalUrl") || undefined,
        desiredAmount: Number(form.get("desiredAmount")) || undefined,
        desiredQuantity: Number(form.get("desiredQuantity")) || 1,
      });
      setDetail(await communityApi.giftRegistry(Number(selected?.id)));
      await done();
      setEditingItem(undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update gift.");
    } finally {
      setBusy(false);
    }
  }
  async function deleteItem(item: Data) {
    setBusy(true);
    setError("");
    try {
      await communityApi.deleteGiftItem(Number(item.id));
      setDetail(await communityApi.giftRegistry(Number(selected?.id)));
      await done();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Gifts with orders cannot be deleted.",
      );
    } finally {
      setBusy(false);
    }
  }
  const giftItems = Array.isArray(detail?.items)
    ? (detail.items as Data[])
    : [];
  return (
    <>
      <div className="community-list-head gift-dashboard-head">
        <div>
          <h2>Gift registries</h2>
          <p>Create a registry, add gifts and securely coordinate delivery.</p>
        </div>
        <div className="gift-dashboard-actions">
          <button
            className="community-create-button"
            onClick={() => setShowCreate(true)}
            disabled={busy}
          >
            <span className="material-icons">card_giftcard</span>New registry
          </button>
        </div>
      </div>
      {error ? <p className="community-error">{error}</p> : null}
      <div className="gift-registry-grid">
        {items.map((item, index) => (
          <article key={String(item.id ?? index)}>
            <div className="gift-registry-art">
              <span className="material-icons">redeem</span>
              <small>{String(item.visibility || "PRIVATE")}</small>
            </div>
            <div>
              <h3>{String(item.title || "Gift registry")}</h3>
              <p>
                {String(
                  item.description ||
                    "A curated collection of meaningful gift ideas.",
                )}
              </p>
              <span>{Number(item.itemCount || 0)} gift ideas</span>
              <button className="gift-open" onClick={() => void open(item)}>
                Manage registry
              </button>
            </div>
          </article>
        ))}
      </div>
      {selected && detail ? (
        <section className="gift-detail">
          <header>
            <div>
              <small>REGISTRY ITEMS</small>
              <h2>{String(detail.title || selected.title)}</h2>
            </div>
            <div className="gift-manage-actions">
              <button onClick={() => setShowItem(true)} disabled={busy}>
                <span className="material-icons">add</span>Add gift idea
              </button>
              <button onClick={() => setShowRegistryEdit(true)} disabled={busy}>
                <span className="material-icons">edit</span>Edit registry
              </button>
              <button
                className="gift-danger"
                onClick={() => setConfirmAction({ kind: "registry" })}
                disabled={busy}
              >
                <span className="material-icons">archive</span>Archive
              </button>
            </div>
          </header>
          <div className="gift-item-grid">
            {giftItems.map((item) => (
              <article key={String(item.id)}>
                {item.imageUrl ? (
                  <img src={giftImageUrl(String(item.imageUrl))} alt="" />
                ) : (
                  <div className="gift-owner-image-fallback" aria-label="Gift image unavailable">
                    <span aria-hidden="true">🎁</span>
                    <small>Gift</small>
                  </div>
                )}
                <div>
                  <h3>{String(item.name)}</h3>
                  <p>{String(item.description || "")}</p>
                  <strong>
                    {Number(item.desiredAmount || 0) > 0
                      ? Number(item.desiredAmount).toLocaleString(undefined, {
                          style: "currency",
                          currency: String(item.currency || "USD"),
                        })
                      : "Any amount"}
                  </strong>
                  <small>
                    {Number(item.purchasedQuantity || 0)} of{" "}
                    {Number(item.desiredQuantity || 1)} received
                  </small>
                  {item.externalUrl ? (
                    <a
                      href={String(item.externalUrl)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View item
                    </a>
                  ) : null}
                  <div className="gift-item-actions">
                    <button
                      onClick={async () => {
                        setBusy(true);
                        setError("");
                        try {
                          await communityApi.sendGiftItem(Number(item.id));
                          window.dispatchEvent(new Event("gift-orders-changed"));
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "Unable to start this gift order.");
                        } finally {
                          setBusy(false);
                        }
                      }}
                      disabled={busy || Number(item.desiredAmount || 0) <= 0}
                    >
                      Buy &amp; send
                    </button>
                    <button
                      onClick={() => setEditingItem(item)}
                      disabled={busy}
                    >
                      Edit
                    </button>
                    <button
                      className="gift-danger"
                      onClick={() => setConfirmAction({ kind: "item", item })}
                      disabled={busy}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      {showCreate ? (
        <Modal
          title="Create registry & first gift"
          icon="card_giftcard"
          close={() => setShowCreate(false)}
        >
          <form className="gift-form gift-setup-form" onSubmit={create}>
            <Step number="1" label="Registry details" />
            <label>
              Registry title
              <input
                name="title"
                required
                placeholder="Birthday or celebration gifts"
              />
            </label>
            <div>
              <label>
                Friend's name
                <input name="recipientName" required placeholder="Gift recipient name" />
              </label>
              <label>
                Friend's phone
                <input name="recipientPhone" type="tel" required placeholder="Delivery contact number" />
              </label>
            </div>
            <div className="gift-visibility-row">
              <label>
                Visibility
                <select name="visibility">
                  <option value="PRIVATE">
                    Private — invited customers only
                  </option>
                  <option value="PUBLIC">
                    Public — community can discover
                  </option>
                </select>
              </label>
            </div>
            <label>
              Message for gift buyers
              <textarea
                name="description"
                placeholder="Tell your community about this occasion"
              />
            </label>
            <DeliveryAddressFields />
            <Step number="2" label="Add your first gift" />
            <label>
              Gift name
              <input name="giftName" required placeholder="Gift name" />
            </label>
            <label>
              Gift description
              <textarea
                name="giftDescription"
                placeholder="Size, colour or other helpful details"
              />
            </label>
            <div>
              <label>
                Store URL
                <input
                  name="externalUrl"
                  type="url"
                  placeholder="https://..."
                />
              </label>
            </div>
            <GiftImageFields />
            <div>
              <label>
                Estimated price
                <input name="desiredAmount" type="number" min="0" step="0.01" />
              </label>
              <label>
                Quantity
                <input
                  name="desiredQuantity"
                  type="number"
                  min="1"
                  defaultValue="1"
                />
              </label>
            </div>
            <p className="gift-address-note">
              <span className="material-icons">lock</span>The address is
              encrypted and shown only after a customer reserves a gift.
            </p>
            <button disabled={busy}>
              {busy ? "Creating…" : "Create registry & gift"}
            </button>
          </form>
        </Modal>
      ) : null}
      {showRegistryEdit && detail ? (
        <Modal
          title="Edit gift registry"
          icon="edit"
          close={() => setShowRegistryEdit(false)}
        >
          <form className="gift-form" onSubmit={editRegistry}>
            <label>
              Registry title
              <input
                name="title"
                required
                defaultValue={String(detail.title || "")}
              />
            </label>
            <label>
              Description
              <textarea
                name="description"
                defaultValue={String(detail.description || "")}
              />
            </label>
            <div>
              <label>
                Friend's name
                <input name="recipientName" required defaultValue={String(detail.recipientName || "")} />
              </label>
              <label>
                Friend's phone
                <input name="recipientPhone" type="tel" required defaultValue={String(detail.recipientPhone || "")} />
              </label>
            </div>
            <label>
              Visibility
              <select
                name="visibility"
                defaultValue={String(detail.visibility || "PRIVATE")}
              >
                <option value="PUBLIC">Public</option>
                <option value="PRIVATE">Private</option>
                <option value="INVITEES">Invitees only</option>
              </select>
            </label>
            <DeliveryAddressFields
              optionalAddress
              initialCountry={String(detail.deliveryCountry || "")}
              initialState={String(detail.deliveryState || "")}
              initialCity={String(detail.deliveryCity || "")}
              initialPostalCode={String(detail.deliveryPostalCode || "")}
            />
            <button disabled={busy}>
              {busy ? "Saving…" : "Save registry"}
            </button>
          </form>
        </Modal>
      ) : null}
      {editingItem ? (
        <Modal
          title="Edit gift idea"
          icon="edit"
          close={() => setEditingItem(undefined)}
        >
          <form className="gift-form" onSubmit={editItem}>
            <label>
              Gift name
              <input
                name="name"
                required
                defaultValue={String(editingItem.name || "")}
              />
            </label>
            <label>
              Description
              <textarea
                name="description"
                defaultValue={String(editingItem.description || "")}
              />
            </label>
            <div>
              <label>
                Merchant URL
                <input
                  name="externalUrl"
                  type="url"
                  defaultValue={String(editingItem.externalUrl || "")}
                />
              </label>
            </div>
            <GiftImageFields initialUrl={String(editingItem.imageUrl || "")} />
            <div>
              <label>
                Estimated price
                <input
                  name="desiredAmount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  defaultValue={String(editingItem.desiredAmount || "")}
                />
              </label>
              <label>
                Quantity
                <input
                  name="desiredQuantity"
                  type="number"
                  min="1"
                  max="100"
                  defaultValue={Number(editingItem.desiredQuantity || 1)}
                />
              </label>
            </div>
            <button disabled={busy}>{busy ? "Saving…" : "Save gift"}</button>
          </form>
        </Modal>
      ) : null}
      {confirmAction ? (
        <Modal
          title={
            confirmAction.kind === "registry"
              ? "Archive registry"
              : "Delete gift idea"
          }
          icon="warning"
          close={() => setConfirmAction(undefined)}
        >
          <div className="gift-confirm">
            <p>
              {confirmAction.kind === "registry"
                ? "This registry will disappear from customer discovery. Registries with active orders cannot be archived."
                : `${String(confirmAction.item?.name || "This gift")} will be removed. Gifts with an order cannot be deleted.`}
            </p>
            <div>
              <button
                className="gift-secondary"
                onClick={() => setConfirmAction(undefined)}
              >
                Cancel
              </button>
              <button
                className="gift-danger"
                disabled={busy}
                onClick={async () => {
                  const action = confirmAction;
                  setConfirmAction(undefined);
                  if (action.kind === "registry") await archiveRegistry();
                  else if (action.item) await deleteItem(action.item);
                }}
              >
                {busy
                  ? "Working…"
                  : confirmAction.kind === "registry"
                    ? "Archive registry"
                    : "Delete gift"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
      {showItem ? (
        <Modal
          title="Add a gift idea"
          icon="redeem"
          close={() => setShowItem(false)}
        >
          <form className="gift-form" onSubmit={addItem}>
            <label>
              Gift name
              <input name="name" required />
            </label>
            <label>
              Description
              <textarea name="description" />
            </label>
            <GiftImageFields />
            <label>
              Store URL
              <input name="externalUrl" type="url" />
            </label>
            <div>
              <label>
                Estimated price
                <input name="desiredAmount" type="number" min="0" step="0.01" />
              </label>
              <label>
                Quantity
                <input
                  name="desiredQuantity"
                  type="number"
                  min="1"
                  defaultValue="1"
                />
              </label>
            </div>
            <button disabled={busy}>Add gift idea</button>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
function giftImageUrl(value: string) {
  if (!value.startsWith("/uploads/")) return value;
  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:5145/api";
  return `${apiBase.replace(/\/api\/?$/i, "")}${value}`;
}
async function giftImageFrom(form: FormData) {
  const file = form.get("imageFile");
  if (file instanceof File && file.size) return (await communityApi.uploadMedia(file, "GiftImage")).url;
  return String(form.get("imageUrl") || "").trim() || undefined;
}
function GiftImageFields({ initialUrl = "" }: { initialUrl?: string }) {
  const [url, setUrl] = useState(initialUrl), [preview, setPreview] = useState(initialUrl ? giftImageUrl(initialUrl) : ""), [fileName, setFileName] = useState("");
  useEffect(() => () => { if (preview.startsWith("blob:")) URL.revokeObjectURL(preview); }, [preview]);
  return <section className="gift-image-fields">
    <label>Image URL<input name="imageUrl" type="url" value={url} onChange={event => { setUrl(event.target.value); setPreview(event.target.value); }} placeholder="https://..." /></label>
    <span className="gift-image-or">or</span>
    <label className="gift-image-upload"><span className="material-icons">upload</span><span>{fileName || "Upload image"}</span><small>JPG, PNG or WebP · max 15 MB</small><input name="imageFile" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { const file = event.target.files?.[0]; setFileName(file?.name || ""); if (preview.startsWith("blob:")) URL.revokeObjectURL(preview); setPreview(file ? URL.createObjectURL(file) : url); }} /></label>
    {preview ? <img className="gift-image-preview" src={preview.startsWith("/uploads/") ? giftImageUrl(preview) : preview} alt="Gift preview" /> : null}
  </section>;
}
function DeliveryAddressFields({ initialCountry = "", initialState = "", initialCity = "", initialPostalCode = "", optionalAddress = false }: { initialCountry?: string; initialState?: string; initialCity?: string; initialPostalCode?: string; optionalAddress?: boolean }) {
  const [address, setAddress] = useState(""), [country, setCountry] = useState(initialCountry), [state, setState] = useState(initialState), [city, setCity] = useState(initialCity), [postalCode, setPostalCode] = useState(initialPostalCode), [suggestions, setSuggestions] = useState<AddressPrediction[]>([]), [searching, setSearching] = useState(false);
  const [countries, setCountries] = useState<CountryOption[]>([]), [states, setStates] = useState<StateOption[]>([]), [cities, setCities] = useState<CityOption[]>([]);
  useEffect(() => { void getLocationCountries().then(setCountries); }, []);
  useEffect(() => {
    const selected = countries.find(item => item.name.toLowerCase() === country.toLowerCase() || item.code.toLowerCase() === country.toLowerCase());
    if (!selected) { setStates([]); return; }
    void getLocationStates(selected.id).then(setStates);
  }, [country, countries]);
  useEffect(() => {
    const selected = states.find(item => item.name.toLowerCase() === state.toLowerCase() || item.code.toLowerCase() === state.toLowerCase());
    if (!selected) { setCities([]); return; }
    void getLocationCities(selected.id).then(setCities);
  }, [state, states]);
  useEffect(() => {
    if (address.trim().length < 3) { setSuggestions([]); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try { setSearching(true); setSuggestions(await searchAddressPredictions(address, country, state, city, controller.signal)); }
      catch { if (!controller.signal.aborted) setSuggestions([]); }
      finally { if (!controller.signal.aborted) setSearching(false); }
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [address, country, state, city]);
  async function selectAddress(suggestion: AddressPrediction) {
    setSearching(true);
    try { const detail = await getAddressPlaceDetail(suggestion.placeId); setAddress(detail.formattedAddress || suggestion.description); setCountry(detail.country || country); setState(detail.state || state); setCity(detail.city || city); setPostalCode(detail.postalCode || postalCode); setSuggestions([]); }
    finally { setSearching(false); }
  }
  return <section className="gift-delivery-fields">
    <label className="gift-address-autocomplete">{optionalAddress ? "New delivery address" : "Delivery address"}{optionalAddress ? <small> Leave blank to keep the current encrypted address.</small> : null}
      <input name="recipientAddress" value={address} onChange={event => setAddress(event.target.value)} required={!optionalAddress} autoComplete="street-address" placeholder="Start typing the recipient address" />
      {searching ? <span className="gift-address-status">Finding addresses…</span> : null}
      {suggestions.length ? <div className="gift-address-suggestions" role="listbox">{suggestions.map(suggestion => <button type="button" key={suggestion.placeId} onClick={() => void selectAddress(suggestion)}><span className="material-icons">location_on</span>{suggestion.description}</button>)}</div> : null}
    </label>
    <div className="gift-location-grid">
      <label>Country<select name="deliveryCountry" value={country} onChange={event => { setCountry(event.target.value); setState(""); setCity(""); }} required><option value="">Select country</option>{country && !countries.some(item => item.name === country) ? <option value={country}>{country}</option> : null}{countries.map(item => <option value={item.name} key={item.id}>{item.name}</option>)}</select></label>
      <label>State / province<select name="deliveryState" value={state} onChange={event => { setState(event.target.value); setCity(""); }} required disabled={!country}><option value="">Select state / province</option>{state && !states.some(item => item.name === state) ? <option value={state}>{state}</option> : null}{states.map(item => <option value={item.name} key={item.id}>{item.name}</option>)}</select></label>
      <label>City<select name="deliveryCity" value={city} onChange={event => setCity(event.target.value)} required disabled={!state}><option value="">Select city</option>{city && !cities.some(item => item.name === city) ? <option value={city}>{city}</option> : null}{cities.map(item => <option value={item.name} key={item.id}>{item.name}</option>)}</select></label>
      <label>ZIP / postal code<input name="deliveryPostalCode" value={postalCode} onChange={event => setPostalCode(event.target.value)} required placeholder="ZIP / postal code" autoComplete="postal-code" /></label>
    </div>
    <small className="gift-address-help">Select an address to auto-fill these fields, or edit them manually.</small>
  </section>;
}
function Step({ number, label }: { number: string; label: string }) {
  return (
    <div className="gift-form-step">
      <b>{number}</b>
      <span>{label}</span>
    </div>
  );
}
function Modal({
  title,
  icon,
  close,
  children,
}: {
  title: string;
  icon: string;
  close: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="community-modal"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="community-modal-card">
        <header>
          <div>
            <span className="material-icons">{icon}</span>
            <div>
              <small>COMMUNITY GIFTS</small>
              <h2>{title}</h2>
            </div>
          </div>
          <button onClick={close}>×</button>
        </header>
        {children}
      </div>
    </div>
  );
}
