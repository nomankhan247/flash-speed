# Embeds

A standard YouTube embed downloads over 500 KB of JavaScript as soon as the page loads, even if nobody presses play. A facade shows the thumbnail and a play button, and loads the real player on click.

```js
import { youtubeFacade, facadeScript, lazyIframe } from "flash-speed/embeds";

const html =
  youtubeFacade({ id: "dQw4w9WgXcQ", title: "Product tour", start: 30 }) +
  facadeScript; // include the script once per page

lazyIframe({ src: "https://www.google.com/maps/embed?...", title: "Map", width: 600, height: 400 });
```

The player loads from `youtube-nocookie.com`. The facade is a `<div>` with a real `<button>`, so it works with the keyboard and screen readers.
