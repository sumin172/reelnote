import type { Metadata } from "next";
import CatalogSearch from "./CatalogSearch";

export const metadata: Metadata = {
  title: "영화 카탈로그",
  description: "다양한 영화를 검색하고 탐색해보세요",
};

export default function CatalogPage() {
  return <CatalogSearch />;
}
