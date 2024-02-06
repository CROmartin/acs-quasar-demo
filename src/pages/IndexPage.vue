<template>
  <audio
    id="ringtone"
    src="./ringtone.mp3"
    type="audio/mp3"
    ref="ringtone"
  ></audio>

  <q-page
    class="flex flex-center login-page"
    v-if="userAccessToken === '' && userTeamsAccessToken === ''"
  >
    <div class="login-holder">
      <q-input
        filled
        v-model="name"
        label="Your name"
        style="margin-bottom: 1em; width: 500px"
        class="login-input"
        @keyup.enter="logIn"
      />
      <q-btn class="login" label="Login" @click="logIn" color="primary" />
    </div>
  </q-page>
  <q-page
    class="flex flex-center"
    v-if="userAccessToken !== '' || userTeamsAccessToken !== ''"
  >
    <div class="page">
      <h4>Welcome {{ name }}</h4>
      <!-- <div class="flex">
        <q-btn
          label="Initialize Call Agent"
          @click="initializeCallAgent"
          color="primary"
        />
      </div> -->
      <div>
        <!-- <q-input
          filled
          v-model="calleeAcsUserId"
          label="Enter callee's Azure Communication Services user identity in format: '8:acs:resourceId_userId'"
          style="margin-bottom: 1em; width: 500px"
        /> -->
      </div>
      <h6>Call users:</h6>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <template v-if="userAccessToken !== ''">
            <tr v-for="user in users" :key="user.identity">
              <td>{{ user.name }}</td>
              <td>
                <button class="call-button" @click="startCall(user.identity)">
                  Call
                </button>
              </td>
            </tr>
          </template>
        </tbody>
      </table>

      <div v-if="isCallConnected" style="color: #13bb13">
        Call is connected!
      </div>
      <!-- <div v-if="showRemoteVideos" style="width: 40%"> -->
      <div class="remoteVideo" ref="remoteVideosGallery">
        Remote participants' video streams:
      </div>
      <!-- <div v-if="showLocalVideo" style="width: 30%" ref="localVideoContainer"> -->
      <div class="localVideo" ref="localVideoContainer">
        Local video stream:
      </div>
      <div class="button-holders">
        <q-btn
          label="Hang up Call"
          @click="hangupCall"
          :disable="!canHangUpCall"
          color="negative"
        />
        <q-btn
          label="Accept Call"
          @click="acceptCall"
          :disable="!canAcceptCall"
          :class="{ shake: canAcceptCall }"
          color="positive"
        />

        <q-btn
          label="Start Video"
          @click="startVideo"
          :disable="!canStartVideo"
          color="info"
        />
        <q-btn
          label="Stop Video"
          @click="stopVideo"
          :disable="!canStopVideo"
          color="dark"
        />
      </div>
    </div>
  </q-page>
</template>

<script>
import { defineComponent, ref, onMounted, watch } from "vue";
import {
  CallClient,
  VideoStreamRenderer,
  LocalVideoStream,
} from "@azure/communication-calling";
import { AzureCommunicationTokenCredential } from "@azure/communication-common";
import { AzureLogger, setLogLevel } from "@azure/logger";

