# Hugging Face asset hosting

Hugging Face Space:

```text
removeshort/removeshort-AIGC-Studio
```

Use the Space as the large-asset repository. Keep the same folder structure:

```text
assets/images/anime/
assets/images/digital-art/
assets/images/style-showcase/
```

GitHub Actions will scan this Space and generate `generated-gallery.js` with
`https://huggingface.co/spaces/.../resolve/main/...` image URLs.

After uploading images to Hugging Face, run:

```text
Actions > Sync Gallery Data > Run workflow
```

The scheduled job also checks Hugging Face every 30 minutes.
