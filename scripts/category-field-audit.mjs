#!/usr/bin/env node

const apiBaseUrl = String(process.env.AUDIT_API_BASE_URL || "http://localhost:5145/api").replace(/\/+$/, "");
const concurrency = Math.max(1, Number(process.env.AUDIT_CONCURRENCY || 16));
const allowedTypes = new Set(["text", "number", "date", "dropdown", "checkbox", "textarea", "file"]);

const tree = await getJson("/ListingCategories/tree");
const cases = tree.flatMap((category) => {
  const subCategories = Array.isArray(category.subCategories) ? category.subCategories : [];
  if (!subCategories.length) return [{ category, subCategory: null, detailCategory: null }];

  return subCategories.flatMap((subCategory) => {
    const details = Array.isArray(subCategory.detailedCategories) ? subCategory.detailedCategories : [];
    return details.length
      ? details.map((detailCategory) => ({ category, subCategory, detailCategory }))
      : [{ category, subCategory, detailCategory: null }];
  });
});

const jobs = cases.flatMap((item) => ["YellowPages", "Classifieds"].map((fieldContext) => ({ ...item, fieldContext })));
const results = await mapConcurrent(jobs, concurrency, auditCase);
const issues = results.flatMap((result) => result.issues);
const fieldCount = results.reduce((total, result) => total + result.fieldCount, 0);
const requiredCount = results.reduce((total, result) => total + result.requiredCount, 0);

console.log(`Category field API: ${apiBaseUrl}`);
console.log(`Categories: ${tree.length}`);
console.log(`Leaf combinations: ${cases.length}`);
console.log(`Contexts checked: ${results.length}`);
console.log(`Resolved fields: ${fieldCount}`);
console.log(`Required fields: ${requiredCount}`);
console.log(`Issues: ${issues.length}`);

for (const issue of issues.slice(0, 200)) console.log(`- ${issue}`);
if (issues.length > 200) console.log(`- ...and ${issues.length - 200} more`);
if (issues.length) process.exitCode = 1;

async function auditCase(item) {
  const params = new URLSearchParams({
    categoryId: String(item.category.id),
    fieldContext: item.fieldContext,
  });
  if (item.subCategory?.id) params.set("subCategoryId", String(item.subCategory.id));
  if (item.detailCategory?.id) params.set("detailedCategoryId", String(item.detailCategory.id));

  const fields = await getJson(`/ListingCategoryFields?${params}`);
  const issues = [];
  const seenKeys = new Set();
  const label = [item.fieldContext, item.category.name, item.subCategory?.name, item.detailCategory?.name].filter(Boolean).join(" > ");

  for (const field of Array.isArray(fields) ? fields : []) {
    const key = String(field.fieldKey || "").trim();
    const fieldLabel = String(field.label || "").trim();
    const type = String(field.fieldType || "").trim().toLowerCase();
    const normalizedKey = key.toLowerCase();

    if (!key) issues.push(`${label}: field ${field.id} has no key`);
    if (!fieldLabel) issues.push(`${label}: field ${field.id} has no label`);
    if (!allowedTypes.has(type)) issues.push(`${label}: ${key || field.id} uses unsupported type '${type}'`);
    if (normalizedKey && seenKeys.has(normalizedKey)) issues.push(`${label}: duplicate resolved key '${key}'`);
    if (type === "dropdown" && (!Array.isArray(field.options) || !field.options.length)) {
      issues.push(`${label}: dropdown '${key}' has no options`);
    }
    if (typeof field.isRequired !== "boolean") issues.push(`${label}: '${key}' has invalid required flag`);
    if (normalizedKey) seenKeys.add(normalizedKey);
  }

  return {
    issues,
    fieldCount: Array.isArray(fields) ? fields.length : 0,
    requiredCount: Array.isArray(fields) ? fields.filter((field) => field.isRequired).length : 0,
  };
}

async function getJson(path) {
  const response = await fetch(`${apiBaseUrl}${path}`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${path}`);
  return response.json();
}

async function mapConcurrent(items, limit, operation) {
  const output = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      output[index] = await operation(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return output;
}
