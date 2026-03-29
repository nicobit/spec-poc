type Props = {
  loading?: boolean;
};

export default function PageLoadingBar({ loading = false }: Props) {
  return (
    <div
      role="presentation"
      aria-hidden={loading ? undefined : true}
      className={`ui-page-loading-bar-slot ${loading ? 'is-loading' : ''}`}
    >
      <div
        role="progressbar"
        aria-label="Page loading"
        aria-valuetext="Loading"
        className="ui-page-loading-bar"
      >
        <span className="ui-page-loading-bar__indicator" />
      </div>
    </div>
  );
}
