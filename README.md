# Quick Favorites Search

Microsoft Edge extension that replaces the new tab page with a fast search interface.

It lets you search your bookmarks and recent browsing history at the same time, manage shortcuts, and add new bookmarks in an organized way.

## Features

- Instant search across bookmarks and history.
- Case-insensitive and accent-insensitive search.
- Search by title, URL, folder, and page description.
- Results grouped by domain.
- Up to 60 results per category.
- History limited to the 500 most recent entries.
- Configurable shortcuts on the new tab bar.
- Add, edit, and remove bookmarks and shortcuts.
- Automatic organization of bookmarks into folders by domain.
- Optional Google search.
- Navigate directly to the first result with the `Enter` key.
- Search on Google with `Alt + Enter`.

## Technologies

- Modern JavaScript, no frameworks.
- HTML5 and CSS3.
- Manifest V3.
- Microsoft Edge/Chrome extension APIs:
  - `chrome.bookmarks`
  - `chrome.history`
  - `chrome.storage`
  - `chrome.tabs`
  - `chrome.action`

No dependencies to install, no build step, and no external server required.

## Technical Details

- The application home page is `index.html`.
- `app.js` contains the interface and search logic.
- `background.js` opens the application when the user clicks the extension icon.
- `manifest.json` defines permissions and new tab page replacement.
- Shortcuts are stored in a folder named `favorites-search` directly on the bookmarks bar.
- Added bookmarks are organized in a main `Organizados` folder and subfolders by domain.
- Page descriptions are stored locally via `chrome.storage.local`.
- Descriptions and icons are fetched from pages whenever possible via HTTP/HTTPS requests.
- The application is specific to the active Edge profile and does not send bookmarks or history to any external server.
- A maximum of 19 shortcuts is shown on the home page.

## Installation for Development

1. Open Microsoft Edge.
2. Go to `edge://extensions/`.
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Choose the folder containing this project.
6. Open a new tab.

You can also click the extension icon in the toolbar to open the application in a new tab.

## How to Use

### Search

1. Type in the search field.
2. Bookmarks and history are filtered automatically.
3. Select a result to open the corresponding address.
4. Press `Enter` to open the first matching result.
5. Press `Alt + Enter` to search the query on Google.
6. Select **Search on Google** to run an external search manually.

### Add a Bookmark

1. Click the `+` button next to the search field.
2. Enter the name and address.
3. Select **Add**.

The application tries to find a suitable folder by name or domain. If none exists, it creates a structure under `Organizados / domain`.

You can also add a page directly from history using the `+` button shown next to the result.

### Manage Shortcuts

1. Select **Add shortcut**.
2. Enter the address of the new shortcut.
3. Click the shortcut to open it in a new tab.

To edit or remove:

1. Right-click the shortcut.
2. Select **Edit** to change the name or address.
3. Select **Remove** to delete the shortcut.

Shortcuts are stored in the `favorites-search` folder on the bookmarks bar.

## Permissions

- `bookmarks`: read, create, update, and remove bookmarks.
- `history`: read recent browsing history.
- `storage`: store page descriptions locally.
- `http://*/*` and `https://*/*`: fetch page descriptions and icons.

## Compatibility

The application was built for Microsoft Edge using Manifest V3. It may also work in browsers compatible with the `chrome.*` APIs, although the officially supported configuration is Edge.
