# Website Builder Feature Report

Date: 2026-05-12

## Scope

This report defines a website builder module for Edith's accounting-first BusinessOS. It follows the depth and formatting pattern used in `ACCOUNTING_FEATURE_REPORT.md`: scope, executive summary, product principles, prioritized feature inventory, recommended routes, data model, build priorities, and positioning.

The target product is a hybrid website builder: users should be able to generate complete pages with AI, refine them with drag-and-drop components, edit content visually, manage reusable design tokens, preview responsive states, publish sites, and export/download code in a Next.js-compatible structure similar to v0-style output.

## Executive Summary

The website builder should not be treated as a simple CMS page form. It should be a production-oriented site generation workspace where AI, visual editing, templates, components, assets, publishing, analytics, and code export all work together.

The core experience should let a user start from a prompt, template, business profile, or blank canvas. AI can generate a page, section, copy, layout, theme, and component variants. The drag-and-drop builder then gives users deterministic control: reorder sections, edit component props, adjust responsive behavior, bind forms, connect CMS data, and preview the result before publishing.

The strongest product direction is "v0-like generation plus Webflow-like visual control, inside a BusinessOS context." The builder should output clean Next.js App Router files, Tailwind/shadcn-style components where appropriate, asset folders, metadata, route files, and package dependency hints. Users should be able to export code as a ZIP, download a single page/component, copy code, or push generated output into a managed deployment pipeline.

## Website Builder Product Principles

- AI accelerates creation, but the visual builder owns final user control.
- Generated pages must be editable after generation; AI output cannot become a dead static artifact.
- Exported code should follow modern Next.js file conventions and be useful to developers without heavy cleanup.
- The internal builder schema should be framework-neutral enough to support visual editing, but the primary export target should be Next.js.
- Components should be reusable, theme-aware, accessible, responsive, and connected to the design system.
- Publishing must include preview, version history, rollback, domain settings, SEO, forms, analytics, and security controls.
- The builder should integrate with BusinessOS data: company profile, CRM forms, proposals, client portal, documents, products/services, invoices, and AI context.

## Full Website Builder Feature Inventory

### 1. Site and Project Management

Priority: P0

Features:

- Multi-site support per tenant.
- Site dashboard with draft, published, archived, and failed states.
- Site profile: name, slug, favicon, logo, default language, timezone, domain, and brand settings.
- Project templates for SaaS, agency, accountant, consultant, portfolio, landing page, documentation, and client portal.
- Duplicate site.
- Archive and restore site.
- Version history at site and page level.
- Team collaboration readiness: owner, editor, reviewer, developer roles.

Core validations:

- Site slug must be unique within the tenant.
- Published site must have at least one valid home page.
- Domain cannot be attached to multiple active sites.
- Archive should not delete published assets or historical versions.
- Tenant isolation applies to every site, page, asset, form, and deployment.

Recommended pages:

- `/app/sites`
- `/app/sites/new`
- `/app/sites/:siteId`
- `/app/sites/:siteId/settings`

### 2. AI Site and Page Generation

Priority: P0

Features:

- Prompt-to-site generation.
- Prompt-to-page generation.
- Prompt-to-section generation.
- Prompt-to-component generation.
- AI rewrite for headlines, body copy, CTAs, FAQs, pricing, feature lists, and SEO metadata.
- AI image prompt suggestions and placeholder media generation support.
- AI layout variants: hero, pricing, testimonials, comparison, FAQ, contact, form, dashboard preview, feature grid, blog index, and docs page.
- AI generation from company profile, existing website URL text, uploaded brand notes, or selected BusinessOS data.
- Generation history with prompt, model, output summary, and accepted/rejected state.
- Regenerate selected block without replacing the full page.
- Explain changes before applying large AI edits.

Core validations:

