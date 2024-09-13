import { ApolloError } from "@apollo/client";
import { processRecordingProgress, uploadedData } from "@replayio/protocol";
import * as Sentry from "@sentry/react";

import {
  CommandRequest,
  CommandResponse,
  ExperimentalSettings,
  addEventListener,
  createSession,
  listenForSessionDestroyed,
} from "protocol/socket";
import { assert } from "protocol/utils";
import {
  recordingCapabilitiesCache,
  recordingTargetCache,
} from "replay-next/src/suspense/BuildIdCache";
import { extractGraphQLError } from "shared/graphql/apolloClient";
import { Recording } from "shared/graphql/types";
import { userData } from "shared/user-data/GraphQL/UserData";
import { isTest } from "shared/utils/environment";
import { UIThunkAction } from "ui/actions";
import * as actions from "ui/actions/app";
import { getRecording } from "ui/hooks/recordings";
import { getUserInfo } from "ui/hooks/users";
import { clearExpectedError, getExpectedError, getUnexpectedError } from "ui/reducers/app";
import { getToolboxLayout } from "ui/reducers/layout";
import {
  ProtocolEvent,
  ReceivedProtocolMessage,
  RequestSummary,
  protocolMessagesReceived,
} from "ui/reducers/protocolMessages";
import { setFocusWindow } from "ui/reducers/timeline";
import { getMutableParamsFromURL } from "ui/setup/dynamic/url";
import type { ExpectedError, UnexpectedError } from "ui/state/app";
import { endMixpanelSession } from "ui/utils/mixpanel";
import { registerRecording, trackEvent } from "ui/utils/telemetry";
import { subscriptionExpired } from "ui/utils/workspace";

import { setExpectedError, setUnexpectedError } from "./errors";
import { setToolboxLayout, setViewMode } from "./layout";
import { jumpToInitialPausePoint } from "./timeline";
import { SupplementalRecording } from "shared/client/types";

export { setExpectedError, setUnexpectedError };

declare global {
  interface Window {
    sessionId: string;
    sessionMetrics: any[] | undefined;
  }
}

const { focusWindow: focusWindowFromURL } = getMutableParamsFromURL();

export function getAccessibleRecording(
  recordingId: string
): UIThunkAction<Promise<Recording | null>> {
  return async (dispatch, getState) => {
    try {
      const recording = await getRecording(recordingId);
      if (!recording || recording.isInitialized) {
        const isAuthenticated = !!actions.getAccessToken(getState());
        const expectedError = getRecordingNotAccessibleError(recording, isAuthenticated);
        if (expectedError) {
          dispatch(setExpectedError(expectedError));
          return null;
        } else {
          dispatch(clearRecordingNotAccessibleError());
        }
      }
      return recording!;
    } catch (err) {
      if (isRecordingDeletedError(err)) {
        dispatch(setExpectedError(getDeletedRecordingError()));
        return null;
      }

      dispatch(
        setExpectedError({
          message: "Error",
          content:
            err instanceof ApolloError
              ? extractGraphQLError(err)!
              : "Unexpected error retrieving recording.",
        })
      );
      return null;
    }
  };
}

