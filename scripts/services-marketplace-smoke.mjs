import assert from 'node:assert/strict';
import fs from 'node:fs';
const api = fs.readFileSync('src/features/servicesMarketplace/api/servicesMarketplaceApi.ts','utf8');
const page = fs.readFileSync('src/features/servicesMarketplace/ui/ServicesMarketplacePlaceholderPage.tsx','utf8');
assert.match(api,/createServicesPayment/);
assert.match(page,/ServicesPaymentPanel/);
assert.match(page,/PENDING_PAYMENT/);
console.log('Services Marketplace client smoke checks passed');