- AI output must be sanitized before rendering or exporting.
- AI cannot publish directly without user confirmation.
- AI cannot access private tenant data unless explicitly included as context.
- Generated external links, legal claims, statistics, and pricing should be flagged for review.
- Unsafe scripts, inline event handlers, and untrusted embeds must be blocked or isolated.

Recommended pages:

- `/app/sites/:siteId/ai`
- `/app/sites/:siteId/pages/:pageId/builder`
- `/app/sites/:siteId/generations`

Important constraint:

AI should create drafts and suggestions. The user should decide what gets inserted, published, exported, or deployed.

### 3. Drag-and-Drop Visual Builder

Priority: P0

Features:

- Canvas-based page editor.
- Section navigator.
- Drag-to-reorder sections.
- Drag components into sections.
- Resize columns and layout regions.
- Component selection outline.
- Breadcrumb selection path: Page > Section > Container > Component.
- Properties inspector for text, links, spacing, colors, alignment, visibility, and responsive behavior.
- Layers panel for nested layouts.
- Undo/redo stack.
- Copy/paste components.
- Duplicate, hide, lock, and delete blocks.
- Keyboard shortcuts for common editor actions.
- Snap/grid controls.
- Responsive preview modes: desktop, tablet, mobile.
- Draft autosave.
- Dirty-state warning before navigation.

Core validations:

- Drag-and-drop changes must produce a valid page tree.
- Required component props must be present before publish/export.
- Locked system components cannot be deleted by users without permission.
- Responsive overrides must inherit predictably from base styles.
- Undo/redo should preserve both layout and component prop changes.

Recommended pages:

- `/app/sites/:siteId/pages/:pageId/builder`
- `/app/sites/:siteId/pages/:pageId/preview`

### 4. Component Library and Design System

Priority: P0

Features:

- Reusable component registry.
- Section templates: hero, feature grid, stats, pricing, testimonial, team, logo cloud, CTA, FAQ, contact, newsletter, blog, docs, comparison, gallery, dashboard preview.
- Primitive components: text, image, button, link, card, badge, icon, form field, video embed, divider, spacer, grid, stack, columns, tabs, accordion.
- BusinessOS components: lead form, booking form, proposal CTA, invoice payment CTA, client portal login, document download block, CRM capture form.
- Theme tokens: colors, typography, radius, shadow, spacing, border, layout widths.
- Component variants.
- Shared header/footer.
- Global navigation builder.
- Icon picker.
- Asset picker.
- Theme preview.
- Component usage map.

Core validations:

- Components must declare schema, default props, supported slots, and responsive behavior.
- Removed components must not break existing pages.
- Theme token changes need preview before applying globally.
- Shared header/footer updates should show affected pages.
- Forms and embeds must respect security and privacy settings.

Recommended pages:

- `/app/sites/:siteId/components`
- `/app/sites/:siteId/theme`
- `/app/sites/:siteId/navigation`
- `/app/sites/:siteId/assets`

### 5. Page, Route, and SEO Management

Priority: P0

Features:

- Page list.
- Create page from AI, template, clone, or blank canvas.
- Route/path editor.
- Home page selection.
- Static pages and dynamic CMS-backed pages.
- Draft, review, scheduled, published, unpublished, archived states.
- SEO title, description, canonical URL, robots settings, Open Graph image, structured data fields.
- Redirects.
- 404 page.
- Sitemap generation.
- RSS generation for blog/content collections.
- Password-protected page option.

Core validations:

- Route paths must be unique per site.
- Required SEO fields should warn before publish, not block drafts.
- Published pages cannot reference missing assets or broken required data bindings.
- Redirect loops must be prevented.
- Dynamic routes require a valid content source.

Recommended pages:

- `/app/sites/:siteId/pages`
- `/app/sites/:siteId/pages/new`
- `/app/sites/:siteId/pages/:pageId/settings`
- `/app/sites/:siteId/seo`
- `/app/sites/:siteId/redirects`

