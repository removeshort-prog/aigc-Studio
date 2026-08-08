# Hugging Face asset hosting

Hugging Face Space:

```text
removeshort/removeshort-AIGC-Studio
```

Use the Space as the large-asset repository. Split each gallery into safe and
adult content folders:

```text
assets/images/anime/sfw/
assets/images/anime/nsfw/

assets/images/digital-art/sfw/
assets/images/digital-art/nsfw/

assets/images/style-showcase/sfw/
assets/images/style-showcase/nsfw/
```

During migration, images left directly inside a category folder are treated as
SFW. Keep a `cover` image in the SFW folder if you want it to be the category
cover. NSFW entries are always generated after SFW entries and never appear in
the scrolling hero.

GitHub Actions will scan this Space and generate `generated-gallery.js` with
`https://huggingface.co/spaces/.../resolve/main/...` image URLs.

After uploading images to Hugging Face, run:

```text
Actions > Sync Gallery Data > Run workflow
```

The scheduled job also checks Hugging Face every 30 minutes.