export default defineComponent({
  name: "IndexPage",
  setup() {
    // const userAccessToken = ref("");
    const calleeAcsUserId = ref("");
    const calleeTeamsUserId = ref("68818544-44cb-40e1-ba3a-d459a5cb4fc5");
    const calleeTeamsUserIdVelimir = ref(
      "595d5aea-3053-4795-bb86-8c1dc2a2042f"
    );

    const calleeTeamsUserIdPetar = ref("114d2cff-b994-4fd1-9a67-44027f3565d5");
    const calleeTeamsUserIdNino = ref("987badec-5a14-4c44-ae93-5ef1d76a959f");
    const calleeTeamsUserIdKarlo = ref("ed6b9f82-f2d6-4493-ab50-009a256f1030");

    const isCallConnected = ref(false);
    const showRemoteVideos = ref(false);
    const showLocalVideo = ref(false);
    const canStartCall = ref(false);
    const canHangUpCall = ref(false);
    const canAcceptCall = ref(false);
    const canStartVideo = ref(false);
    const canStopVideo = ref(false);
    const localVideoContainer = ref(null);
    const remoteVideosGallery = ref(null);
    const name = ref(null);
    const teamsLink = ref(null);

    // const userAccessToken = ref(
    //   "eyJhbGciOiJSUzI1NiIsImtpZCI6IjVFODQ4MjE0Qzc3MDczQUU1QzJCREU1Q0NENTQ0ODlEREYyQzRDODQiLCJ4NXQiOiJYb1NDRk1kd2M2NWNLOTVjelZSSW5kOHNUSVEiLCJ0eXAiOiJKV1QifQ.eyJza3lwZWlkIjoiYWNzOmQ2OWYyMzhhLTQwYTUtNGU4Ny1iYWZhLWZkMmY1ZGY1ODdmNF8wMDAwMDAxYy05YzZlLTc3N2MtOTE4ZS1hZjNhMGQwMGQyZjgiLCJzY3AiOjE3OTIsImNzaSI6IjE3MDA3NDkxNjkiLCJleHAiOjE3MDA4MzU1NjksInJnbiI6ImVtZWEiLCJhY3NTY29wZSI6ImNoYXQsdm9pcCIsInJlc291cmNlSWQiOiJkNjlmMjM4YS00MGE1LTRlODctYmFmYS1mZDJmNWRmNTg3ZjQiLCJyZXNvdXJjZUxvY2F0aW9uIjoiZXVyb3BlIiwiaWF0IjoxNzAwNzQ5MTY5fQ.ErqFNKVPOb9rw-KPULNyugnoNLVFSDrjOqREsI1TFFVzaKCXZUfQ9MUFS_eu8_eXEhPwhOFylemSK4seu54MY8WlAXcd6-i5tJmlTmTiCk0TzFMgmTfWccVzf6ueZGFjD8jJR11QNmUE4jz28zR6njTpFXGqe0EOG6zXD--w8g5LNM30iJke4wMliXiPZ_pzbZ--FJm0kyxY57pDtze7Qr75CGs-jtvaONSebzqqb49dB_8cWhMiTXefGwkVsdy6VwlIGsEO8-ja_l8rpiwKTPcBPaYdkcW0FPdHkg7gm3G9Wx7qypICSrGj7-xptBx8JqphKvuHOSj-AkyoEQU9yg"
    // );

    const userAccessToken = ref("");
    const userTeamsAccessToken = ref("");

    let callAgent;
    let deviceManager;
    let call;
    let incomingCall;
    let localVideoStream;
    let localVideoStreamRenderer;

    async function displayLocalVideoStream() {
      try {
        localVideoStreamRenderer = new VideoStreamRenderer(localVideoStream);
        const view = await localVideoStreamRenderer.createView();
        // localVideoContainer.value.hidden = false;
        localVideoContainer.value.appendChild(view.target);
      } catch (error) {
        console.error(error);
      }
    }

    async function subscribeToRemoteParticipant(remoteParticipant) {
      try {
        // Inspect the initial remoteParticipant.state value.
        console.log(`Remote participant state: ${remoteParticipant.state}`);
        // Subscribe to remoteParticipant's 'stateChanged' event for value changes.
        remoteParticipant.on("stateChanged", () => {
          console.log(
            `Remote participant state changed: ${remoteParticipant.state}`
          );
        });

        // Inspect the remoteParticipants's current videoStreams and subscribe to them.
        remoteParticipant.videoStreams.forEach((remoteVideoStream) => {
          subscribeToRemoteVideoStream(remoteVideoStream);
        });
        // Subscribe to the remoteParticipant's 'videoStreamsUpdated' event to be
        // notified when the remoteParticiapant adds new videoStreams and removes video streams.
        remoteParticipant.on("videoStreamsUpdated", (e) => {
          // Subscribe to new remote participant's video streams that were added.
          e.added.forEach((remoteVideoStream) => {
            subscribeToRemoteVideoStream(remoteVideoStream);
          });
          // Unsubscribe from remote participant's video streams that were removed.
          e.removed.forEach((remoteVideoStream) => {
            console.log("Remote participant video stream was removed.");
          });
        });
      } catch (error) {
        console.error(error);
      }
    }

    async function subscribeToRemoteVideoStream(remoteVideoStream) {
      let renderer = new VideoStreamRenderer(remoteVideoStream);
      let view;
      let remoteVideoContainer = document.createElement("div");
      remoteVideoContainer.className = "remote-video-container";

      let loadingSpinner = document.createElement("div");
      loadingSpinner.className = "loading-spinner";
      remoteVideoStream.on("isReceivingChanged", () => {
        try {
          if (remoteVideoStream.isAvailable) {
            const isReceiving = remoteVideoStream.isReceiving;
            const isLoadingSpinnerActive =
              remoteVideoContainer.contains(loadingSpinner);
            if (!isReceiving && !isLoadingSpinnerActive) {
              remoteVideoContainer.appendChild(loadingSpinner);
            } else if (isReceiving && isLoadingSpinnerActive) {
              remoteVideoContainer.removeChild(loadingSpinner);
            }
          }
        } catch (e) {
          console.error(e);
        }
      });

      const createView = async () => {
        // Create a renderer view for the remote video stream.
        view = await renderer.createView();
        // Attach the renderer view to the UI.
        remoteVideoContainer.appendChild(view.target);
        remoteVideosGallery.value.appendChild(remoteVideoContainer);
      };

      // Remote participant has switched video on/off
      remoteVideoStream.on("isAvailableChanged", async () => {
        try {
          if (remoteVideoStream.isAvailable) {
            await createView();
          } else {
            view.dispose();
            remoteVideosGallery.value.removeChild(remoteVideoContainer);
          }
        } catch (e) {
          console.error(e);
        }
      });

      // Remote participant has video on initially.
      if (remoteVideoStream.isAvailable) {
        try {
          await createView();
        } catch (e) {
          console.error(e);
        }
      }
    }

    async function initializeCallAgent() {
      try {
        const callClient = new CallClient();
        const tokenCredential = new AzureCommunicationTokenCredential(
          userAccessToken.value.trim()
        );

        callAgent = await callClient.createCallAgent(tokenCredential, {
          displayName: name.value,
        });

        deviceManager = await callClient.getDeviceManager();
        await deviceManager.askDevicePermission({ video: true });
        await deviceManager.askDevicePermission({ audio: true });

        callAgent.on("incomingCall", async (args) => {
          try {
            incomingCall = args.incomingCall;
            canAcceptCall.value = true;
            canStartCall.value = false;
          } catch (error) {
            console.error(error);
          }
        });

        canStartCall.value = true;
      } catch (error) {
        console.error(error);
      }
    }

    async function initializeTeamsCallAgent() {
      try {
        const callClient = new CallClient();

        const tokenCredential = new AzureCommunicationTokenCredential(
          userTeamsAccessToken.value.trim()
        );

        callAgent = await callClient.createTeamsCallAgent(tokenCredential);
        console.log("Call Agent: ", callAgent);

        deviceManager = await callClient.getDeviceManager();
        await deviceManager.askDevicePermission({ video: true });
        await deviceManager.askDevicePermission({ audio: true });

        callAgent.on("incomingCall", async (args) => {
          try {
            incomingCall = args.incomingCall;
            canAcceptCall.value = true;
            canStartCall.value = false;
          } catch (error) {
            console.error(error);
          }
        });

        canStartCall.value = true;
      } catch (error) {
        console.error(error);
      }
    }

    const createLocalVideoStream = async () => {
      const cameras = await deviceManager.getCameras();
      if (cameras.length > 0) {
        const camera = cameras[0];
        return new LocalVideoStream(camera);
      } else {
        console.error(`No camera device found on the system`);
      }
    };

    const subscribeToCall = (callInstance) => {
      console.log(`subscribe Call Id: ${callInstance.id}`);

      try {
        console.log(`Call Id: ${callInstance.id}`);
        callInstance.on("idChanged", () => {
          console.log(`Call Id changed: ${callInstance.id}`);
        });

        console.log(`Call state: ${callInstance.state}`);
        callInstance.on("stateChanged", async () => {
          console.log(`Call state changed: ${callInstance.state}`);

          if (callInstance.state === "Connected") {
            canAcceptCall.value = false;

            isCallConnected.value = true;
            canStartCall.value = false;
            canHangUpCall.value = true;
            canStartVideo.value = true;
            canStopVideo.value = true;
          } else if (callInstance.state === "Disconnected") {
            canAcceptCall.value = false;

            isCallConnected.value = false;
            canStartCall.value = true;
            canHangUpCall.value = false;
            canStartVideo.value = false;
            canStopVideo.value = false;
            callEndReason.value = callInstance.callEndReason;
            console.log(
              `Call ended, call end reason={code=${callInstance.callEndReason.code}, subCode=${callInstance.callEndReason.subCode}}`
            );
          }
        });

        callInstance.on("isLocalVideoStartedChanged", () => {
          console.log(
            `isLocalVideoStarted changed: ${callInstance.isLocalVideoStarted}`
          );
        });

        callInstance.localVideoStreams.forEach(async (lvs) => {
          localVideoStream = lvs;
          await displayLocalVideoStream();
        });

        callInstance.on("localVideoStreamsUpdated", (e) => {
          e.added.forEach(async (lvs) => {
            localVideoStream = lvs;
            await displayLocalVideoStream();
          });
          e.removed.forEach((lvs) => {
            // Define and call removeLocalVideoStream method
          });
        });

        // Handle remote participants
        callInstance.remoteParticipants.forEach((remoteParticipant) => {
          // remoteParticipants.value.push(remoteParticipant);
          subscribeToRemoteParticipant(remoteParticipant);
        });

        callInstance.on("remoteParticipantsUpdated", (e) => {
          e.added.forEach((remoteParticipant) => {
            // remoteParticipants.value.push(remoteParticipant);
            subscribeToRemoteParticipant(remoteParticipant);
          });
          e.removed.forEach((remoteParticipant) => {
            console.log("Remote participant removed from the call.");
            // Update remoteParticipants array accordingly
          });
        });
      } catch (error) {
        console.error(error);
      }
    };

    async function startCall(calleeAcsUserId) {
      try {
        const localVideoStream = await createLocalVideoStream();
        const videoOptions = localVideoStream
          ? { localVideoStreams: [localVideoStream] }
          : undefined;
        call = callAgent.startCall(
          [{ communicationUserId: calleeAcsUserId.trim() }],
          { videoOptions }
        );

        // Subscribe to the call's properties and events.
        console.log(`Call Id: ${call.id}`);
        subscribeToCall(call);
      } catch (error) {
        console.error(error);
      }
    }

    async function hangupCall() {
      await call.hangUp();
    }

    async function acceptCall() {
      try {
        const localVideoStream = await createLocalVideoStream();
        const videoOptions = localVideoStream
          ? { localVideoStreams: [localVideoStream] }
          : undefined;
        call = await incomingCall.accept({ videoOptions });

        // Subscribe to the call's properties and events.
        subscribeToCall(call);
      } catch (error) {
        console.error(error);
      }
    }

    const startVideo = async () => {
      try {
        const stream = await createLocalVideoStream();
        if (stream && call) {
          await call.startVideo(stream);
          localVideoStream = stream;
        }
      } catch (error) {
        console.error(error);
      }
    };

    const stopVideo = async () => {
      try {
        if (localVideoStream && call) {
          await call.stopVideo(localVideoStream);
        }
      } catch (error) {
        console.error(error);
      }
    };
    // Other methods like hangupCall, acceptCall, etc.

    const logIn = async () => {
      try {
        await fetchUsers();
        const response = await fetch(
          "https://d2kcfez0p9qsv1.cloudfront.net/generate-token",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ name: name.value }),
          }
        );

        if (!response.ok) {
          throw new Error("Network response was not ok");
        }

        const data = await response.json();
        console.log("userAccessToken: ", data.token);
        userAccessToken.value = data.token; // Save the token
        console.log("User access token: ", userAccessToken.value);
        initializeCallAgent();
      } catch (error) {
        console.error("Error during login:", error);
      }
    };

    const logInTeams = async () => {
      try {
        await fetchUsers();
        const response = await fetch(
          "https://d2kcfez0p9qsv1.cloudfront.net/teams-token",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Network response was not ok");
        }

        const data = await response.json();
        console.log("teamsUserAccessToken: ", data.token);
        userTeamsAccessToken.value = data.token; // Save the token
        console.log("Teams User access token: ", userTeamsAccessToken.value);
        initializeTeamsCallAgent();
      } catch (error) {
        console.error("Error during login:", error);
      }
    };

    const users = ref([]);

    const fetchUsers = async () => {
      const nameToFilterOut = name.value; // Replace with the actual name you want to filter out

      try {
        const response = await fetch(
          "https://d2kcfez0p9qsv1.cloudfront.net/all-users"
        );
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }

        let res = await response.json();
        res = res.users;
        let filteredUsers = res.filter((user) => user.name !== nameToFilterOut);
        console.log("Filtered users: ", filteredUsers);
        users.value = filteredUsers;
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    onMounted(() => {
      const intervalId = setInterval(fetchUsers, 3000); // Fetch every 5000 milliseconds (5 seconds)
      return () => clearInterval(intervalId);
    });

    const ringtone = ref(null);

    watch(canAcceptCall, (newValue) => {
      if (newValue) {
        ringtone.value.play();
      } else {
        ringtone.value.pause();
        ringtone.value.currentTime = 0; // Reset playback to start
      }
    });
    return {
      ringtone,
      userAccessToken,
      userTeamsAccessToken,
      calleeTeamsUserIdPetar,
      calleeTeamsUserIdVelimir,
      calleeTeamsUserIdNino,
      calleeTeamsUserIdKarlo,
      calleeAcsUserId,
      isCallConnected,
      showRemoteVideos,
      showLocalVideo,
      canStartCall,
      canHangUpCall,
      canAcceptCall,
      canStartVideo,
      canStopVideo,
      initializeCallAgent,
      initializeTeamsCallAgent,
      startCall,
      hangupCall,
      acceptCall,
      startVideo,
      stopVideo,
      localVideoContainer,
      remoteVideosGallery,
      name,
      logIn,
      logInTeams,
      users,
      teamsLink,
      calleeTeamsUserId,
      // Other methods
    };
  },
});
</script>