function getSupplementalRecordings(recordingId: string): SupplementalRecording[] {
  switch (recordingId) {
    case "d5513383-5986-4de5-ab9d-2a7e1f367e90":
      return [{
        serverRecordingId: "c54962d6-9ac6-428a-a6af-2bb2bf6633ca",
        connections: [
          // First /public network call is made.
          {
            clientFirst: true,
            clientRecordingId: "d5513383-5986-4de5-ab9d-2a7e1f367e90",
            clientPoint: {
              point: "16225927684179678680302888878605214",
              time: 10800,
            },
            serverPoint: {
              point: "17848520611783618390044493509296165",
              time: 53985.21055489196,
            },
          },
          // First /public network call returns.
          {
            clientFirst: false,
            clientRecordingId: "d5513383-5986-4de5-ab9d-2a7e1f367e90",
            clientPoint: {
              point: "18173039006159032102657777614192642",
              time: 11394.013505789708,
            },
            serverPoint: {
              point: "17848520612057445317839151914025709",
              time: 54294.69953306548,
            },
          },
          // Second /public network call is made.
          {
            clientFirst: true,
            clientRecordingId: "d5513383-5986-4de5-ab9d-2a7e1f367e90",
            clientPoint: {
              point: "56141709792928477884264450686451782",
              time: 25301.991150442478,
            },
            serverPoint: {
              point: "20444669041365036140696939482054693",
              time: 66999.47944537815,
            },
          },
          // Second /public network call returns.
          {
            clientFirst: false,
            clientRecordingId: "d5513383-5986-4de5-ab9d-2a7e1f367e90",
            clientPoint: {
              point: "56790746901441151898702525872734210",
              time: 25524.865255979654,
            },
            serverPoint: {
              point: "20444669041638352324265057053573869",
              time: 68611.1162184874,
            },
          },
        ],
      }];
  }
  return [];
}

function clearRecordingNotAccessibleError(): UIThunkAction {
  return async (dispatch, getState) => {
    const state = getState();
    const err = getExpectedError(state);

    // NOTE: This is coupled to the errors generated by getRecordingNotAccessibleError()
    if (err?.action === "sign-in" || err?.action === "request-access") {
      dispatch(clearExpectedError());
    }
  };
}

function isRecordingDeletedError(err: unknown): boolean {
  return (
    err instanceof ApolloError &&
    err.graphQLErrors.some(e => e.extensions?.code === "DELETED_OBJECT")
  );
}

function getRecordingNotAccessibleError(
  recording?: Recording,
  isAuthenticated?: boolean
): ExpectedError | undefined {
  const isAuthorized = !!(isTest() || recording);

  if (isAuthorized) {
    return undefined;
  }

  if (isAuthenticated) {
    trackEvent("error.unauthorized_viewer");
    return {
      message: "Sorry, you don't have permission!",
      content: "Maybe you haven't been invited to this replay yet?",
      action: "request-access",
    };
  }

  trackEvent("error.unauthenticated_viewer");
  return {
    message: "Almost there!",
    content: "This is a private replay. Please sign in.",
    action: "sign-in",
  };
}

function getDeletedRecordingError(): ExpectedError {
  return {
    message: "Recording Deleted",
    content: "This recording has been deleted.",
    action: "library",
  };
}

interface SourceContentsCommandRespone {
  id: number;
  result: {
    contentType: string;
    contents: string;
  };
  error?: undefined;
}

function isSourceContentsCommandResponse(
  response: CommandResponse
): response is SourceContentsCommandRespone {
  // @ts-expect-error
  return response.result && "contentType" in response.result && "contents" in response.result;
}

