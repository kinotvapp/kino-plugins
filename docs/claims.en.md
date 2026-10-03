# Claims and plugin takedowns { #claims }

Kino is a player: it does not host, sell or distribute content. The list of community plugins is an automatic index of third-party public repositories that use the kino-plugin topic; Kino does not review them and is not responsible for their content. If a plugin infringes your rights or is harmful, open an issue at github.com/kinotvapp/kino-plugins/issues naming the repository and the reason. We remove it from the index within 5 business days at most and leave a public record in the repository's history. Authors can ask for a takedown to be reviewed the same way.

## How to file a claim { #how }

1. Open an issue at [github.com/kinotvapp/kino-plugins/issues](https://github.com/kinotvapp/kino-plugins/issues/new/choose)
   with the **"Reclamo / retiro de plugin"** template. Claims are only received this way, in public;
   there is no e-mail.
2. Fill in its three fields:
    - **Repositorio** (repository): the plugin, as `owner/name` (the one shown in "De la comunidad").
    - **Motivo** (reason): which right it infringes, or why it is harmful.
    - **Enlace a la prueba** (link to the evidence): where what you claim can be seen.
3. Do not include personal data you don't want public: anyone can read the issue.

## What Kino does { #what-kino-does }

- It adds the repository to [`community-blocklist.json`](https://github.com/kinotvapp/kino-plugins/blob/main/community-blocklist.json),
  at the root of this repository, within 5 business days at most. Each entry names the repository, the
  reason (`claim`, `malware`, `broken` or `author_request`), the date and the link to the issue. That
  file's git history is the public record.
- The app downloads that list and applies it:
    - a listed repository never shows in "De la comunidad" nor in the fallback list;
    - a listed plugin someone already has installed keeps working, but its card says "Retirado del
      índice de la comunidad." and it no longer receives updates from its repository. It is not
      uninstalled by force.
- The repository match ignores case. A fork of a removed repository is not removed automatically: it
  needs its own claim.

## If you are the author { #appeal }

Ask for the takedown to be reviewed the same way: an issue at
[github.com/kinotvapp/kino-plugins/issues](https://github.com/kinotvapp/kino-plugins/issues), linking the
original issue and explaining what changed. If it is accepted, the repository leaves the list in another
commit, public too. To take your own plugin out of the index, open the issue with the reason "at the
author's request" (`author_request`), or set `"discoverable": false` in your manifest
([The manifest](manifest.md)).

## Community plugins and recommended plugins { #community }

The app shows the community section with the note "Plugins de la comunidad — Kino no los revisa ni
responde por su contenido." The recommended plugins are another list, short and kept by Kino
([Example plugins](examples.md)); community plugins show up on their own when they meet the
[discovery requirements](publish.md#get-found).
