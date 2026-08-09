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

GitHub Actions reads only the file index from this Space during each Pages
build, then generates the gallery's Hugging Face image URLs. Images are not
copied into GitHub Pages: a visitor's browser loads them directly from Hugging
Face/Xet.

The entry screen checks the generated SFW covers before allowing the site to
open. If Hugging Face is blocked or responding slowly, it displays the network
warning instead. NSFW entries stay after SFW entries in the gallery and remain
hidden until the existing age warning and press-and-hold interaction is used.

After uploading images to Hugging Face, run:

```text
Actions > Sync Gallery Data > Run workflow
```

The scheduled job refreshes the gallery index and Pages build every 30 minutes.
