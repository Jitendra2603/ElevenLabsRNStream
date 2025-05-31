import TrackPlayer, { Event } from 'react-native-track-player';

const trackPlayerService = async () => {
  TrackPlayer.addEventListener(Event.PlaybackTrackChanged, async (event) => {
    console.log('Track changed:', event);
  });

  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async (event) => {
    console.log('Queue ended:', event);
  });

  TrackPlayer.addEventListener(Event.PlaybackError, async (error) => {
    console.error('Playback error:', error);
  });

  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    TrackPlayer.stop();
  });
};

export default trackPlayerService; 