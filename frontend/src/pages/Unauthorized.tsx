export default function Unauthorized() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="max-w-md rounded-lg border border-amber-200 bg-amber-50 px-6 py-5 text-center text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
        <h1 className="text-xl font-semibold">Access denied</h1>
        <p className="mt-2 text-sm">
          You are signed in, but you do not have permission to view this page.
        </p>
      </div>
    </div>
  );
}
