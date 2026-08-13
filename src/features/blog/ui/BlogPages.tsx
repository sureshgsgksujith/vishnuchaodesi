import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import CustomerHeader from "../../home/ui/CustomerHeader";
import HomeFooterSection from "../../home/ui/HomeFooterSection";
import { getBlogPost, getBlogPosts, type BlogPost } from "../api/blogApi";
import "./blog.css";
import "./blogEnhancements.css";
import "./blogRefresh.css";

const PAGE_SIZE = 9;
const categories = ["", "Community", "Local Services", "Home & Safety"];

export function PublicBlogPostsPage() {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<BlogPost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const search = params.get("search") || "";
  const category = params.get("category") || "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    let active = true; setLoading(true);
    getBlogPosts({ search: search || undefined, category: category || undefined, page, pageSize: PAGE_SIZE })
      .then((result) => { if (active) { setItems(result.items); setTotal(result.totalCount); } })
      .catch(() => active && setItems([])).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [page, search, category]);

  function updateParams(next: { search?: string; category?: string; page?: number }) {
    const values: Record<string, string> = {};
    const nextSearch = next.search ?? search; const nextCategory = next.category ?? category; const nextPage = next.page ?? 1;
    if (nextSearch) values.search = nextSearch; if (nextCategory) values.category = nextCategory; if (nextPage > 1) values.page = String(nextPage);
    setParams(values);
  }

  return <><CustomerHeader /><main className="public-blog-page blog-marketplace">
    <section className="public-blog-hero"><div className="blog-hero-copy"><span>ChaoDesi Stories</span><h1>Ideas for living, working, and thriving locally</h1><p>Practical guidance, community updates, and helpful stories for Indian communities across the United States.</p><div className="blog-hero-meta"><b><span className="material-icons">auto_stories</span>Practical guides</b><b><span className="material-icons">groups</span>Community focused</b><b><span className="material-icons">location_on</span>Local insight</b></div></div><div className="blog-hero-art"><span className="material-icons">format_quote</span><strong>Discover.<br />Learn.<br />Connect.</strong></div></section>
    <section className="public-blog-content">
      <div className="blog-discovery"><form className="public-blog-search" onSubmit={(event) => { event.preventDefault(); const value = String(new FormData(event.currentTarget).get("search") || "").trim(); updateParams({ search: value }); }}><span className="material-icons">search</span><input name="search" defaultValue={search} placeholder="Search articles, guides, and stories" /><button>Find stories</button></form><div className="blog-category-chips">{categories.map((name) => <button key={name || "all"} className={category === name ? "active" : ""} onClick={() => updateParams({ category: name })}>{name || "All stories"}</button>)}</div></div>
      <div className="blog-results-head"><div><span>Latest from ChaoDesi</span><h2>{category || "Featured stories"}</h2></div><b>{total} {total === 1 ? "article" : "articles"}</b></div>
      {loading ? <div className="blog-loading"><i /><i /><i /></div> : null}
      {!loading && !items.length ? <div className="public-blog-state"><span className="material-icons">article</span><h2>No published articles found</h2><p>Try another search or category.</p></div> : null}
      {!loading ? <div className="public-blog-grid">{items.map((post) => <Link className="public-blog-card" to={`/blog/${post.slug}`} key={post.id} aria-label={`Read ${post.title}`}><article>
        <div className={`blog-card-visual tone-${categoryTone(post.category)}`}>{post.featuredImageUrl ? <img src={resolveBlogImageUrl(post.featuredImageUrl)} alt="" /> : <><span className="material-icons">{categoryIcon(post.category)}</span><small>{post.category}</small></>}</div>
        <div className="blog-card-content"><span>{post.category}</span><h2>{post.title}</h2><p>{post.excerpt}</p><div className="blog-card-footer"><div><b>{authorInitials(post.authorName)}</b><small>{post.authorName}<em>{formatDate(post.publishedAt || post.createdAt)} · {post.viewCount} views</em></small></div><strong><span className="material-icons">arrow_forward</span></strong></div></div>
      </article></Link>)}</div> : null}
      {totalPages > 1 ? <nav className="public-blog-pagination" aria-label="Blog pagination"><button disabled={page <= 1} onClick={() => updateParams({ page: page - 1 })}>← Previous</button><div className="public-blog-page-numbers">{Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => <button key={number} className={number === page ? "active" : ""} onClick={() => updateParams({ page: number })}>{number}</button>)}</div><button disabled={page >= totalPages} onClick={() => updateParams({ page: page + 1 })}>Next →</button></nav> : null}
    </section>
  </main><HomeFooterSection /></>;
}

export function PublicBlogDetailPage() {
  const { slug = "" } = useParams(); const [post, setPost] = useState<BlogPost | null>(null); const [loading, setLoading] = useState(true);
  useEffect(() => { let active = true; getBlogPost(slug).then((item) => active && setPost(item)).catch(() => active && setPost(null)).finally(() => active && setLoading(false)); return () => { active = false; }; }, [slug]);
  useEffect(() => { if (!post) return; document.title = post.seoTitle || post.title; document.querySelector('meta[name="description"]')?.setAttribute("content", post.seoDescription || post.excerpt); }, [post]);
  return <><CustomerHeader /><main className="public-blog-detail">{loading ? <p className="public-blog-state">Loading article...</p> : null}{!loading && !post ? <div className="public-blog-state"><h1>Article not found</h1><Link to="/blog-posts">Back to blogs</Link></div> : null}{post ? <article><Link to="/blog-posts">← All articles</Link><span>{post.category}</span><h1>{post.title}</h1><p className="public-blog-byline">{post.authorName} · {formatDate(post.publishedAt || post.createdAt)} · {post.viewCount} views</p>{post.featuredImageUrl ? <img src={resolveBlogImageUrl(post.featuredImageUrl)} alt="" /> : null}<p className="public-blog-excerpt">{post.excerpt}</p><div className="public-blog-body">{post.content}</div></article> : null}</main><HomeFooterSection /></>;
}

function formatDate(value: string) { return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value)); }
function resolveBlogImageUrl(value: string) { if (!value.startsWith("/uploads/")) return value; const api = import.meta.env.VITE_API_BASE_URL || "https://api.chaodesi.com/api"; return `${api.replace(/\/api\/?$/i, "")}${value}`; }
function authorInitials(value: string) { return value.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase(); }
function categoryTone(value: string) { if (value.includes("Service")) return "blue"; if (value.includes("Home")) return "orange"; return "green"; }
function categoryIcon(value: string) { if (value.includes("Service")) return "handyman"; if (value.includes("Home")) return "home"; return "groups"; }
