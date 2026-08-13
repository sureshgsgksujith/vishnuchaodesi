import { apiClient } from "../../../shared/api/client";

export type BlogPost = {
  id: number; title: string; slug: string; excerpt: string; content?: string | null; category: string;
  authorName: string; featuredImageUrl?: string | null; status: string; seoTitle?: string | null;
  seoDescription?: string | null; viewCount: number; publishedAt?: string | null; createdAt: string;
};

export type BlogPostList = { items: BlogPost[]; totalCount: number; page: number; pageSize: number };

export async function getBlogPosts(params?: { search?: string; category?: string; page?: number; pageSize?: number }) {
  const response = await apiClient.get<BlogPostList>("/blog-posts", { params });
  return response.data;
}

export async function getBlogPost(slug: string) {
  const response = await apiClient.get<BlogPost>(`/blog-posts/${encodeURIComponent(slug)}`);
  return response.data;
}