<style>
.remoteVideo {
  width: 40%;
}
.localVideo {
  width: 40%;
}
.login-holder {
  display: flex;
  width: 100%;

  justify-content: center;
}
.login-holder .q-field {
  width: 90%;
}
.login-page {
  padding: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
}
.button-holders {
  display: flex;
  gap: 16px;
  margin-top: 1em;
  margin-bottom: 1em;
}

@keyframes rotating-shake {
  0%,
  100% {
    transform: rotate(0);
  }
  25% {
    transform: rotate(-5deg);
  }
  50% {
    transform: rotate(5deg);
  }
  75% {
    transform: rotate(-5deg);
  }
}

.shake {
  animation: rotating-shake 0.5s ease-in-out infinite;
}

.login {
  height: 54px !important;
}
.login-input {
  margin: 0 !important;
}
/* Add your CSS styles here */

table {
  width: 100%;
  max-width: 90%;

  border-collapse: collapse;
  text-align: left;
  margin-bottom: 24px;
}

th,
td {
  padding: 8px 15px;
  border-bottom: 1px solid #ddd;
}

th {
  background-color: #f4f4f4;
  color: #333;
}

tr:hover {
  background-color: #f0f0f0;
}

.call-button {
  background-color: #4caf50;
  color: white;
  border: none;
  padding: 5px 10px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  margin: 4px 2px;
  cursor: pointer;
  border-radius: 4px;
}

.call-button:hover {
  background-color: #45a049;
}

.page {
  min-width: 420px;
  width: 90%;
  padding: 32px;
  max-width: 880px;
}

@media (max-width: 420px) {
  .page {
    min-width: 100%;
    padding: 16px;
    width: 80%;
  }

  .remoteVideo {
    width: 100%;
  }
  .localVideo {
    width: 100%;
  }
}

h6 {
  margin: 1rem 0;
}
</style>
