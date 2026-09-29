export type FlightAssets = {
  spacecraft: HTMLImageElement;
  earth: HTMLImageElement;
  moon: HTMLImageElement;
};

let assetsPromise: Promise<FlightAssets> | undefined;

function loadArtwork(source: string, label: string, signal: AbortSignal): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const cleanup = () => {
      window.clearTimeout(timeout);
      signal.removeEventListener("abort", cancel);
      image.onload = null;
      image.onerror = null;
    };
    const cancel = () => {
      cleanup();
      image.src = "";
      reject(new Error("The flight artwork load was cancelled."));
    };
    const timeout = window.setTimeout(() => {
      cleanup();
      image.src = "";
      reject(new Error(`${label} took too long to load. Check your connection and try again.`));
    }, 10_000);
    image.onload = () => {
      cleanup();
      resolve(image);
    };
    image.onerror = () => {
      cleanup();
      reject(new Error(`${label} couldn't be loaded. Check your connection and try again.`));
    };
    signal.addEventListener("abort", cancel, { once: true });
    if (signal.aborted) cancel();
    else image.src = source;
  });
}

export function prepareFlightAssets(): Promise<FlightAssets> {
  if (!assetsPromise) {
    const controller = new AbortController();
    assetsPromise = Promise.all([
      loadArtwork("/images/explorer.svg", "Your spacecraft artwork", controller.signal),
      loadArtwork("/images/earth-flight.webp", "The Earth photography", controller.signal),
      loadArtwork("/images/moon-surface.webp", "The lunar surface", controller.signal),
    ]).then(([spacecraft, earth, moon]) => ({ spacecraft, earth, moon })).catch((reason: unknown) => {
      controller.abort();
      assetsPromise = undefined;
      throw reason;
    });
  }
  return assetsPromise;
}