### 6. CMS Collections and Dynamic Content

Priority: P1

Features:

- CMS collection builder.
- Collection fields: text, rich text, image, gallery, number, date, boolean, select, reference, slug, URL.
- Blog posts.
- Case studies.
- Services.
- Team members.
- Testimonials.
- Product/service listings.
- Dynamic pages from collection records.
- Content scheduling.
- Draft/review/published workflow.
- Import content from CSV.
- AI draft generation for collection entries.

Core validations:

- Slugs must be unique within a collection.
- Required fields must be complete before publish.
- Dynamic pages must gracefully handle empty or missing records.
- Reference fields must prevent invalid cross-tenant references.
- Content imports need validation preview and error rows.

Recommended pages:

- `/app/sites/:siteId/cms`
- `/app/sites/:siteId/cms/:collectionId`
- `/app/sites/:siteId/cms/:collectionId/new`
- `/app/sites/:siteId/cms/:collectionId/:entryId`

### 7. Forms, Leads, and BusinessOS Integration

Priority: P0/P1

Features:

- Form builder with drag-and-drop fields.
- Contact, lead, newsletter, booking, support, quote request, and custom form templates.
- Field types: text, email, phone, textarea, select, checkbox, radio, file upload, date, hidden field.
- Spam protection.
- Submission inbox.
- Email notifications.
- CRM lead creation.
- Tagging and pipeline assignment.
- Webhook on submission.
- Auto-response emails.
- Consent checkbox and privacy text.
- Link form submissions to contacts, deals, proposals, or projects.

Core validations:

- Required fields must be enforced on client and server.
- Email fields must validate format.
- File uploads require type/size limits and malware scanning when enabled.
- Consent capture must store timestamp and source page.
- Webhook failures should be logged and retried.

Recommended pages:

- `/app/sites/:siteId/forms`
- `/app/sites/:siteId/forms/:formId`
- `/app/sites/:siteId/submissions`
- `/app/sites/:siteId/integrations`

### 8. Preview, Publishing, Hosting, and Domains

Priority: P0

Features:

- Draft preview URL.
- Shareable review links.
- Publish button with validation checklist.
- Deployment status timeline.
- Build logs.
- Rollback to previous version.
- Custom domain connection.
- DNS instructions.
- SSL status.
- Environment variables for exported/deployed projects.
- Publish scheduling.
- Unpublish flow.
- Cache invalidation.
- Asset optimization.

Core validations:

- Publish should fail fast on invalid routes, missing assets, unsafe embeds, or unresolved required bindings.
- Domain ownership must be verified before going live.
- Rollback should restore page tree, assets references, SEO metadata, and theme version.
- Deployment logs should be tenant-scoped and not expose secrets.
- Preview URLs should be unguessable when private review is enabled.

Recommended pages:

- `/app/sites/:siteId/publish`
- `/app/sites/:siteId/deployments`
- `/app/sites/:siteId/domains`
- `/app/sites/:siteId/deployments/:deploymentId`

### 9. Code Export and Download

Priority: P0

Features:

- Export full site as ZIP.
- Export selected page as Next.js route.
- Export selected component as React component.
- Copy code for selected component/section.
- Export manifest describing routes, components, assets, dependencies, and environment variables.
- Export with App Router-compatible folder structure.
- Include Tailwind config guidance or token CSS.
- Include component registry and reusable UI components.
- Include `package.json` dependency hints.
- Include `README.md` with setup and customization notes.
- Export static assets to `public/`.
- Export metadata and SEO where possible.
- Option to export TypeScript or JavaScript, with TypeScript as default.
- Option to export with shadcn/ui-compatible components if the target project supports it.

Core validations:

- Exported project must be deterministic from a saved builder version.
- Generated imports must resolve.
- File names must be safe and stable.
- Dynamic CMS routes must include mock/static data or documented integration adapters.
- Export should warn if a component relies on hosted-only features such as managed form submission, analytics, or deployment secrets.

