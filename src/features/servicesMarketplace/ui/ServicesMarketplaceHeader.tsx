import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import chaoDesiOrangeLogo from "../../../images/logo-web-orange.png";
import { useHomeSelectedLocation } from "../../home/hooks/useHomeSelectedLocation";

type Props = {
  onSearch?: (value: string) => void;
};

export default function ServicesMarketplaceHeader({ onSearch }: Props) {
  const { activeCity, activeLocationLabel } = useHomeSelectedLocation();
  const [search, setSearch] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch?.(search.trim());
  }

  return (
    <header className="services-storefront-header">
      <div className="services-storefront-header-inner">
        <Link to="/dashboard/services-marketplace" className="services-storefront-logo" aria-label="Chao Desi Services">
          <img src={chaoDesiOrangeLogo} alt="Chao Desi" />
        </Link>
        <nav aria-label="Popular services" className="services-storefront-nav">
          <a href="#services-categories">Home services</a>
          <a href="#services-categories">Repairs</a>
          <a href="#services-categories">Cleaning</a>
        </nav>
        <div className="services-storefront-location" aria-label="Selected service location">
          <span className="material-icons" aria-hidden="true">location_on</span>
          <span>{activeLocationLabel || activeCity || "Choose your location"}</span>
          <span className="material-icons" aria-hidden="true">expand_more</span>
        </div>
        <form className="services-storefront-search" onSubmit={submit}>
          <span className="material-icons" aria-hidden="true">search</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search for a service" aria-label="Search for a service" />
        </form>
        <Link className="services-storefront-icon" to="/dashboard/services-marketplace" aria-label="My bookings">
          <span className="material-icons" aria-hidden="true">shopping_cart</span>
        </Link>
        <Link className="services-storefront-icon" to="/dashboard/my-profile" aria-label="My profile">
          <span className="material-icons" aria-hidden="true">person_outline</span>
        </Link>
      </div>
    </header>
  );
}
