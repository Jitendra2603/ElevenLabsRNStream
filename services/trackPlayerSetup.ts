import TrackPlayer, { Capability, RepeatMode, AppKilledPlaybackBehavior } from 'react-native-track-player';

let isSetupDone = false;

export async function setupTrackPlayer(): Promise<boolean> {
  if (isSetupDone) return true;

  try {
    await TrackPlayer.setupPlayer({
      android: {
        appKilledPlaybackBehaviour: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
      },
    });

    await TrackPlayer.updateOptions({
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.Stop,
        Capability.SeekTo,
      ],
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.Stop,
      ],
      progressUpdateEventInterval: 1,
    });

    isSetupDone = true;
    return true;
  } catch (error) {
    console.error('Failed to setup TrackPlayer:', error);
    return false;
  }
} 