Recommended pages:

- `/app/sites/:siteId/export`
- `/app/sites/:siteId/export/history`
- `/app/sites/:siteId/pages/:pageId/export`

Recommended Next.js export structure:

- `app/page.tsx`
- `app/[route]/page.tsx`
- `app/layout.tsx`
- `app/globals.css`
- `components/site/header.tsx`
- `components/site/footer.tsx`
- `components/site/sections/*.tsx`
- `components/site/forms/*.tsx`
- `components/ui/*.tsx`
- `lib/site-data.ts`
- `lib/site-config.ts`
- `public/images/*`
- `public/assets/*`
- `package.json`
- `tailwind.config.ts` or token documentation if the host app already owns Tailwind config
- `README.md`

v0-like output expectations:

- Single generated components should be readable and portable.
- Page exports should separate route files from reusable components.
- Styling should prefer Tailwind utility classes and design tokens over opaque generated CSS.
- Components should be typed, accessible, and responsive.
- Exported code should avoid hidden runtime dependencies unless declared in the manifest.

### 10. Developer Mode and Code-Aware Editing

Priority: P1

Features:

- Code preview panel.
- Diff preview before applying AI changes.
- Editable component prop schema.
- JSON tree view of page schema.
- Custom code blocks with guardrails.
- CSS token editor.
- Script/embed manager.
- GitHub export or push later.
- CLI-friendly export manifest.
- Component dependency graph.

Core validations:

- Custom code must be isolated and reviewed before publish.
- Dangerous scripts should be blocked or sandboxed.
- Code edits must round-trip back to the visual schema only when compatible.
- Developer-only features require permission.
- Secrets cannot be embedded in exported client code.

Recommended pages:

- `/app/sites/:siteId/developer`
- `/app/sites/:siteId/pages/:pageId/code`

### 11. Analytics, Experiments, and Conversion Tools

Priority: P1/P2

Features:

- Page views.
- Form conversion tracking.
- CTA click tracking.
- UTM attribution.
- Referrer reports.
- Basic funnel analytics.
- A/B testing for headlines, CTAs, sections, and pricing layouts.
- Heatmap integration readiness.
- AI summary of page performance.
- Recommendations for copy/layout improvement.

Core validations:

- Analytics must respect privacy settings and consent rules.
- Experiment variants must not break SEO canonical behavior.
- Attribution data should connect to CRM leads when allowed.
- Analytics scripts must be controlled through the site settings.

Recommended pages:

- `/app/sites/:siteId/analytics`
- `/app/sites/:siteId/experiments`

### 12. Permissions, Review, Audit, and Governance

Priority: P0

Features:

- Roles: owner, admin, designer, marketer, developer, reviewer, viewer.
- Page review requests.
- Publish approval workflow.
- Audit events for AI generation, edits, export, publish, rollback, domain changes, form changes, and code changes.
- Commenting on page sections.
- Locked brand/theme controls.
- Export permission separate from edit permission.
- Domain and script changes require elevated permission.

Core validations:

- Users cannot approve their own publish request if maker-checker is enabled.
- Export/download code should be auditable.
- Domain/script changes require confirmation and audit.
- Published version should be recoverable even if a draft is damaged.
- Tenant admins should be able to revoke public preview links.

Recommended pages:

- `/app/sites/:siteId/review`
- `/app/sites/:siteId/activity`
- `/app/settings/users-roles`

## Recommended Data Model

Core tables/entities:

- `sites`
- `site_domains`
- `site_pages`
- `site_page_versions`
- `site_components`
- `site_component_registry`
- `site_sections`
- `site_themes`
- `site_assets`
- `site_navigation`
- `site_redirects`
- `site_seo_settings`
- `site_cms_collections`
- `site_cms_fields`
- `site_cms_entries`
- `site_forms`
- `site_form_fields`
- `site_form_submissions`
- `site_generations`
- `site_exports`
- `site_deployments`
- `site_deployment_logs`
- `site_preview_links`
- `site_comments`
- `site_activity_events`
- `site_analytics_events`
- `site_experiments`
- `site_experiment_variants`

