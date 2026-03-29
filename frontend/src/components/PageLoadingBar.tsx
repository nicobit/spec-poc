export default function PageLoadingBar() {
  return (
    <div
      role="progressbar"
      aria-label="Page loading"
      aria-valuetext="Loading"
      className="ui-page-loading-bar"
    >
      <span className="ui-page-loading-bar__indicator" />
    </div>
  );
}
