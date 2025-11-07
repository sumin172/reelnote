import type { Metadata } from "next";
import ReviewsList from "./ReviewsList";

export const metadata: Metadata = {
  title: "리뷰 목록",
  description: "작성된 영화 리뷰들을 확인하고 관리해보세요",
};

export default function ReviewsPage() {
  return <ReviewsList />;
}