// Create a session to use while debugging.
// NOTE: This thunk is dispatched _before_ the rest of the devtools logic
// is initialized
export function createSocket(recordingId: string): UIThunkAction {
  return async (dispatch, getState, { protocolClient, replayClient }) => {
    try {
      assert(recordingId, "no recordingId");
      dispatch(actions.setRecordingId(recordingId));
      const [userInfo, recording] = await Promise.all([getUserInfo(), getRecording(recordingId)]);
      assert(recording, "failed to load recording");

      if (recording.workspace) {
        dispatch(actions.setRecordingWorkspace(recording.workspace));
      }

      registerRecording({ recording });

      if (
        recording.workspace &&
        subscriptionExpired(recording.workspace, new Date(recording.date))
      ) {
        dispatch(
          setExpectedError({
            message: "Free Trial Expired",
            content:
              "This replay is unavailable because it was recorded after your team's free trial expired.",
            action: recording.userRole !== "team-admin" ? "library" : "team-billing",
          })
        );
        return;
      }

      const experimentalSettings: ExperimentalSettings = {
        disableCache: userData.get("backend_disableCache"),
        listenForMetrics: userData.get("backend_listenForMetrics"),
        profileWorkerThreads: userData.get("backend_profileWorkerThreads"),
        enableRoutines: userData.get("backend_enableRoutines"),
        rerunRoutines: userData.get("backend_rerunRoutines"),
        sampleAllTraces: userData.get("backend_sampleAllTraces"),
      };

      const restartParam = new URL(window.location.href).searchParams.get("restart") || undefined;
      if (restartParam) {
        const url = new URL(window.location.href);
        url.searchParams.delete("restart");
        window.history.replaceState({}, "", url.toString());
      }

      if (restartParam || userData.get("backend_newControllerOnRefresh")) {
        experimentalSettings.controllerKey = String(Date.now());
      }

      if (!recording.isProcessed) {
        dispatch(actions.setProcessing(true));

        function onProcessingProgress(progress: processRecordingProgress) {
          dispatch(actions.setProcessingProgress(progress.progressPercent));
        }

        protocolClient.Recording.addProcessRecordingProgressListener(onProcessingProgress);
        await protocolClient.Recording.processRecording({ recordingId, experimentalSettings });
        protocolClient.Recording.removeProcessRecordingProgressListener(onProcessingProgress);
      }

      dispatch(actions.setProcessing(false));

      const queuedProtocolMessages: ReceivedProtocolMessage[] = [];
      let flushTimeoutId: NodeJS.Timeout | null = null;

      function flushQueuedProtocolMessages() {
        flushTimeoutId = null;

        const messages = queuedProtocolMessages.splice(0);
        dispatch(protocolMessagesReceived(messages));
      }

      // WebSocket messages may be sent by a component that Suspends during render.
      // Dispatching these Redux actions after a tick avoids potentially scheduling a React update while another component is rendering.
      function queueProtocolMessage(message: ReceivedProtocolMessage) {
        queuedProtocolMessages.push(message);

        if (flushTimeoutId === null) {
          flushTimeoutId = setTimeout(flushQueuedProtocolMessages, 250);
        }
      }

      let sessionMayDestroy = false;
      addEventListener("Session.mayDestroy", () => {
        sessionMayDestroy = true;
      });

      function setSessionDestroyedError(error: UnexpectedError) {
        endMixpanelSession("disconnected");
        if (sessionMayDestroy) {
          dispatch(
            setExpectedError({
              action: "refresh",
              content: "This replay timed out to reduce server load.",
              message: "Ready when you are!",
            })
          );
        } else {
          dispatch(setUnexpectedError(error));
        }
      }

      listenForSessionDestroyed(() =>
        setSessionDestroyedError({
          action: "refresh",
          content: "The session was destroyed unexpectedly. Please refresh the page.",
          message: "Unexpected end of session",
        })
      );

      const doCreateSession = (recordingId: string) => createSession(
        recordingId,
        experimentalSettings,
        focusWindowFromURL !== null ? focusWindowFromURL : undefined,
        {
          onEvent: (event: ProtocolEvent) => {
            // no-op but required, apparently
          },
          onRequest: (request: CommandRequest) => {
            if (userData.get("feature_protocolPanel")) {
              queueProtocolMessage({
                type: "request",
                // a couple fields will be filled in on the reducer side
                value: { ...request, recordedAt: window.performance.now() } as RequestSummary,
              });
            }
          },
          onResponse: (response: CommandResponse) => {
            if (userData.get("feature_protocolPanel")) {
              const clonedResponse = { ...response, recordedAt: window.performance.now() };

              if (isSourceContentsCommandResponse(clonedResponse)) {
                // Must be a source contents entry. Shrink the source text just to minimize store size.
                // It's rare that we would want to look at the source text in the Protocol Viewer,
                // and at most we might want to see if the initial lines match or something.
                clonedResponse.result = {
                  ...clonedResponse.result,
                  contents: clonedResponse.result.contents.slice(0, 1000),
                };
              }
              queueProtocolMessage({
                type: "response",
                value: clonedResponse,
              });
            }
          },
          onResponseError: (error: CommandResponse) => {
            if (userData.get("feature_protocolPanel")) {
              queueProtocolMessage({
                type: "error",
                value: { ...error, recordedAt: window.performance.now() },
              });
            }
          },
          onSocketError: (evt: Event, initial: boolean) => {
            console.error("Socket Error", evt);
            if (initial) {
              dispatch(
                setUnexpectedError({
                  action: "refresh",
                  content:
                    "A connection to our server could not be established. Please check your connection.",
                  message: "Unable to establish socket connection",
                  ...evt,
                })
              );
            } else {
              setSessionDestroyedError({
                action: "refresh",
                content:
                  "The connection to our server was closed due to an error. Please refresh the page.",
                message: "Unexpected socket error",
                ...evt,
              });
            }
          },
          onSocketClose: (willClose: boolean) => {
            if (!willClose) {
              setSessionDestroyedError({
                action: "refresh",
                content:
                  "The connection to our server was closed unexpectedly. Please refresh the page.",
                message: "Unexpected disconnect",
              });
            }
          },
        }
      );

      const sessionId = await doCreateSession(recordingId);
      console.log("MainSessionId", JSON.stringify({ recordingId, sessionId }));

      const supplementalRecordings = getSupplementalRecordings(recordingId);
      const supplemental = await Promise.all(supplementalRecordings.map(async supplemental => {
        const { serverRecordingId } = supplemental;
        const sessionId = await doCreateSession(serverRecordingId);
        console.log("SupplementalSessionId", JSON.stringify({ serverRecordingId, sessionId }));
        return { ...supplemental, sessionId };
      }));

      Sentry.configureScope(scope => {
        scope.setExtra("sessionId", sessionId);
      });

      window.sessionId = sessionId;
      await replayClient.configure(recordingId, sessionId, supplemental);
      const recordingTarget = await recordingTargetCache.readAsync(replayClient);
      dispatch(actions.setRecordingTarget(recordingTarget));

      // We don't want to show the non-dev version of the app for node replays.
      if (recordingTarget === "node") {
        dispatch(setViewMode("dev"));
      }

      // We don't want to show the wrong default layout for recordings that don't have graphics.
      const recordingCapabilities = await recordingCapabilitiesCache.readAsync(replayClient);
      if (!recordingCapabilities.supportsRepaintingGraphics) {
        const toolboxLayout = getToolboxLayout(getState());
        switch (toolboxLayout) {
          case "full":
          case "left":
            // The current layout is okay.
            break;
          default:
            dispatch(setToolboxLayout("left"));
            break;
        }
      }

      dispatch(actions.setUploading(null));
      dispatch(actions.setAwaitingSourcemaps(false));

      await dispatch(jumpToInitialPausePoint());

      dispatch(actions.setLoadingFinished(true));

      const focusWindow = replayClient.getCurrentFocusWindow();
      assert(focusWindow !== null); // replayClient.configure() sets this value
      if (
        !focusWindowFromURL ||
        focusWindowFromURL.begin.time !== focusWindow.begin.time ||
        focusWindowFromURL.end.time !== focusWindow.end.time
      ) {
        dispatch(setFocusWindow({ begin: focusWindow.begin.time, end: focusWindow.end.time }));
      }
    } catch (error: any) {
      if (isRecordingDeletedError(error)) {
        dispatch(setExpectedError(getDeletedRecordingError()));
        return;
      }

      const currentError = getUnexpectedError(getState());

      // Don't overwrite an existing error.
      if (!currentError) {
        dispatch(
          setUnexpectedError({
            message: "Unexpected session error",
            content: error.message || "The session has closed due to an error.",
            action: "library",
          })
        );
      }
    }
  };
}

export function onUploadedData({ uploaded, length }: uploadedData): UIThunkAction {
  return dispatch => {
    const uploadedMB = (uploaded / (1024 * 1024)).toFixed(2);
    const lengthMB = length ? (length / (1024 * 1024)).toFixed(2) : undefined;
    dispatch(actions.setUploading({ total: lengthMB, amount: uploadedMB }));
  };
}
