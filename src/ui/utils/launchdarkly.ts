import { StatsigClient } from "@statsig/js-client";
import { useEffect, useState } from "react";

import { isDevelopment } from "shared/utils/environment";
import { UserInfo } from "ui/hooks/users";

const DEFAULT_FLAGS = {
  "maintenance-mode": false,
} as const;

let client: StatsigClient;
let resolveReady: (ready: boolean) => void;
const readyPromise = new Promise<boolean>(resolve => {
  resolveReady = resolve;
});
const LD_KEY = isDevelopment() ? "60ca05fb43d6f10d234bb3ce" : "60ca05fb43d6f10d234bb3cf";

function initLaunchDarkly(user?: UserInfo) {
  client = new StatsigClient(LD_KEY, {
    kind: "user",
    key: user ? user.id : "anon",
  });

  await client.initializeAsync();

  client.on("ready", () => {
    resolveReady(true);
  });
}

function useLaunchDarkly() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    readyPromise.then(r => setReady(r));
  }, [setReady]);

  function getFeatureFlag<F extends keyof typeof DEFAULT_FLAGS>(
    name: F
  ): (typeof DEFAULT_FLAGS)[F] {
    if (!ready) {
      return DEFAULT_FLAGS[name];
    }

    return client.checkGate(name) ?? DEFAULT_FLAGS[name];
  }

  return { ready, getFeatureFlag };
}

export { initLaunchDarkly, useLaunchDarkly };
