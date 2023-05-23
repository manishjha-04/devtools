/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

import type { AnyAction } from "@reduxjs/toolkit";

import type { Thread } from "./types";

export interface ThreadsState {
  isWebExtension: boolean;
  mainThread: Thread;
  threads: Thread[];
  traits: Record<string, unknown>;
}

const initialState: ThreadsState = {
  threads: [],
  mainThread: {
    actor: "",
    url: "",
    type: "mainThread",
    name: "",
  },
  traits: {},
  isWebExtension: false,
};

export default function update(state = initialState, action: AnyAction) {
  switch (action.type) {
    case "CONNECT":
      return {
        ...state,
        mainThread: action.mainThread,
        traits: action.traits,
        isWebExtension: action.isWebExtension,
      };
    default:
      return state;
  }
}
