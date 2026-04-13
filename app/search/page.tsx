import { Suspense } from "react";
import { SearchResultsPage } from "../components/search-results-page.jsx";

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchResultsPage />
    </Suspense>
  );
}
