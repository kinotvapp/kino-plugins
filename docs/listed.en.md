# Get listed in Kino

People get your plugin in two ways:

- **By typing its address.** In Kino, on Plugins, the **+** button (on a TV, **Agregar**), then
  `owner/repo`. This always works as long as the repository is public.
- **By finding it in the app, without knowing the address.** Kino shows a list, **"De la
  comunidad"**, of the plugins it finds on GitHub by itself. This page explains how to get into it.

Nobody approves community plugins: the app searches GitHub itself, with the rules below. Follow the
five steps and you are in.

## The five steps { #steps }

### 1. A public repository, created from the template (not a fork) { #public-not-fork }

- Create the repository with the green **Use this template → Create a new repository** button of
  [kino-plugin-archive](https://github.com/kinotvapp/kino-plugin-archive) or
  [kino-plugin-own-server](https://github.com/kinotvapp/kino-plugin-own-server), and pick **Public**.
  **Never use the Fork button**: Kino leaves forks out of the list. A fork says "forked from …" under
  its name; if yours does, create a new one from the template and move your files over.
- Created it private? In your repository: **Settings → General**, at the bottom **Danger Zone →
  Change visibility → Change to public**. A private repository can be neither found nor installed.

### 2. `kino-plugin.json` at the root, and valid { #valid-manifest }

- Kino reads `https://raw.githubusercontent.com/<owner>/<repo>/HEAD/kino-plugin.json`: the file must
  be at the **root** of the **default branch** (a plugin in a subfolder can be installed by typing its
  address, but it is not listed).
- Check it with the kit: `node sdk/validate.mjs .` must end in `✓ Kino would accept this plugin` and
  **without** the line "No aparecerá en la búsqueda de Kino" (printed when the manifest says
  `"discoverable": false`).
- An `apiVersion` newer than the person's Kino hides it from them. Kino 0.9.50 goes up to `6` (0.9.45 to 0.9.49, up to `5`); use the
  lowest that works for you and older Kino builds see it too.
- An `id` of your own: never the template's `archive-org`, a recommended plugin's
  (`internet-archive`, `own-server`). With someone else's id your plugin is hidden
  ([why](publish.md#discovery-hidden)).

### 3. A good name and description, in the manifest { #name-description }

Your plugin's card in Kino shows the `name` and `description` **of `kino-plugin.json`**, not GitHub's.
Write them in Spanish, for the person picking sources on their TV:

- `name`: 1 to 40 characters, short and recognizable ("Cine clásico", not "my-plugin-v2").
- `description`: up to 300 characters. Say what is there (movies, series, anime, live channels),
  where it comes from, and whether it asks for anything (an account, a server address). Without a
  description the card has no text.

```json
"name": "Cine clásico",
"description": "Películas de dominio público de archive.org, con subtítulos en español cuando los hay. No pide cuenta."
```

Optional, but they make the card look right: `color` (`#RRGGBB`) and `icon` (a square PNG of at most
128 KB).

### 4. The `kino-plugin` topic and the GitHub description { #topic }

The topic is **mandatory**: it is the only way Kino finds a plugin. Put it on **the same repository
that holds `kino-plugin.json`**.

**By clicking**, on your repository's GitHub page:

1. On the right, in the **About** box, click the **⚙** gear.
2. In **Description**, write one line saying what it is ("Kino plugin: classic films from
   archive.org").
3. In **Topics**, type `kino-plugin` and press Enter (it becomes a blue tag).
4. Click **Save changes**.

**From the terminal** (with [GitHub CLI](https://cli.github.com/)):

```
gh repo edit OWNER/REPO --add-topic kino-plugin --description "Kino plugin: classic films from archive.org"
```

Kino does not read the GitHub description, but set it anyway: it is what people see when they reach
your repository from [github.com/topics/kino-plugin](https://github.com/topics/kino-plugin) or a
GitHub search, and a clear line gets more people to try it and star it.

### 5. Check it { #check }

1. **Does GitHub see the topic?** Open `https://api.github.com/repos/OWNER/REPO` in a browser and
   find `"topics"`: it must say `"kino-plugin"`. It should also show on
   [github.com/topics/kino-plugin](https://github.com/topics/kino-plugin).
2. **Is it in Kino's search?** Open
   [this search](https://api.github.com/search/repositories?q=topic:kino-plugin+fork:false&sort=stars&order=desc&per_page=50)
   (exactly the one the app makes) and find your repository in `items`.
3. **In the app.** Open Plugins (on a phone: the **☰ → Plugins** menu; on a TV: **Ajustes →
   Plugins**), tab **Recomendados**, scroll down to **"De la comunidad"** and tap **Actualizar**. Your
   card shows your name, your description and "por &lt;your user&gt;". The same list shows in "Elige tus
   fuentes", the screen Kino shows when there is no source yet.

## How long it takes { #timing }

- **GitHub** indexes a new topic (or a repository just made public) on its own schedule: usually
  minutes, with no promised delay.
- **Kino** keeps the list on each device and only asks GitHub again when that copy is older than
  **12 hours**, or when the person taps **Actualizar** (at most once every 60 seconds).
- **Your repository's files** (`raw.githubusercontent.com`) are cached for about 5 minutes: a
  manifest change may take that long to show.

## The order { #ranking }

Kino sorts by GitHub **stars** and keeps the **top 30** of a single search of 50 results; below that
nothing is listed. Plugins that fail the rules still use up their slot, so the list may hold fewer
than 30. Ask the people who use your plugin to give the repository a ⭐.

A plugin the Kino team recommends shows under "Recomendados", not "De la comunidad". Installing any
plugin from the list goes through the same consent sheet ("Plugin no verificado…"): nothing installs
by itself.

## If it does not show { #not-showing }

Go through [Why my plugin does not appear](publish.md#troubleshooting); every exact rule, with its
numbers, is in [Get found](publish.md#get-found).
