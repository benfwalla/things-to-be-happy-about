import { Rss } from "@phosphor-icons/react";
import "./TopSection.css";

type TopSectionProps = {
  isAdmin?: boolean;
  onCreateNew?: () => void;
  onLogout?: () => void;
};

export default function TopSection({
  isAdmin = false,
  onCreateNew,
  onLogout,
}: TopSectionProps) {
  return (
    <div className={`top-section ${isAdmin ? "top-section--admin" : ""}`}>
      <div className="top-section__row top-section__row--main">
        <h1 className="top-section__title">
          <a href="/" className="top-section__title-link">
            things to be happy about
          </a>
        </h1>
        <a
          href="/feed"
          target="_blank"
          rel="noopener noreferrer"
          className="top-section__rss-link"
          title="Subscribe to RSS feed"
        >
          <Rss size={24} weight="regular" />
        </a>
      </div>

      {isAdmin && (
        <div className="top-section__row top-section__row--actions">
          <button
            onClick={onCreateNew}
            className="top-section__button top-section__button--new"
          >
            + New
          </button>
          <button
            onClick={onLogout}
            className="top-section__button top-section__button--logout"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
