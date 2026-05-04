# PikoMo Blog

[![Deploy Blog](https://github.com/pikomonde/pikotop-blog/actions/workflows/deploy.yml/badge.svg)](https://github.com/pikomonde/pikotop-blog/actions/workflows/deploy.yml)

Personal engineering blog — [blog.pikomo.top](https://blog.pikomo.top)

Built with **Astro** · **Tailwind CSS** · **MDX**

---

## Commands

| Command           | Action                                      |
| :---------------- | :------------------------------------------ |
| `npm install`     | Install dependencies                        |
| `npm run dev`     | Start local dev server at `localhost:4321`  |
| `npm run build`   | Build static output to `./dist/`            |
| `npm run preview` | Preview build locally before deploying      |

---

## Writing a Post

Create a `.mdx` file in `src/content/blog/`. Filename becomes the URL slug.

```
src/content/blog/my-post-title.mdx
```

### Frontmatter

```yaml
---
title: "Your Post Title"
description: "A short description for SEO and post cards."
pubDate: "2026-05-03"
updatedDate: "2026-05-10"        # optional
heroImage: "../../assets/my-image.jpeg"   # optional, recommended 1200×630px
lang: "en"                       # "en" or "id", default: "en"
tagTopics: ["Astro", "Web Dev"]  # default: ["General"]
tagSeries: ["Blog Journey"]      # optional, max 1 series per post
publishedOn:                     # optional, cross-post links
  medium: "https://medium.com/@pikomo/..."
  devto: "https://dev.to/pikomo/..."
author: "Piko Monde"             # optional, default: "Piko Monde"
draft: false                     # optional, default: false — set true to hide from listing
---

Your content here...
```

### Field Reference

| Field | Required | Description |
| :---- | :------- | :---------- |
| `title` | ✅ | Post title |
| `description` | ✅ | Short summary — shown on cards and used for SEO meta |
| `pubDate` | ✅ | Publication date. Posts with a future date are hidden from listing |
| `updatedDate` | — | If set, shown as "Updated [date]" on the post page |
| `heroImage` | — | Relative path to image asset. Recommended ratio: 1.91:1 (1200×630px) |
| `lang` | — | `"en"` or `"id"`. Default: `"en"` |
| `tagTopics` | — | Array of topic tags shown as blue badges. Default: `["General"]` |
| `tagSeries` | — | Array — but use max 1 series per post. Posts in a series get an amber left border and can be filtered together |
| `publishedOn` | — | Key-value map of platform name → URL. Shown as "Also published on" at the bottom of the post |
| `author` | — | Default: `"Piko Monde"` |
| `draft` | — | Set `true` to hide from listing without deleting the file. Default: `false` |

---

## Deployment

Deploys automatically on **GitHub Release** (`release: published`).

### SSH Deploy Secrets

Set these in your GitHub repo → Settings → Secrets:

| Secret | Value |
| :----- | :---- |
| `SSH_HOST` | Server IP or domain |
| `SSH_USER` | SSH username |
| `SSH_PRIVATE_KEY` | Private key contents |

---

## TODO

- [ ] Update favicon — current favicon is the default Astro SVG
- [ ] Migrate styling to Tailwind utility classes — currently using scoped `<style>` blocks per component
- [ ] Badge `NEW` — posts published within the last 7 days get a NEW badge on their card
- [ ] Related articles — tampilkan maks 3 artikel rekomendasi di bawah konten artikel (setelah "Also published on"). Prioritas: (1) artikel seseries, (2) artikel dengan topic tag overlap terbanyak, (3) artikel terbaru. Implementasi statis di `BlogPost.astro` saat build.
