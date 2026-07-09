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
assets/images/reconstruction/<case-name>/before.webp
assets/images/reconstruction/<case-name>/after.webp
```

GitHub Actions will scan this Space and generate `generated-gallery.js` with
`https://huggingface.co/spaces/.../resolve/main/...` image URLs.

Required GitHub secret:

```text
HF_TOKEN
```

Create it in Hugging Face with write permission, then add it to:

```text
GitHub repo > Settings > Secrets and variables > Actions > Repository secrets
```

After uploading images to Hugging Face, run:

```text
Actions > Sync Gallery Data > Run workflow
```

The scheduled job also checks Hugging Face every 30 minutes.