Non-negotiable invariants:

- Page versions are immutable snapshots.
- Published versions can be rolled back.
- Exported code is generated from a saved version, not a transient editor state.
- Every generated page tree must validate against the component schema.
- AI generation history is stored with prompt, context references, model metadata, and accepted output.
- Tenant isolation is enforced across sites, pages, assets, forms, submissions, deployments, and exports.
- Code export and publish events are audited.

## Recommended Website Builder Pages

Site management:

- `/app/sites`
- `/app/sites/new`
- `/app/sites/:siteId`
- `/app/sites/:siteId/settings`
- `/app/sites/:siteId/activity`

Builder and content:

- `/app/sites/:siteId/pages`
- `/app/sites/:siteId/pages/new`
- `/app/sites/:siteId/pages/:pageId/builder`
- `/app/sites/:siteId/pages/:pageId/preview`
- `/app/sites/:siteId/pages/:pageId/settings`
- `/app/sites/:siteId/components`
- `/app/sites/:siteId/theme`
- `/app/sites/:siteId/navigation`
- `/app/sites/:siteId/assets`

AI and CMS:

- `/app/sites/:siteId/ai`
- `/app/sites/:siteId/generations`
- `/app/sites/:siteId/cms`
- `/app/sites/:siteId/cms/:collectionId`
- `/app/sites/:siteId/cms/:collectionId/:entryId`

Forms and integrations:

- `/app/sites/:siteId/forms`
- `/app/sites/:siteId/forms/:formId`
- `/app/sites/:siteId/submissions`
- `/app/sites/:siteId/integrations`

Publishing and export:

- `/app/sites/:siteId/publish`
- `/app/sites/:siteId/deployments`
- `/app/sites/:siteId/deployments/:deploymentId`
- `/app/sites/:siteId/domains`
- `/app/sites/:siteId/export`
- `/app/sites/:siteId/export/history`
- `/app/sites/:siteId/developer`

Analytics:

- `/app/sites/:siteId/analytics`
- `/app/sites/:siteId/experiments`

## AI Builder Workflow

### Prompt-to-Site Flow

1. User enters business type, target audience, goal, style, and pages needed.
2. AI proposes sitemap, brand direction, section plan, and copy direction.
3. User approves or edits the plan.
4. AI generates page trees using the component registry.
5. Builder validates the generated schema.
6. User visually edits pages.
7. User previews responsive breakpoints.
8. User publishes or exports code.

### Prompt-to-Component Flow

1. User selects a target area or opens component generation.
2. User asks for a section, such as "pricing table for accounting plans".
3. AI returns component variants using allowed components and tokens.
4. User previews variants.
5. User inserts one variant into the page.
6. The inserted block becomes fully editable in the drag-and-drop builder.

### AI Guardrails

- AI can draft, generate, rewrite, summarize, and suggest.
- AI should not publish, connect domains, add tracking scripts, export code, or send form notifications without confirmation.
- AI should use a tool allowlist and bounded site context.
- Prompt injection in imported content should be treated as untrusted text.
- AI-generated code should be linted/validated before export when possible.

## Drag-and-Drop Builder UX Requirements

Primary layout:

- Left sidebar: pages, layers, components, assets.
- Center: responsive canvas.
- Right inspector: properties, styles, interactions, data bindings.
- Top bar: site switcher, breakpoint selector, undo/redo, preview, publish, export.
- Bottom/status area: autosave state, validation warnings, selected version.

Expected editor states:

- Empty page.
- AI generating.
- Draft saved.
- Unsaved changes.
- Validation warnings.
- Preview mode.
- Publish in progress.
- Deployment failed.
- Export ready.
- Read-only review mode.

