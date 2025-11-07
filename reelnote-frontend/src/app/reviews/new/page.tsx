import type { Metadata } from "next";
import ReviewCreateForm from "./ReviewCreateForm";

export const metadata: Metadata = {
  title: "리뷰 작성",
  description: "새로운 영화 리뷰를 작성하고 평점을 남겨보세요",
};

export default function ReviewCreatePage() {
  return <ReviewCreateForm />;
}
