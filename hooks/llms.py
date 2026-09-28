"""MkDocs hook: keeps both languages in step and writes the AI-facing files.

- on_config: every Spanish page in the nav must have its English twin (``page.md`` +
  ``page.en.md``), and no English page may exist outside the nav. A missing translation fails the
  build instead of silently falling back.
- on_post_build: writes ``llms-full.txt`` at the site root (AGENTS.md, then every English page in
  nav order, then contract.json and kino.d.ts) and copies ``AGENTS.md`` next to it, so an AI needs
  one URL for everything.

mkdocs-static-i18n runs the build once per language; the files are only written on the default
(Spanish) build, whose ``site_dir`` is the real site root.
"""

from __future__ import annotations

import os
import shutil

from mkdocs.exceptions import PluginError

SITE = "https://kinotvapp.github.io/kino-plugins/"
REFERENCE_FILES = ["reference/contract.json", "reference/kino.d.ts"]


def _nav_files(nav) -> list[str]:
    out: list[str] = []
    for entry in nav or []:
        if isinstance(entry, str):
            out.append(entry)
        elif isinstance(entry, dict):
            for value in entry.values():
                if isinstance(value, str):
                    out.append(value)
                else:
                    out.extend(_nav_files(value))
    return out


def _english(path: str) -> str:
    base, ext = os.path.splitext(path)
    return base + ".en" + ext


def _repo_root(config) -> str:
    return os.path.dirname(os.path.abspath(config.config_file_path))


def on_config(config, **kwargs):
    docs = config.docs_dir
    pages = _nav_files(config.nav)
    missing = [p for p in pages for f in (p, _english(p)) if not os.path.isfile(os.path.join(docs, f))]
    if missing:
        raise PluginError("pages missing a translation: " + ", ".join(sorted(set(missing))))
    listed = {_english(p) for p in pages}
    extra = []
    for root, _dirs, files in os.walk(docs):
        for name in files:
            if name.endswith(".en.md"):
                rel = os.path.relpath(os.path.join(root, name), docs).replace(os.sep, "/")
                if rel not in listed:
                    extra.append(rel)
    if extra:
        raise PluginError("English pages outside the nav: " + ", ".join(sorted(extra)))
    return config


def build_llms_full(config) -> str:
    """Concatenates AGENTS.md, the English pages in nav order and the two reference files."""
    docs = config.docs_dir
    root = _repo_root(config)
    parts = [
        "# Kino plugins: the complete authoring guide, for AI assistants\n",
        f"Source: {SITE} (English pages, in site order). Every number here is the one the app "
        "enforces; contract.json and kino.d.ts at the end are the machine-readable truth.\n",
    ]
    agents = os.path.join(root, "AGENTS.md")
    with open(agents, encoding="utf-8") as fh:
        parts.append("\n\n<!-- file: AGENTS.md -->\n\n" + fh.read().strip() + "\n")
    for page in _nav_files(config.nav):
        en = _english(page)
        with open(os.path.join(docs, en), encoding="utf-8") as fh:
            # Plain text for machines: the HTML escapes the pages need (&lt;name&gt;) go back to <name>.
            text = fh.read().strip().replace("&lt;", "<").replace("&gt;", ">")
        url = SITE + "en/" + (page[:-len("index.md")] if page.endswith("index.md") else page[:-3] + "/")
        parts.append(f"\n\n<!-- page: {url} (docs/{en}) -->\n\n{text}\n")
    for ref in REFERENCE_FILES:
        with open(os.path.join(docs, ref), encoding="utf-8") as fh:
            body = fh.read().rstrip()
        lang = "json" if ref.endswith(".json") else "ts"
        parts.append(f"\n\n<!-- file: {SITE}{ref} -->\n\n## {os.path.basename(ref)}\n\n```{lang}\n{body}\n```\n")
    return "".join(parts)


def on_post_build(config, **kwargs):
    if config.theme.get("language", "es") != "es":
        return
    site = config.site_dir
    with open(os.path.join(site, "llms-full.txt"), "w", encoding="utf-8") as fh:
        fh.write(build_llms_full(config))
    shutil.copyfile(os.path.join(_repo_root(config), "AGENTS.md"), os.path.join(site, "AGENTS.md"))