Accessibility requirements:

- Keyboard-accessible component tree.
- Focus-visible controls.
- Proper labels for editor controls.
- ARIA-friendly drag-and-drop alternatives.
- Responsive canvas controls that are usable without precision dragging.
- Error messages tied to invalid fields.

## Export Format Recommendation

The builder should store pages internally as a structured tree, then compile that tree into code. This avoids tying the visual editor directly to raw generated source while still enabling high-quality export.

Recommended export layers:

- Builder schema: canonical saved JSON tree.
- Component registry: maps schema nodes to React components.
- Code generator: produces Next.js route files and component files.
- Asset exporter: copies images/files into public paths.
- Manifest generator: records dependencies, pages, environment variables, and hosted-feature warnings.
- ZIP packager: creates downloadable code package.

Recommended export modes:

- Full Next.js app export.
- Page-only export.
- Component-only export.
- Copy selected section as React code.
- Hosted site backup export.

## Recommended Build Priorities

### MVP P0

- Site dashboard and site settings.
- Page list and page creation.
- Drag-and-drop page builder with section reorder and component inspector.
- Core section/component library.
- AI prompt-to-page and prompt-to-section generation.
- Theme tokens.
- Responsive preview.
- Forms connected to submissions and CRM leads.
- Draft/publish flow with version history.
- Basic deployment status.
- Export full site/page/component as Next.js-compatible ZIP/code.
- Audit events for generation, edit, publish, rollback, and export.

### MVP P1

- CMS collections and dynamic pages.
- AI prompt-to-site generation.
- Shared header/footer and navigation builder.
- Domain setup and DNS verification.
- Publish scheduling.
- Review links and comments.
- Analytics and conversion tracking.
- Developer mode with code preview and schema view.
- Export history and hosted-feature warnings.

### Post-MVP P2

- A/B testing.
- GitHub push/export integration.
- Marketplace for templates/components.
- Advanced animation/interactions.
- Multilingual sites.
- Team approvals and maker-checker publish controls.
- Custom code sandbox.
- White-label builder for agencies.
- Multi-region deployment controls.

## Product Positioning Recommendation

The website builder should be positioned as a BusinessOS-native site engine, not a generic clone of every website builder. The strongest wedge is:

1. Let AI generate credible business pages quickly.
2. Let users visually refine the result with deterministic drag-and-drop controls.
3. Connect forms, leads, proposals, invoices, documents, and client portal actions into the same workspace.
4. Provide serious developer escape hatches through v0-like Next.js code export.
5. Treat publish, export, domains, forms, and scripts as governed product actions with audit history.

The differentiator is not only "AI can make a website." The differentiator is that the generated website lives inside the same operational system that handles clients, proposals, invoices, documents, analytics, and controlled AI assistance.

## Sources

Local files:

- `ACCOUNTING_FEATURE_REPORT.md`
- `LANDING_PAGE_REPORT.md`
- `INVENTORY_SYSTEM_REPORT.md`
- `Idea/Combined Feature Inventory for an Accounting-First BusinessOS Platform.pdf`
- `Idea/Complete UI Specification for BusinessOS AI and a TallyPrime-like Accounting SaaS.pdf`
- `Idea/Consolidated Page Manifest and Free-Only UI Integration Plan for BusinessOS AI and an Accounting Saa.pdf`
- `Idea/Free-First SaaS Build Plan for BusinessOS AI and an Accounting System as a Service.pdf`
- `Idea/Full SaaS Build Plan for BusinessOS AI and a Telly Prime-like Video Platform.pdf`

Local implementation clues:

- `components/effortless-integration.tsx`
- `components/numbers-that-speak.tsx`
- `components/smart-simple-brilliant.tsx`
- `components/your-work-in-sync.tsx`
- `app/product/automation/page.tsx`
- `app/page.tsx`
