type FlightModule = typeof import("./FlightView");

let flightModule: Promise<FlightModule> | undefined;

export function loadFlightView(): Promise<FlightModule> {
  if (flightModule) return flightModule;

  flightModule = new Promise<FlightModule>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error("The flight deck download timed out. Check your connection and try again, or reload this page."));
    }, 15_000);

    // Keep one browser-owned download even if a caller times out or leaves the hangar.
    import("./FlightView").then(async (module) => {
      await module.prepareFlightAssets();
      return module;
    }).then((module) => {
      window.clearTimeout(timeout);
      flightModule = Promise.resolve(module);
      resolve(module);
    }, (cause: unknown) => {
      window.clearTimeout(timeout);
      flightModule = undefined;
      reject(new Error("The flight deck couldn't be prepared. Check your connection and try again, or reload this page.", { cause }));
    });
  });

  return flightModule;
}
